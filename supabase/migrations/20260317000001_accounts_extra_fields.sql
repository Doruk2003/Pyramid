-- 20260317000001_accounts_extra_fields.sql
-- Accounts tablosu ek alanlar

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS authorized_person TEXT,
    ADD COLUMN IF NOT EXISTS authorized_gsm TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS district TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT,
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS account_owner TEXT,
    ADD COLUMN IF NOT EXISTS iban TEXT,
    ADD COLUMN IF NOT EXISTS tax_office TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS is_dealer BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS dealer_discount1 DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dealer_discount2 DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dealer_discount3 DECIMAL(5,2) DEFAULT 0;
