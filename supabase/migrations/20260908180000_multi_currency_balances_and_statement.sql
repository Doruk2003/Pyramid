-- Migration: Multi-Currency Account Balances & Statement RPC
-- Date: 2026-09-08

-- 1) Para Birimi Kırılımlı Cari Bakiye View'ı (account_currency_balances)
CREATE OR REPLACE VIEW account_currency_balances WITH (security_invoker = true) AS
WITH invoice_totals AS (
    SELECT
        account_id,
        COALESCE(currency, 'TRY') AS currency,
        COALESCE(SUM(
            CASE 
                WHEN invoice_type IN ('sale', 'return_purchase') THEN total
                ELSE 0
            END
        ), 0) AS invoice_debit,
        COALESCE(SUM(
            CASE 
                WHEN invoice_type IN ('purchase', 'return_sale') THEN total
                ELSE 0
            END
        ), 0) AS invoice_credit
    FROM invoices
    WHERE status NOT IN ('draft', 'cancelled')
      AND deleted_at IS NULL
    GROUP BY account_id, COALESCE(currency, 'TRY')
),
payment_totals AS (
    SELECT
        p.account_id,
        COALESCE(cr.currency, 'TRY') AS currency,
        COALESCE(SUM(
            CASE 
                WHEN p.payment_type IN ('payment', 'debit_note') THEN p.amount
                ELSE 0
            END
        ), 0) AS payment_debit,
        COALESCE(SUM(
            CASE 
                WHEN p.payment_type IN ('collection', 'credit_note') THEN p.amount
                ELSE 0
            END
        ), 0) AS payment_credit
    FROM payments p
    LEFT JOIN cash_registers cr ON cr.id = p.cash_register_id
    WHERE p.status = 'completed'
    GROUP BY p.account_id, COALESCE(cr.currency, 'TRY')
),
all_currencies AS (
    SELECT account_id, currency FROM invoice_totals
    UNION
    SELECT account_id, currency FROM payment_totals
)
SELECT
    a.id,
    a.company_id,
    a.code,
    a.name,
    a.account_type,
    a.phone,
    a.authorized_person,
    c.currency,
    COALESCE(it.invoice_debit, 0) + COALESCE(pt.payment_debit, 0) AS debit,
    COALESCE(it.invoice_credit, 0) + COALESCE(pt.payment_credit, 0) AS credit,
    (COALESCE(it.invoice_debit, 0) + COALESCE(pt.payment_debit, 0)) - (COALESCE(it.invoice_credit, 0) + COALESCE(pt.payment_credit, 0)) AS raw_balance
FROM all_currencies c
JOIN accounts a ON a.id = c.account_id
LEFT JOIN invoice_totals it ON it.account_id = c.account_id AND it.currency = c.currency
LEFT JOIN payment_totals pt ON pt.account_id = c.account_id AND pt.currency = c.currency
WHERE a.is_active = true
  AND a.deleted_at IS NULL;

-- 2) Çoklu Döviz Destekli Cari Ekstre RPC (get_account_statement)
CREATE OR REPLACE FUNCTION get_account_statement(
    p_account_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_currency TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_initial_balance NUMERIC := 0;
    v_rows JSON;
BEGIN
    -- 1) Calculate initial balance (before start date)
    IF p_start_date IS NOT NULL THEN
        SELECT COALESCE(SUM(debit - credit), 0)
        INTO v_initial_balance
        FROM (
            SELECT
                CASE 
                    WHEN p_currency IS NOT NULL THEN
                        CASE WHEN invoice_type IN ('sale', 'return_purchase') THEN total ELSE 0 END
                    ELSE
                        CASE WHEN invoice_type IN ('sale', 'return_purchase') THEN total * COALESCE(exchange_rate, 1) ELSE 0 END
                END AS debit,
                CASE 
                    WHEN p_currency IS NOT NULL THEN
                        CASE WHEN invoice_type IN ('purchase', 'return_sale') THEN total ELSE 0 END
                    ELSE
                        CASE WHEN invoice_type IN ('purchase', 'return_sale') THEN total * COALESCE(exchange_rate, 1) ELSE 0 END
                END AS credit
            FROM invoices
            WHERE account_id = p_account_id
              AND status NOT IN ('draft', 'cancelled')
              AND deleted_at IS NULL
              AND issue_date < p_start_date
              AND (p_currency IS NULL OR COALESCE(currency, 'TRY') = p_currency)
            
            UNION ALL
            
            SELECT
                CASE 
                    WHEN p_payment_type IN ('payment', 'debit_note') THEN amount ELSE 0
                END AS debit,
                CASE 
                    WHEN p_payment_type IN ('collection', 'credit_note') THEN amount ELSE 0
                END AS credit
            FROM (
                SELECT p.payment_type AS p_payment_type, p.amount, COALESCE(cr.currency, 'TRY') AS p_curr
                FROM payments p
                LEFT JOIN cash_registers cr ON cr.id = p.cash_register_id
                WHERE p.account_id = p_account_id
                  AND p.status = 'completed'
                  AND p.payment_date < p_start_date
            ) pay
            WHERE (p_currency IS NULL OR pay.p_curr = p_currency)
        ) prev;
    END IF;

    -- 2) Query period rows and compute cumulative balance
    WITH all_tx AS (
        SELECT
            id,
            issue_date AS tx_date,
            invoice_number AS document_number,
            invoice_type AS tx_type,
            COALESCE(currency, 'TRY') AS tx_currency,
            COALESCE(exchange_rate, 1) AS tx_exchange_rate,
            notes,
            CASE 
                WHEN p_currency IS NOT NULL THEN
                    CASE WHEN invoice_type IN ('sale', 'return_purchase') THEN total ELSE 0 END
                ELSE
                    CASE WHEN invoice_type IN ('sale', 'return_purchase') THEN total * COALESCE(exchange_rate, 1) ELSE 0 END
            END AS debit,
            CASE 
                WHEN p_currency IS NOT NULL THEN
                    CASE WHEN invoice_type IN ('purchase', 'return_sale') THEN total ELSE 0 END
                ELSE
                    CASE WHEN invoice_type IN ('purchase', 'return_sale') THEN total * COALESCE(exchange_rate, 1) ELSE 0 END
            END AS credit,
            created_at
        FROM invoices
        WHERE account_id = p_account_id
          AND status NOT IN ('draft', 'cancelled')
          AND deleted_at IS NULL
          AND (p_currency IS NULL OR COALESCE(currency, 'TRY') = p_currency)
        
        UNION ALL
        
        SELECT
            p.id,
            p.payment_date AS tx_date,
            COALESCE(p.document_number, 'KASA-FİŞİ') AS document_number,
            p.payment_type AS tx_type,
            COALESCE(cr.currency, 'TRY') AS tx_currency,
            1::NUMERIC AS tx_exchange_rate,
            p.description AS notes,
            CASE 
                WHEN p.payment_type IN ('payment', 'debit_note') THEN p.amount ELSE 0
            END AS debit,
            CASE 
                WHEN p.payment_type IN ('collection', 'credit_note') THEN p.amount ELSE 0
            END AS credit,
            p.created_at
        FROM payments p
        LEFT JOIN cash_registers cr ON cr.id = p.cash_register_id
        WHERE p.account_id = p_account_id
          AND p.status = 'completed'
          AND (p_currency IS NULL OR COALESCE(cr.currency, 'TRY') = p_currency)
    ),
    tx_cumulative AS (
        SELECT
            id,
            tx_date,
            document_number,
            tx_type,
            tx_currency,
            tx_exchange_rate,
            notes,
            debit,
            credit,
            v_initial_balance + SUM(debit - credit) OVER (ORDER BY tx_date ASC, id ASC) AS cumulative_balance
        FROM all_tx
    )
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'id', id,
                'date', tx_date,
                'invoiceNumber', document_number,
                'invoiceType', tx_type,
                'currency', tx_currency,
                'exchangeRate', tx_exchange_rate,
                'notes', notes,
                'debit', debit,
                'credit', credit,
                'cumulativeBalance', ABS(cumulative_balance),
                'cumulativeBalanceType', CASE WHEN cumulative_balance >= 0 THEN 'Borç' ELSE 'Alacak' END
            ) ORDER BY tx_date ASC, id ASC
        ),
        '[]'::json
    ) INTO v_rows
    FROM tx_cumulative
    WHERE (p_start_date IS NULL OR tx_date >= p_start_date)
      AND (p_end_date IS NULL OR tx_date <= p_end_date);

    -- 3) Return result object
    RETURN json_build_object(
        'initialBalance', ABS(v_initial_balance),
        'initialBalanceType', CASE WHEN v_initial_balance >= 0 THEN 'Borç' ELSE 'Alacak' END,
        'rawInitialBalance', v_initial_balance,
        'rows', v_rows
    );
END;
$$;
