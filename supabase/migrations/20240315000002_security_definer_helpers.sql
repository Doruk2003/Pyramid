-- =============================================================================
-- 20240315000002_security_definer_helpers.sql
-- SECURITY DEFINER yardımcı fonksiyonlar + Tüm RLS politikalarının düzeltilmesi
--
-- SORUN: users tablosundaki RLS politikaları, değerlendirme sırasında tekrar
-- users tablosunu sorguluyor. Bu PostgreSQL'de "infinite recursion" hatasına
-- yol açar ve uygulama tamamen çöker.
--
-- ÇÖZÜM: SECURITY DEFINER fonksiyonlar RLS'i bypass ederek çalışır.
-- Politikalar bu fonksiyonları çağırdığında döngü oluşmaz.
-- =============================================================================


-- =============================================================================
-- BÖLÜM 1: SECURITY DEFINER YARDIMCI FONKSİYONLAR
-- =============================================================================

-- Oturum açmış kullanıcının company_id'sini döndürür (RLS bypass ile)
CREATE OR REPLACE FUNCTION get_auth_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE           -- Aynı transaction içinde aynı sonucu döndürür (önbelleğe alınır)
SECURITY DEFINER -- RLS'i bypass ederek çalışır → döngü oluşmaz
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$;

-- Oturum açmış kullanıcının rolünü döndürür (RLS bypass ile)
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;


-- =============================================================================
-- BÖLÜM 2: USERS TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- (Önceki migration'daki hatalı politikalar kaldırılıp yeniden yazılıyor)
-- =============================================================================

DROP POLICY IF EXISTS "admin_all_users"      ON users;
DROP POLICY IF EXISTS "user_read_own_profile" ON users;
DROP POLICY IF EXISTS "company_isolation_users" ON users;

-- Her kullanıcı kendi profilini okuyabilir
CREATE POLICY "user_read_own_profile" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin: kendi şirketindeki tüm kullanıcıları yönetebilir
CREATE POLICY "admin_manage_users" ON users
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() = 'admin'
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() = 'admin'
  );


-- =============================================================================
-- BÖLÜM 3: PRODUCTS TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- =============================================================================

DROP POLICY IF EXISTS "read_products"  ON products;
DROP POLICY IF EXISTS "write_products" ON products;
DROP POLICY IF EXISTS "company_isolation_products" ON products;

-- Okuma: Kendi şirketindeki herkes görebilir
CREATE POLICY "read_products" ON products
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

-- Yazma: Sadece admin ve manager ekleyip düzenleyip silebilir
CREATE POLICY "write_products" ON products
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  );


-- =============================================================================
-- BÖLÜM 4: ACCOUNTS TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- =============================================================================

DROP POLICY IF EXISTS "read_accounts"  ON accounts;
DROP POLICY IF EXISTS "write_accounts" ON accounts;
DROP POLICY IF EXISTS "company_isolation_accounts" ON accounts;

CREATE POLICY "read_accounts" ON accounts
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_accounts" ON accounts
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );


-- =============================================================================
-- BÖLÜM 5: INVOICES TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- =============================================================================

DROP POLICY IF EXISTS "read_invoices"  ON invoices;
DROP POLICY IF EXISTS "write_invoices" ON invoices;
DROP POLICY IF EXISTS "company_isolation_invoices" ON invoices;

CREATE POLICY "read_invoices" ON invoices
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_invoices" ON invoices
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );


-- =============================================================================
-- BÖLÜM 6: INVOICE_LINES TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- =============================================================================

DROP POLICY IF EXISTS "company_isolation_invoice_lines" ON invoice_lines;

-- invoice_lines kendi company_id'si yok; bağlı fatura üzerinden kontrol edilir
CREATE POLICY "read_invoice_lines" ON invoice_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_lines.invoice_id
        AND invoices.company_id = get_auth_user_company_id()
    )
  );

CREATE POLICY "write_invoice_lines" ON invoice_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_lines.invoice_id
        AND invoices.company_id = get_auth_user_company_id()
    )
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_lines.invoice_id
        AND invoices.company_id = get_auth_user_company_id()
    )
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );


-- =============================================================================
-- BÖLÜM 7: WAREHOUSES TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- =============================================================================

DROP POLICY IF EXISTS "company_isolation_warehouses" ON warehouses;

CREATE POLICY "read_warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_warehouses" ON warehouses
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager')
  );


-- =============================================================================
-- BÖLÜM 8: STOCK_MOVEMENTS TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- =============================================================================

DROP POLICY IF EXISTS "company_isolation_stock_movements" ON stock_movements;

CREATE POLICY "read_stock_movements" ON stock_movements
  FOR SELECT TO authenticated
  USING (company_id = get_auth_user_company_id());

CREATE POLICY "write_stock_movements" ON stock_movements
  FOR ALL TO authenticated
  USING (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  )
  WITH CHECK (
    company_id = get_auth_user_company_id()
    AND get_auth_user_role() IN ('admin', 'manager', 'user')
  );


-- =============================================================================
-- BÖLÜM 9: COMPANIES TABLOSU POLİTİKALARININ DÜZELTİLMESİ
-- =============================================================================

DROP POLICY IF EXISTS "company_isolation_companies" ON companies;

-- Tek firma senaryosu: sadece admin kendi şirket kaydını görebilir/düzenleyebilir
CREATE POLICY "admin_read_own_company" ON companies
  FOR SELECT TO authenticated
  USING (id = get_auth_user_company_id());

CREATE POLICY "admin_manage_own_company" ON companies
  FOR ALL TO authenticated
  USING (
    id = get_auth_user_company_id()
    AND get_auth_user_role() = 'admin'
  )
  WITH CHECK (
    id = get_auth_user_company_id()
    AND get_auth_user_role() = 'admin'
  );
