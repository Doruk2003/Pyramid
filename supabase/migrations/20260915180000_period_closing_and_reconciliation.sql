-- Migration: 20260915180000_period_closing_and_reconciliation.sql
-- Description: Fiscal years, period closing & opening balances transfer, and account reconciliation data RPC

-- 1. Create fiscal_years table
CREATE TABLE IF NOT EXISTS public.fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fiscal_years_company_year_key UNIQUE (company_id, year)
);

-- Enable RLS
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;

-- Policies for fiscal_years using get_auth_user_company_id()
DROP POLICY IF EXISTS "company_isolation_fiscal_years" ON public.fiscal_years;

CREATE POLICY "company_isolation_fiscal_years" ON public.fiscal_years
    FOR ALL TO authenticated
    USING (company_id = get_auth_user_company_id())
    WITH CHECK (company_id = get_auth_user_company_id());

-- 2. Function to close fiscal year and transfer opening balances to new year
CREATE OR REPLACE FUNCTION public.close_fiscal_year(
    p_company_id UUID,
    p_year INTEGER,
    p_closed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE := (p_year || '-01-01')::DATE;
    v_end_date DATE := (p_year || '-12-31')::DATE;
    v_next_year_start DATE := ((p_year + 1) || '-01-01')::DATE;
    v_rec RECORD;
    v_opening_doc_no TEXT := 'DEVIR-' || p_year || '-001';
    v_trans_count INT := 0;
BEGIN
    -- Upsert fiscal_year record to closed
    INSERT INTO public.fiscal_years (company_id, year, start_date, end_date, status, closed_at, closed_by)
    VALUES (p_company_id, p_year, v_start_date, v_end_date, 'closed', now(), p_closed_by)
    ON CONFLICT (company_id, year)
    DO UPDATE SET
        status = 'closed',
        closed_at = now(),
        closed_by = p_closed_by,
        updated_at = now();

    -- Remove any old devir payments created for next year from a previous close attempt
    DELETE FROM public.payments
    WHERE company_id = p_company_id
      AND document_number = v_opening_doc_no;

    -- Calculate ending balances as of end_date for each account and create Opening Payment records for p_year + 1
    FOR v_rec IN
        SELECT 
            ab.id AS account_id,
            ab.raw_balance,
            ab.currency
        FROM public.account_balances ab
        WHERE ab.company_id = p_company_id
          AND ab.raw_balance <> 0
    LOOP
        IF v_rec.raw_balance > 0 THEN
            -- Account owes us money (Debitor) -> Opening collection note / debit entry
            INSERT INTO public.payments (
                company_id,
                account_id,
                payment_date,
                amount,
                payment_method,
                payment_type,
                document_number,
                description,
                status
            ) VALUES (
                p_company_id,
                v_rec.account_id,
                v_next_year_start,
                v_rec.raw_balance,
                'bank',
                'debit_note',
                v_opening_doc_no,
                p_year || ' Yılı Devir Açılış Bakiyesi',
                'completed'
            );
            v_trans_count := v_trans_count + 1;
        ELSIF v_rec.raw_balance < 0 THEN
            -- We owe account money (Creditor) -> Opening credit note / payment entry
            INSERT INTO public.payments (
                company_id,
                account_id,
                payment_date,
                amount,
                payment_method,
                payment_type,
                document_number,
                description,
                status
            ) VALUES (
                p_company_id,
                v_rec.account_id,
                v_next_year_start,
                ABS(v_rec.raw_balance),
                'bank',
                'credit_note',
                v_opening_doc_no,
                p_year || ' Yılı Devir Açılış Bakiyesi',
                'completed'
            );
            v_trans_count := v_trans_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'year', p_year,
        'transferredAccountsCount', v_trans_count,
        'message', p_year || ' yılı kapanışı tamamlandı ve ' || v_trans_count || ' cari hesabın devir açılış kaydı ' || (p_year + 1) || ' yılına aktarıldı.'
    );
END;
$$;

-- 3. Function to reopen fiscal year
CREATE OR REPLACE FUNCTION public.reopen_fiscal_year(
    p_company_id UUID,
    p_year INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_opening_doc_no TEXT := 'DEVIR-' || p_year || '-001';
BEGIN
    UPDATE public.fiscal_years
    SET status = 'open',
        closed_at = NULL,
        closed_by = NULL,
        updated_at = now()
    WHERE company_id = p_company_id AND year = p_year;

    -- Cancel / Remove auto-generated devir payments for next year
    DELETE FROM public.payments
    WHERE company_id = p_company_id
      AND document_number = v_opening_doc_no;

    RETURN jsonb_build_object(
        'success', true,
        'year', p_year,
        'message', p_year || ' yılı kapanışı iptal edildi ve yeniden açıldı.'
    );
END;
$$;

-- 4. Function to get account reconciliation data (Bakiye & BA/BS Mutabakatı)
CREATE OR REPLACE FUNCTION public.get_account_reconciliation_data(
    p_account_id UUID,
    p_as_of_date DATE,
    p_currency TEXT DEFAULT 'TRY'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_acc RECORD;
    v_comp RECORD;
    v_statement JSONB;
    v_debit NUMERIC := 0;
    v_credit NUMERIC := 0;
    v_balance NUMERIC := 0;
    v_balance_type TEXT := 'Bakiye Yok';
    
    -- BA/BS stats
    v_ba_count INT := 0;
    v_ba_total NUMERIC := 0;
    v_bs_count INT := 0;
    v_bs_total NUMERIC := 0;
BEGIN
    -- Account info
    SELECT a.* INTO v_acc FROM public.accounts a WHERE a.id = p_account_id;
    IF v_acc.id IS NULL THEN
        RAISE EXCEPTION 'Cari hesap bulunamadı (ID: %)', p_account_id;
    END IF;

    -- Company info
    SELECT c.* INTO v_comp FROM public.companies c WHERE c.id = v_acc.company_id;

    -- Statement statement data up to p_as_of_date
    v_statement := public.get_account_statement(p_account_id, NULL, p_as_of_date, p_currency);
    
    v_balance := COALESCE((v_statement->>'finalBalance')::NUMERIC, 0);
    v_balance_type := COALESCE(v_statement->>'finalBalanceType', 'Bakiye Yok');
    v_debit := COALESCE((v_statement->>'periodDebitTotal')::NUMERIC, 0);
    v_credit := COALESCE((v_statement->>'periodCreditTotal')::NUMERIC, 0);

    -- BA / BS Fatura İstatistikleri (Alış/Satış Matrahları)
    SELECT 
        COUNT(*), COALESCE(SUM(subtotal), 0)
    INTO v_ba_count, v_ba_total
    FROM public.invoices
    WHERE account_id = p_account_id
      AND invoice_type = 'purchase'
      AND status = 'completed'
      AND issue_date <= p_as_of_date
      AND deleted_at IS NULL;

    SELECT 
        COUNT(*), COALESCE(SUM(subtotal), 0)
    INTO v_bs_count, v_bs_total
    FROM public.invoices
    WHERE account_id = p_account_id
      AND invoice_type = 'sales'
      AND status = 'completed'
      AND issue_date <= p_as_of_date
      AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'asOfDate', p_as_of_date,
        'currency', COALESCE(p_currency, 'TRY'),
        'account', jsonb_build_object(
            'id', v_acc.id,
            'code', v_acc.code,
            'name', v_acc.name,
            'taxOffice', v_acc.tax_office,
            'taxNumber', v_acc.tax_number,
            'phone', v_acc.phone,
            'email', v_acc.email,
            'address', v_acc.address,
            'authorizedPerson', v_acc.authorized_person,
            'city', v_acc.city,
            'district', v_acc.district
        ),
        'company', jsonb_build_object(
            'name', COALESCE(v_comp.name, 'Pyramid ERP Firması'),
            'taxOffice', v_comp.tax_office,
            'taxNumber', v_comp.tax_number,
            'phone', v_comp.phone,
            'email', v_comp.email,
            'address', v_comp.address
        ),
        'financials', jsonb_build_object(
            'debitTotal', v_debit,
            'creditTotal', v_credit,
            'balance', v_balance,
            'balanceType', v_balance_type,
            'baCount', v_ba_count,
            'baTotal', v_ba_total,
            'bsCount', v_bs_count,
            'bsTotal', v_bs_total
        )
    );
END;
$$;
