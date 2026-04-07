-- =============================================================================
-- 20260323000001_critical_fixes.sql
-- KRİTİK DÜZELTMELER — 3 Acil Sorun
--
-- SORUN 1: quotes/orders → ON DELETE CASCADE (veri kaybı riski)
-- SORUN 2: Sales RLS politikaları helper fonksiyon kullanmıyor (N+1 sorgu)
-- SORUN 3: brands/categories/types tablolarında company_id yok
--          (Şu an tek firma, ileride çoklu firmaya geçiş altyapısı)
--
-- TASARIM NOTU: Sistem "Tek Firma — Çok Kullanıcı" olarak çalışır.
-- company_id altyapısı hazır tutulur; ileride multi-tenant'a geçiş
-- yalnızca RLS politikaları ve kullanıcı onboarding akışı güncellenerek yapılır.
-- =============================================================================


-- =============================================================================
-- SORUN 1: quotes/orders tablolarındaki tehlikeli ON DELETE CASCADE KALDIRILMASI
--
-- NEDEN: Finansal ve ticari belgeler (teklif/sipariş) bir şirket kaydı
-- silindiğinde asla otomatik silinmemelidir. Denetim, arşiv ve hukuki
-- zorunluluklar gereği bu kayıtlar korunmalıdır.
-- MEVCUT: ON DELETE CASCADE  →  DOĞRU: ON DELETE RESTRICT
-- =============================================================================

-- quotes.company_id foreign key kısıtını CASCADE'den RESTRICT'e çevir
ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_company_id_fkey;

ALTER TABLE quotes
  ADD CONSTRAINT quotes_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- orders.company_id foreign key kısıtını CASCADE'den RESTRICT'e çevir
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_company_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- quote_lines.quote_id — bu CASCADE doğru (satır → teklif birlikte silinmeli)
-- order_lines.order_id — bu CASCADE doğru (satır → sipariş birlikte silinmeli)
-- Bunlara dokunulmaz.


-- =============================================================================
-- SORUN 2: Sales modülü RLS politikalarını helper fonksiyon ile optimize et
--
-- NEDEN: Önceki migration (20260323000000_sales_module.sql) politikaları
-- doğrudan subquery kullanıyor. Bu her sorgu için users tablosuna ekstra
-- roundtrip yapar. get_auth_user_company_id() fonksiyonu STABLE + SECURITY
-- DEFINER olduğundan PostgreSQL tarafından transaction içinde önbelleğe alınır.
-- =============================================================================

-- Eski politikaları temizle
DROP POLICY IF EXISTS "şirket_izolasyonu_quotes"      ON quotes;
DROP POLICY IF EXISTS "şirket_izolasyonu_quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "şirket_izolasyonu_orders"      ON orders;
DROP POLICY IF EXISTS "şirket_izolasyonu_order_lines" ON order_lines;

-- QUOTES politikaları
DROP POLICY IF EXISTS "read_quotes"  ON quotes;
DROP POLICY IF EXISTS "write_quotes" ON quotes;

CREATE POLICY "read_quotes" ON quotes
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_quotes" ON quotes
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );

-- QUOTE_LINES politikaları
DROP POLICY IF EXISTS "read_quote_lines"  ON quote_lines;
DROP POLICY IF EXISTS "write_quote_lines" ON quote_lines;

CREATE POLICY "read_quote_lines" ON quote_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_lines.quote_id
        AND quotes.company_id = get_auth_user_company_id()
    )
  );

CREATE POLICY "write_quote_lines" ON quote_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_lines.quote_id
        AND quotes.company_id = get_auth_user_company_id()
    )
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_lines.quote_id
        AND quotes.company_id = get_auth_user_company_id()
    )
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );

-- ORDERS politikaları
DROP POLICY IF EXISTS "read_orders"  ON orders;
DROP POLICY IF EXISTS "write_orders" ON orders;

CREATE POLICY "read_orders" ON orders
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_orders" ON orders
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );

-- ORDER_LINES politikaları
DROP POLICY IF EXISTS "read_order_lines"  ON order_lines;
DROP POLICY IF EXISTS "write_order_lines" ON order_lines;

CREATE POLICY "read_order_lines" ON order_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_lines.order_id
        AND orders.company_id = get_auth_user_company_id()
    )
  );

CREATE POLICY "write_order_lines" ON order_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_lines.order_id
        AND orders.company_id = get_auth_user_company_id()
    )
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_lines.order_id
        AND orders.company_id = get_auth_user_company_id()
    )
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );


-- =============================================================================
-- SORUN 3: brands, categories, types tablolarına company_id eklenmesi
--
-- TASARIM KARARI: "Tek Firma — Çok Kullanıcı" modeli
-- Şu an sistemde tek firma var. Ancak company_id altyapısını şimdiden
-- eklemek, ileride multi-tenant'a geçişi minimum değişiklikle mümkün kılar.
--
-- GEÇİŞ STRATEJİSİ (ileride):
--   1. Yeni firma kaydı oluştur
--   2. users.company_id güncelle
--   3. RLS politikaları otomatik devreye girer
--   Başka kod değişikliği GEREKMEz.
--
-- ÖNEMLİ: Mevcut kayıtlar (brands/categories/types) ilk firmayla ilişkilendirilir.
-- NOT: brands, categories, types tablolarında updated_at eksik — şimdi ekleniyor.
-- =============================================================================

-- BRANDS — company_id ve updated_at ekle
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS company_id  UUID REFERENCES companies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT true;

-- CATEGORIES — company_id, parent_id hiyerarşi ve updated_at ekle
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS company_id  UUID REFERENCES companies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS parent_id   UUID REFERENCES categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT true;

-- TYPES — company_id ve updated_at ekle
ALTER TABLE types
  ADD COLUMN IF NOT EXISTS company_id  UUID REFERENCES companies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT true;

-- Mevcut kayıtları tek firmayla ilişkilendir
-- (Supabase Dashboard'da seed firmayı bulmak için: SELECT id FROM companies LIMIT 1)
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM companies ORDER BY created_at ASC LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    UPDATE brands     SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE categories SET company_id = v_company_id WHERE company_id IS NULL;
    UPDATE types      SET company_id = v_company_id WHERE company_id IS NULL;
    RAISE NOTICE 'Mevcut kayıtlar company_id = % ile ilişkilendirildi.', v_company_id;
  ELSE
    RAISE WARNING 'Henüz şirket kaydı yok. brands/categories/types.company_id NULL kaldı. İlk şirket oluşturulduktan sonra UPDATE çalıştırınız.';
  END IF;
END $$;

-- RLS Aktifleştirme
ALTER TABLE brands     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE types      ENABLE ROW LEVEL SECURITY;

-- BRANDS Politikaları
DROP POLICY IF EXISTS "read_brands"  ON brands;
DROP POLICY IF EXISTS "write_brands" ON brands;

CREATE POLICY "read_brands" ON brands
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_brands" ON brands
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  );

-- CATEGORIES Politikaları
DROP POLICY IF EXISTS "read_categories"  ON categories;
DROP POLICY IF EXISTS "write_categories" ON categories;

CREATE POLICY "read_categories" ON categories
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_categories" ON categories
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  );

-- TYPES Politikaları
DROP POLICY IF EXISTS "read_types"  ON types;
DROP POLICY IF EXISTS "write_types" ON types;

CREATE POLICY "read_types" ON types
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_types" ON types
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  );

-- Index'ler (multi-tenant sorgular için)
CREATE INDEX IF NOT EXISTS idx_brands_company     ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_types_company      ON types(company_id);

-- =============================================================================
-- DOĞRULAMA SORGUSU (Migration sonrası çalıştırın)
-- =============================================================================
-- SELECT
--   'brands'     AS tablo, COUNT(*) FILTER (WHERE company_id IS NULL) AS null_company FROM brands
-- UNION ALL SELECT
--   'categories', COUNT(*) FILTER (WHERE company_id IS NULL) FROM categories
-- UNION ALL SELECT
--   'types',      COUNT(*) FILTER (WHERE company_id IS NULL) FROM types
-- UNION ALL SELECT
--   'quotes',     COUNT(*) FILTER (WHERE company_id IS NULL) FROM quotes
-- UNION ALL SELECT
--   'orders',     COUNT(*) FILTER (WHERE company_id IS NULL) FROM orders;
-- Tüm sonuçlar 0 olmalıdır.
-- =============================================================================
