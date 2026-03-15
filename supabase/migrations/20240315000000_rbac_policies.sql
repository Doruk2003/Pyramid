-- 20240315000000_rbac_policies.sql
-- Rol Bazlı Yetkilendirme (RBAC) ve RLS Politikaları

-- Mevcut politikaları temizle (Ürünler için)
DROP POLICY IF EXISTS "company_isolation_products" ON products;
DROP POLICY IF EXISTS "read_products" ON products;
DROP POLICY IF EXISTS "write_products" ON products;

-- 1. Ürünler (Products)
-- Okuma: Kendi şirketindeki herkes
CREATE POLICY "read_products" ON products
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Yazma: Kendi şirketindeki sadece admin ve manager
CREATE POLICY "write_products" ON products
  FOR ALL TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) 
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) 
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- 2. Cari Hesaplar (Accounts)
DROP POLICY IF EXISTS "company_isolation_accounts" ON accounts;
CREATE POLICY "read_accounts" ON accounts
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "write_accounts" ON accounts
  FOR ALL TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) 
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'user')
  );

-- 3. Faturalar (Invoices)
DROP POLICY IF EXISTS "company_isolation_invoices" ON invoices;
CREATE POLICY "read_invoices" ON invoices
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "write_invoices" ON invoices
  FOR ALL TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) 
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'user')
  );

-- 4. Kullanıcı Yönetimi (Admin ONLY)
DROP POLICY IF EXISTS "company_isolation_users" ON users;
CREATE POLICY "admin_all_users" ON users
  FOR ALL TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) 
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "user_read_own_profile" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());
