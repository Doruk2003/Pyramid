-- =============================================================================
-- 20260323000002_medium_term_fixes.sql
-- ORTA VADELİ DÜZELTMELER
--
-- MADDE 5: deleted_at — Soft Delete tüm kritik tablolara ekleniyor
-- MADDE 6: Fatura toplam tutarsızlığı — invoice_lines trigger ile otomatik sync
-- MADDE 7: stock_balances refresh → ZATEN ÇÖZÜLMÜŞ (20240315000001 migrasyonu)
--          trg_refresh_stock_balances + CONCURRENTLY aktif. Doküman güncellemesi yeterli.
--
-- SOFT DELETE TASARIM NOTU:
--   - Hiçbir kayıt fiziksel olarak SİLİNMEZ.
--   - deleted_at IS NOT NULL olan kayıtlar RLS ile otomatik gizlenir.
--   - Yasal denetim, muhasebe geçmişi ve veri bütünlüğü bu şekilde korunur.
-- =============================================================================


-- =============================================================================
-- MADDE 5: SOFT DELETE — deleted_at kolonunun kritik tablolara eklenmesi
-- =============================================================================

-- Ürünler
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Cari Hesaplar
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Faturalar
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Depolar
ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Teklifler
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Siparişler
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index: Soft-delete sorgularında hız (NULL değerler nadiren sort edilir)
CREATE INDEX IF NOT EXISTS idx_products_not_deleted   ON products(company_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_not_deleted   ON accounts(company_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted   ON invoices(company_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_not_deleted ON warehouses(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_not_deleted     ON quotes(company_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_not_deleted     ON orders(company_id)     WHERE deleted_at IS NULL;


-- =============================================================================
-- RLS POLİTİKALARINI SOFT-DELETE İÇİN GÜNCELLE
-- Silinen kayıtlar (deleted_at IS NOT NULL) artık hiçbir kullanıcıya görünmez.
-- =============================================================================

-- PRODUCTS
DROP POLICY IF EXISTS "read_products"  ON products;
DROP POLICY IF EXISTS "write_products" ON products;

CREATE POLICY "read_products" ON products
  FOR SELECT TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "write_products" ON products
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
    AND get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  );

-- ACCOUNTS
DROP POLICY IF EXISTS "read_accounts"  ON accounts;
DROP POLICY IF EXISTS "write_accounts" ON accounts;

CREATE POLICY "read_accounts" ON accounts
  FOR SELECT TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "write_accounts" ON accounts
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );

-- INVOICES
DROP POLICY IF EXISTS "read_invoices"  ON invoices;
DROP POLICY IF EXISTS "write_invoices" ON invoices;

CREATE POLICY "read_invoices" ON invoices
  FOR SELECT TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "write_invoices" ON invoices
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );

-- WAREHOUSES
DROP POLICY IF EXISTS "read_warehouses"  ON warehouses;
DROP POLICY IF EXISTS "write_warehouses" ON warehouses;

CREATE POLICY "read_warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "write_warehouses" ON warehouses
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
    AND get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  );

-- QUOTES
DROP POLICY IF EXISTS "read_quotes"  ON quotes;
DROP POLICY IF EXISTS "write_quotes" ON quotes;

CREATE POLICY "read_quotes" ON quotes
  FOR SELECT TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "write_quotes" ON quotes
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );

-- ORDERS
DROP POLICY IF EXISTS "read_orders"  ON orders;
DROP POLICY IF EXISTS "write_orders" ON orders;

CREATE POLICY "read_orders" ON orders
  FOR SELECT TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "write_orders" ON orders
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND deleted_at IS NULL
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );


-- =============================================================================
-- MADDE 6: FATURA TOPLAM OTO-SYNC TRIGGER
--
-- SORUN: saveInvoice() → kalemleri sil + yeniden INSERT yapar.
-- Ancak dışarıdan invoice_lines doğrudan UPDATE/DELETE edilirse
-- invoices.subtotal/vat_total/total güncellenmez (tutarsızlık).
--
-- ÇÖZÜM: invoice_lines tablosundaki her INSERT/UPDATE/DELETE sonrası
-- ilişkili faturanın toplamları otomatik yeniden hesaplanır.
--
-- HESAPLAMA:
--   Her satır:
--     net    = quantity * unit_price * (1 - discount_rate/100)
--     vat    = net * vat_rate/100
--     toplam = net + vat   (line_total = net + vat)
--   Fatura:
--     subtotal  = SUM(net)
--     vat_total = SUM(vat)
--     total     = subtotal + vat_total
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal   DECIMAL(18,2);
  v_vat_total  DECIMAL(18,2);
BEGIN
  -- Hangi fatura etkilendi?
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Faturanın tüm kalemlerinden subtotal ve vat_total hesapla
  SELECT
    COALESCE(SUM(quantity * unit_price * (1.0 - discount_rate / 100.0)), 0),
    COALESCE(SUM(quantity * unit_price * (1.0 - discount_rate / 100.0) * vat_rate / 100.0), 0)
  INTO v_subtotal, v_vat_total
  FROM invoice_lines
  WHERE invoice_id = v_invoice_id;

  -- Faturayı güncelle
  UPDATE invoices
  SET
    subtotal   = v_subtotal,
    vat_total  = v_vat_total,
    total      = v_subtotal + v_vat_total,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN NULL; -- AFTER trigger için NULL döner
END;
$$ LANGUAGE plpgsql;

-- Mevcut trigger varsa kaldır (idempotent)
DROP TRIGGER IF EXISTS trg_sync_invoice_totals ON invoice_lines;

-- Her kalem değişiminde tetikle (INSERT, UPDATE, DELETE)
CREATE TRIGGER trg_sync_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE
  ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION sync_invoice_totals();


-- =============================================================================
-- MADDE 7: stock_balances REFRESH — ZATEN ÇÖZÜLMÜŞ ✅
--
-- Migration 20240315000001_stock_balances_materialized_view.sql içinde:
--   - MATERIALIZED VIEW oluşturuldu
--   - UNIQUE INDEX eklendi (CONCURRENTLY için zorunlu)
--   - trg_refresh_stock_balances trigger her INSERT/UPDATE/DELETE'te tetikleniyor
--   - REFRESH MATERIALIZED VIEW CONCURRENTLY → tablo kilidi YOK
--
-- Bu migration güncellemesi yalnızca dokümantasyon amacıyla eklenmiştir.
-- Teknik borç listesinden çıkarıldı.
-- =============================================================================


-- =============================================================================
-- DOĞRULAMA SORGUSU (Migration sonrası çalıştırın)
-- =============================================================================
-- Tüm kritik tablolarda deleted_at kolonunun varlığını doğrula:
-- SELECT table_name, column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name = 'deleted_at'
-- ORDER BY table_name;
--
-- Beklenen tablolar: accounts, invoices, orders, products, quotes, warehouses
-- =============================================================================
