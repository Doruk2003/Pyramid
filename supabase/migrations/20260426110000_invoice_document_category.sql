-- 20260426110000_invoice_document_category.sql
-- Fatura kategorisi (Yurtiçi, İhracat, İhraç Kayıtlı) desteği

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS document_category TEXT DEFAULT 'domestic'; -- yurtiçi, export, export_registered
