-- inventory_counts tablosu
-- Her envanter sayım oturumunu kayıt altına alır.
-- Stok hareketleri bu kaydın id'sini reference_id olarak kullanır.

CREATE TABLE IF NOT EXISTS inventory_counts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id  UUID REFERENCES warehouses(id),
  counted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES users(id),
  note          TEXT,
  item_count    INT NOT NULL DEFAULT 0,  -- kaç kalem değişti
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- inventory_count_items: her ürün için sayım detayı
CREATE TABLE IF NOT EXISTS inventory_count_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id        UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  system_qty      DECIMAL(18,4) NOT NULL DEFAULT 0,
  counted_qty     DECIMAL(18,4) NOT NULL DEFAULT 0,
  difference      DECIMAL(18,4) GENERATED ALWAYS AS (counted_qty - system_qty) STORED
);

-- RLS
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_inventory_counts"
  ON inventory_counts
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_isolation_inventory_count_items"
  ON inventory_count_items
  USING (
    count_id IN (
      SELECT id FROM inventory_counts
      WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );
