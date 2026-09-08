-- Migration: Phase 1 Finance Fixes (Precision, Payment Cancellation Guard & FX Diff Helpers)
-- Date: 2026-09-08

-- 1. Database trigger: Tamamlanmış ödemesi bulunan faturaların 'cancelled' durumuna alınmasını engeller
CREATE OR REPLACE FUNCTION prevent_cancelled_invoice_with_payments()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_count INTEGER;
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        SELECT COUNT(*)
        INTO v_payment_count
        FROM payments
        WHERE invoice_id = NEW.id
          AND status = 'completed';

        IF v_payment_count > 0 THEN
            RAISE EXCEPTION 'Bu faturaya bağlı % adet tamamlanmış ödeme/tahsilat bulunmaktadır. Faturayı iptal etmeden önce bağlı ödeme kayıtlarını iptal etmelisiniz.', v_payment_count;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_cancelled_invoice_with_payments ON invoices;
CREATE TRIGGER trg_prevent_cancelled_invoice_with_payments
BEFORE UPDATE OF status ON invoices
FOR EACH ROW
EXECUTE FUNCTION prevent_cancelled_invoice_with_payments();

-- 2. Kur Farkı Hesaplama Yardımcı RPC Fonksiyonu
CREATE OR REPLACE FUNCTION calculate_payment_fx_difference(
    p_invoice_id UUID,
    p_payment_amount NUMERIC,
    p_payment_exchange_rate NUMERIC
)
RETURNS TABLE (
    invoice_currency TEXT,
    invoice_rate NUMERIC,
    payment_rate NUMERIC,
    rate_difference NUMERIC,
    fx_gain_loss NUMERIC,
    fx_type TEXT
) 
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
    v_inv_currency TEXT;
    v_inv_rate NUMERIC;
    v_rate_diff NUMERIC;
    v_fx_gain_loss NUMERIC;
    v_fx_type TEXT;
BEGIN
    SELECT currency, COALESCE(exchange_rate, 1)
    INTO v_inv_currency, v_inv_rate
    FROM invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND OR v_inv_currency = 'TRY' OR v_inv_rate = p_payment_exchange_rate THEN
        RETURN QUERY SELECT v_inv_currency, v_inv_rate, p_payment_exchange_rate, 0::NUMERIC, 0::NUMERIC, 'none'::TEXT;
        RETURN;
    END IF;

    v_rate_diff := p_payment_exchange_rate - v_inv_rate;
    v_fx_gain_loss := ROUND(p_payment_amount * v_rate_diff, 2);

    IF v_fx_gain_loss > 0 THEN
        v_fx_type := 'gain';
    ELSIF v_fx_gain_loss < 0 THEN
        v_fx_type := 'loss';
    ELSE
        v_fx_type := 'none';
    END IF;

    RETURN QUERY SELECT v_inv_currency, v_inv_rate, p_payment_exchange_rate, v_rate_diff, v_fx_gain_loss, v_fx_type;
END;
$$;
