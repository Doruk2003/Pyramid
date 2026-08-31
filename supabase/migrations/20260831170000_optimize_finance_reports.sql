-- Migration: Optimize Finance Reports (Balances & Statements)
-- Date: 2026-08-31

-- Indexes to optimize foreign key queries
CREATE INDEX IF NOT EXISTS idx_invoices_account ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);

-- 1) Account Balances View
CREATE OR REPLACE VIEW account_balances WITH (security_invoker = true) AS
WITH invoice_totals AS (
    SELECT
        account_id,
        COALESCE(SUM(
            CASE 
                WHEN invoice_type IN ('sale', 'return_purchase') THEN total * COALESCE(exchange_rate, 1)
                ELSE 0
            END
        ), 0) AS invoice_debit,
        COALESCE(SUM(
            CASE 
                WHEN invoice_type IN ('purchase', 'return_sale') THEN total * COALESCE(exchange_rate, 1)
                ELSE 0
            END
        ), 0) AS invoice_credit
    FROM invoices
    WHERE status NOT IN ('draft', 'cancelled')
      AND deleted_at IS NULL
    GROUP BY account_id
),
payment_totals AS (
    SELECT
        account_id,
        COALESCE(SUM(
            CASE 
                WHEN payment_type IN ('payment', 'debit_note') THEN amount
                ELSE 0
            END
        ), 0) AS payment_debit,
        COALESCE(SUM(
            CASE 
                WHEN payment_type IN ('collection', 'credit_note') THEN amount
                ELSE 0
            END
        ), 0) AS payment_credit
    FROM payments
    WHERE status = 'completed'
    GROUP BY account_id
)
SELECT
    a.id,
    a.company_id,
    a.code,
    a.name,
    a.account_type,
    a.phone,
    a.authorized_person,
    COALESCE(it.invoice_debit, 0) + COALESCE(pt.payment_debit, 0) AS debit,
    COALESCE(it.invoice_credit, 0) + COALESCE(pt.payment_credit, 0) AS credit,
    (COALESCE(it.invoice_debit, 0) + COALESCE(pt.payment_debit, 0)) - (COALESCE(it.invoice_credit, 0) + COALESCE(pt.payment_credit, 0)) AS raw_balance
FROM accounts a
LEFT JOIN invoice_totals it ON it.account_id = a.id
LEFT JOIN payment_totals pt ON pt.account_id = a.id
WHERE a.is_active = true
  AND a.deleted_at IS NULL;

-- 2) Account Statement RPC
CREATE OR REPLACE FUNCTION get_account_statement(
    p_account_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
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
                    WHEN invoice_type IN ('sale', 'return_purchase') THEN total * COALESCE(exchange_rate, 1)
                    ELSE 0
                END AS debit,
                CASE 
                    WHEN invoice_type IN ('purchase', 'return_sale') THEN total * COALESCE(exchange_rate, 1)
                    ELSE 0
                END AS credit
            FROM invoices
            WHERE account_id = p_account_id
              AND status NOT IN ('draft', 'cancelled')
              AND deleted_at IS NULL
              AND issue_date < p_start_date
            
            UNION ALL
            
            SELECT
                CASE 
                    WHEN payment_type IN ('payment', 'debit_note') THEN amount
                    ELSE 0
                END AS debit,
                CASE 
                    WHEN payment_type IN ('collection', 'credit_note') THEN amount
                    ELSE 0
                END AS credit
            FROM payments
            WHERE account_id = p_account_id
              AND status = 'completed'
              AND payment_date < p_start_date
        ) prev;
    END IF;

    -- 2) Query period rows and compute cumulative balance
    WITH all_tx AS (
        SELECT
            id,
            issue_date AS tx_date,
            invoice_number AS document_number,
            invoice_type AS tx_type,
            notes,
            CASE 
                WHEN invoice_type IN ('sale', 'return_purchase') THEN total * COALESCE(exchange_rate, 1)
                ELSE 0
            END AS debit,
            CASE 
                WHEN invoice_type IN ('purchase', 'return_sale') THEN total * COALESCE(exchange_rate, 1)
                ELSE 0
            END AS credit,
            created_at
        FROM invoices
        WHERE account_id = p_account_id
          AND status NOT IN ('draft', 'cancelled')
          AND deleted_at IS NULL
        
        UNION ALL
        
        SELECT
            id,
            payment_date AS tx_date,
            COALESCE(document_number, 'KASA-FİŞİ') AS document_number,
            payment_type AS tx_type,
            description AS notes,
            CASE 
                WHEN payment_type IN ('payment', 'debit_note') THEN amount
                ELSE 0
            END AS debit,
            CASE 
                WHEN payment_type IN ('collection', 'credit_note') THEN amount
                ELSE 0
            END AS credit,
            created_at
        FROM payments
        WHERE account_id = p_account_id
          AND status = 'completed'
    ),
    tx_cumulative AS (
        SELECT
            id,
            tx_date,
            document_number,
            tx_type,
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
