-- 20240314000004_fix_products_company_isolation.sql
-- Ürünler tablosuna şirket bazlı izolasyon (Multi-tenant) eklenmesi

-- 1. Kolon ekleme (Migration)
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 2. Mevcut ürünleri şirketle ilişkilendir (Tek firmalı yapı için ilk şirketi atar)
-- Not: Eğer seed data ile UUID biliniyorsa doğrudan o UUID yazılabilir.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM companies LIMIT 1) THEN
        UPDATE products SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
    END IF;
END $$;

-- 3. RLS Etkinleştirilmesi
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4. İzolasyon Politikası
DROP POLICY IF EXISTS company_isolation_products ON products;
CREATE POLICY "company_isolation_products" ON products
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
