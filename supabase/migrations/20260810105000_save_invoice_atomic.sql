-- Migration: save_invoice_with_lines function for atomic invoice updates
-- Date: 2026-08-10

CREATE OR REPLACE FUNCTION save_invoice_with_lines(
    p_invoice JSONB,
    p_lines JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice_id UUID;
    v_line JSONB;
    v_source_ids UUID[];
BEGIN
    -- Extract or generate invoice ID
    v_invoice_id := COALESCE((p_invoice->>'id')::UUID, gen_random_uuid());

    -- Convert JSONB array of strings to UUID[] if present
    IF p_invoice ? 'source_ids' AND jsonb_typeof(p_invoice->'source_ids') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(p_invoice->'source_ids')::UUID) INTO v_source_ids;
    ELSE
        v_source_ids := NULL;
    END IF;

    -- Upsert invoice header
    INSERT INTO invoices (
        id,
        company_id,
        invoice_type,
        invoice_number,
        account_id,
        warehouse_id,
        project_id,
        issue_date,
        due_date,
        status,
        payment_type,
        document_category,
        subtotal,
        discount_rate,
        discount_amount,
        vat_total,
        total,
        paid_amount,
        currency,
        exchange_rate,
        notes,
        source_type,
        source_ids,
        updated_at
    ) VALUES (
        v_invoice_id,
        (p_invoice->>'company_id')::UUID,
        p_invoice->>'invoice_type',
        p_invoice->>'invoice_number',
        (p_invoice->>'account_id')::UUID,
        (p_invoice->>'warehouse_id')::UUID,
        (p_invoice->>'project_id')::UUID,
        (p_invoice->>'issue_date')::DATE,
        (p_invoice->>'due_date')::DATE,
        p_invoice->>'status',
        p_invoice->>'payment_type',
        COALESCE(p_invoice->>'document_category', 'domestic'),
        (p_invoice->>'subtotal')::DECIMAL(18,2),
        (p_invoice->>'discount_rate')::DECIMAL(5,2),
        (p_invoice->>'discount_amount')::DECIMAL(18,2),
        (p_invoice->>'vat_total')::DECIMAL(18,2),
        (p_invoice->>'total')::DECIMAL(18,2),
        (p_invoice->>'paid_amount')::DECIMAL(18,2),
        p_invoice->>'currency',
        (p_invoice->>'exchange_rate')::DECIMAL(10,6),
        p_invoice->>'notes',
        p_invoice->>'source_type',
        v_source_ids,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        invoice_type = EXCLUDED.invoice_type,
        invoice_number = EXCLUDED.invoice_number,
        account_id = EXCLUDED.account_id,
        warehouse_id = EXCLUDED.warehouse_id,
        project_id = EXCLUDED.project_id,
        issue_date = EXCLUDED.issue_date,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        payment_type = EXCLUDED.payment_type,
        document_category = EXCLUDED.document_category,
        subtotal = EXCLUDED.subtotal,
        discount_rate = EXCLUDED.discount_rate,
        discount_amount = EXCLUDED.discount_amount,
        vat_total = EXCLUDED.vat_total,
        total = EXCLUDED.total,
        paid_amount = EXCLUDED.paid_amount,
        currency = EXCLUDED.currency,
        exchange_rate = EXCLUDED.exchange_rate,
        notes = EXCLUDED.notes,
        source_type = EXCLUDED.source_type,
        source_ids = EXCLUDED.source_ids,
        updated_at = EXCLUDED.updated_at;

    -- Delete old invoice lines
    DELETE FROM invoice_lines WHERE invoice_id = v_invoice_id;

    -- Insert new invoice lines
    IF p_lines IS NOT NULL AND jsonb_typeof(p_lines) = 'array' THEN
        FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
            INSERT INTO invoice_lines (
                id,
                invoice_id,
                product_id,
                warehouse_id,
                description,
                quantity,
                unit_price,
                vat_rate,
                discount_rate1,
                discount_rate2,
                discount_rate3,
                line_total,
                original_price,
                original_currency,
                source_line_id
            ) VALUES (
                COALESCE((v_line->>'id')::UUID, gen_random_uuid()),
                v_invoice_id,
                (v_line->>'product_id')::UUID,
                (v_line->>'warehouse_id')::UUID,
                v_line->>'description',
                (v_line->>'quantity')::DECIMAL(18,4),
                (v_line->>'unit_price')::DECIMAL(18,4),
                COALESCE((v_line->>'vat_rate')::DECIMAL(5,2), 20),
                COALESCE((v_line->>'discount_rate1')::DECIMAL(5,2), 0),
                COALESCE((v_line->>'discount_rate2')::DECIMAL(5,2), 0),
                COALESCE((v_line->>'discount_rate3')::DECIMAL(5,2), 0),
                (v_line->>'line_total')::DECIMAL(18,2),
                (v_line->>'original_price')::DECIMAL(19,4),
                v_line->>'original_currency',
                (v_line->>'source_line_id')::UUID
            );
        END LOOP;
    END IF;
END;
$$;
