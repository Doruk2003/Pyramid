-- 20260422230000_account_code.sql
-- Accounts tablosuna cari kodu (code) eklenmesi

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS code TEXT;

-- Mevcut kayıtlar için otomatik kod üretimi (opsiyonel, gerekirse)
-- UPDATE accounts SET code = 'ACC-' || substring(id::text, 1, 8) WHERE code IS NULL;
