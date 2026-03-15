-- 20240315000001_stock_balances_materialized_view.sql
-- stock_balances VIEW -> MATERIALIZED VIEW + Otomatik Yenileme Trigger'ı
-- Büyük veri setlerinde sorgu performansını kritik ölçüde artırır.

-- 1. Mevcut VIEW'ı kaldır
DROP VIEW IF EXISTS stock_balances;

-- 2. MATERIALIZED VIEW oluştur
CREATE MATERIALIZED VIEW IF NOT EXISTS stock_balances AS
SELECT
  product_id,
  warehouse_id,
  company_id,
  SUM(
    CASE
      WHEN movement_type IN ('in', 'adjustment') THEN quantity
      ELSE -quantity
    END
  ) AS balance
FROM stock_movements
GROUP BY product_id, warehouse_id, company_id;

-- 3. Hızlı sorgular için index
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_balances_unique
  ON stock_balances(product_id, warehouse_id, company_id);

CREATE INDEX IF NOT EXISTS idx_stock_balances_company
  ON stock_balances(company_id);

-- 4. View'ı otomatik yenileyen trigger fonksiyonu
CREATE OR REPLACE FUNCTION refresh_stock_balances()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stock_balances;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Her stok hareketi kaydında tetiklen
DROP TRIGGER IF EXISTS trg_refresh_stock_balances ON stock_movements;

CREATE TRIGGER trg_refresh_stock_balances
  AFTER INSERT OR UPDATE OR DELETE
  ON stock_movements
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_stock_balances();
