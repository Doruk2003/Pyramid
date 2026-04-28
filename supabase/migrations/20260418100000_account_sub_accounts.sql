-- ============================================================
-- Migration: Alt Hesap (Sub-Account) Hiyerarşisi
-- Tarih: 2026-04-18
-- Açıklama: accounts tablosuna parent_id eklenerek 2 seviyeli
--           hiyerarşi (Ana Hesap → Alt Hesap) desteği sağlanır.
--           Konsolide kredi limiti: alt hesapların toplam borcu
--           ana hesabın limitine dahil edilir.
-- ============================================================

-- 1) parent_id kolonu ekle
ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

-- 2) Kendi kendine referans engelleyici constraint
ALTER TABLE accounts
    DROP CONSTRAINT IF EXISTS chk_no_self_parent;

ALTER TABLE accounts
    ADD CONSTRAINT chk_no_self_parent CHECK (id != parent_id);

-- 3) Alt hesabın da alt hesabı olamaz (2 seviye sınırı) — DB level kontrol.
--    İkinci seviyede parent_id olan bir hesap, kendisi parent olamaz.
--    Bu kural uygulama katmanında da kontrol edilir (saveAccount).
--    DB seviyesinde de ek bir trigger ile korunabilir (opsiyonel, şimdilik uygulama katmanında):
--    CREATE OR REPLACE FUNCTION check_max_depth() RETURNS TRIGGER AS $$
--    BEGIN
--      IF NEW.parent_id IS NOT NULL THEN
--        IF EXISTS (SELECT 1 FROM accounts WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
--          RAISE EXCEPTION 'Alt hesabın alt hesabı olamaz (maksimum 2 seviye)';
--        END IF;
--      END IF;
--      RETURN NEW;
--    END; $$ LANGUAGE plpgsql SECURITY DEFINER;
--    
--    CREATE TRIGGER trg_check_account_depth
--      BEFORE INSERT OR UPDATE ON accounts
--      FOR EACH ROW EXECUTE FUNCTION check_max_depth();

-- 4) Derinlik kontrolü trigger
CREATE OR REPLACE FUNCTION check_account_max_depth()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer parent_id atanıyorsa, parent'ın kendisi de bir alt hesap olamaz
    IF NEW.parent_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM accounts
            WHERE id = NEW.parent_id
              AND parent_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Alt hesabın alt hesabı olamaz. Maksimum 2 seviye hiyerarşi desteklenmektedir.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_account_depth ON accounts;
CREATE TRIGGER trg_check_account_depth
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION check_account_max_depth();

-- 5) Performans indeksi
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id
    ON accounts(parent_id)
    WHERE parent_id IS NOT NULL;

-- 6) Konsolide bakiye için view (raporlama amaçlı)
--    Ana hesabın toplam borcu = kendi faturaları + alt hesapların faturaları
CREATE OR REPLACE VIEW account_consolidated_balances AS
SELECT
    parent.id                                                   AS account_id,
    parent.name                                                 AS account_name,
    parent.credit_limit                                         AS credit_limit,
    COALESCE(SUM(i.total) FILTER (WHERE i.deleted_at IS NULL), 0) AS consolidated_total
FROM accounts parent
LEFT JOIN accounts sub ON sub.parent_id = parent.id
LEFT JOIN invoices i ON i.account_id IN (parent.id, sub.id)
WHERE parent.parent_id IS NULL   -- Sadece ana hesaplar
  AND parent.deleted_at IS NULL
  AND parent.company_id = get_auth_user_company_id()
GROUP BY parent.id, parent.name, parent.credit_limit;
