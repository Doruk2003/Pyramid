-- 20260426100000_invoice_header_discount.sql
-- Fatura başlığına ödeme tipi ve genel indirim desteği ekleme

-- 1) Invoices tablosuna yeni kolonlar ekle
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(18,2) DEFAULT 0;

-- 2) sync_invoice_totals trigger fonksiyonunu güncelle
-- Hem satır bazlı 3'lü indirimi hem de fatura geneli indirimi destekler.
CREATE OR REPLACE FUNCTION sync_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id      UUID;
  v_lines_subtotal  DECIMAL(18,2);
  v_lines_vat       DECIMAL(18,2);
  v_header_disc_rate DECIMAL(5,2);
  v_header_disc_amt  DECIMAL(18,2);
  v_net_subtotal    DECIMAL(18,2);
  v_vat_ratio       DECIMAL(18,10);
BEGIN
  -- Hangi fatura etkilendi?
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Faturanın genel indirim oranını al
  SELECT discount_rate INTO v_header_disc_rate FROM invoices WHERE id = v_invoice_id;

  -- 1. ADIM: Satırların kendi içindeki 3'lü indirimleri sonrası toplamları hesapla
  -- Not: Bileşik indirim (compound) formülü: (1-d1)*(1-d2)*(1-d3)
  SELECT
    COALESCE(SUM(
        quantity * unit_price * 
        (1.0 - COALESCE(discount_rate1, 0) / 100.0) * 
        (1.0 - COALESCE(discount_rate2, 0) / 100.0) * 
        (1.0 - COALESCE(discount_rate3, 0) / 100.0)
    ), 0),
    COALESCE(SUM(
        quantity * unit_price * 
        (1.0 - COALESCE(discount_rate1, 0) / 100.0) * 
        (1.0 - COALESCE(discount_rate2, 0) / 100.0) * 
        (1.0 - COALESCE(discount_rate3, 0) / 100.0) * 
        (vat_rate / 100.0)
    ), 0)
  INTO v_lines_subtotal, v_lines_vat
  FROM invoice_lines
  WHERE invoice_id = v_invoice_id;

  -- 2. ADIM: Fatura Geneli İndirimi Hesapla
  v_header_disc_amt := v_lines_subtotal * (COALESCE(v_header_disc_rate, 0) / 100.0);
  v_net_subtotal    := v_lines_subtotal - v_header_disc_amt;
  
  -- 3. ADIM: KDV'yi yeni net tutara göre orantıla
  -- (Profesyonel yöntem: İndirimi satırlara dağıtmak yerine toplam KDV'yi indirim oranında düşürürüz)
  IF v_lines_subtotal > 0 THEN
    v_vat_ratio := v_net_subtotal / v_lines_subtotal;
    v_lines_vat := v_lines_vat * v_vat_ratio;
  ELSE
    v_lines_vat := 0;
  END IF;

  -- 4. ADIM: Faturayı güncelle
  UPDATE invoices
  SET
    subtotal        = v_lines_subtotal,
    discount_amount = v_header_disc_amt,
    vat_total       = v_lines_vat,
    total           = v_net_subtotal + v_lines_vat,
    updated_at      = NOW()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Not: trg_sync_invoice_totals zaten invoice_lines üzerinde tanımlı olduğu için 
-- sadece fonksiyonun güncellenmesi yeterlidir.
