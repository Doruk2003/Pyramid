-- 20260426120000_company_invoice_settings.sql
-- Fatura seri ve sıra numarası ayarları

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS invoice_serial VARCHAR(3) DEFAULT 'AAA',
    ADD COLUMN IF NOT EXISTS invoice_starting_number INTEGER DEFAULT 1;
