-- 03_INVENTORY_MODULE.sql
-- INV Modülü: Depolar ve Stok Hareketleri

-- Depolar
CREATE TABLE IF NOT EXISTS warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id),
  name        TEXT NOT NULL,
  location    TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stok hareketleri
CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  product_id      UUID REFERENCES products(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  movement_type   TEXT CHECK (movement_type IN ('in','out','transfer','adjustment')),
  quantity        DECIMAL(18,4) NOT NULL,
  unit_cost       DECIMAL(18,4),
  reference_type  TEXT, -- invoice, purchase_order, transfer
  reference_id    UUID,
  note            TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Stok bakiye view (materialized)
-- Not: Her hareket sonrası 'REFRESH MATERIALIZED VIEW stock_balances' çalıştırılmalıdır veya normal VIEW kullanılabilir.
CREATE OR REPLACE VIEW stock_balances AS
SELECT
  product_id,
  warehouse_id,
  company_id,
  SUM(CASE WHEN movement_type IN ('in', 'adjustment') THEN quantity ELSE -quantity END) as balance
FROM stock_movements
GROUP BY product_id, warehouse_id, company_id;

-- RLS Aktifleştirme
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Politikalar
CREATE POLICY "company_isolation_warehouses" ON warehouses USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "company_isolation_stock_movements" ON stock_movements USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
