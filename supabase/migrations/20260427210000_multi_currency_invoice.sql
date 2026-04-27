-- Fatura satırlarına çoklu döviz desteği ekleme
ALTER TABLE invoice_lines ADD COLUMN original_price numeric(19,4);
ALTER TABLE invoice_lines ADD COLUMN original_currency text;

COMMENT ON COLUMN invoice_lines.original_price IS 'Ürün kartındaki orijinal fiyat';
COMMENT ON COLUMN invoice_lines.original_currency IS 'Ürün kartındaki orijinal döviz cinsi';

-- Mevcut verileri güncelle (fiyat ve dövizi faturadan miras al)
DO $$
BEGIN
    UPDATE invoice_lines l
    SET original_price = l.unit_price,
        original_currency = i.currency
    FROM invoices i
    WHERE l.invoice_id = i.id;
END $$;
