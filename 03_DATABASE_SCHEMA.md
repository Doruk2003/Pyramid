# 🗄️ VERİTABANI ŞEMASI — Supabase / PostgreSQL

## Genel Kurallar

- Tüm tablolarda `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Tüm tablolarda `created_at`, `updated_at`, `deleted_at` (soft delete)
- `company_id` ile multi-tenant yapı
- Supabase RLS (Row Level Security) her tablo için aktif
- Tüm foreign key'ler `ON DELETE RESTRICT` (veri bütünlüğü)

---

## Schema: `public`

### 🏢 Temel Tablolar

```sql
-- Şirketler (Multi-tenant)
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  tax_number  TEXT UNIQUE,
  address     JSONB,
  settings    JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Kullanıcılar (Supabase Auth ile entegre)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id  UUID REFERENCES companies(id),
  full_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT CHECK (role IN ('admin','manager','user','viewer')),
  permissions JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 📦 Stok & Ürün Tabloları (INV)

```sql
-- Ürün kategorileri
CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES product_categories(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ürünler
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id),
  category_id   UUID REFERENCES product_categories(id),
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL, -- adet, kg, lt, m2...
  purchase_price DECIMAL(18,4) DEFAULT 0,
  sale_price    DECIMAL(18,4) DEFAULT 0,
  vat_rate      DECIMAL(5,2) DEFAULT 18,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- Depolar
CREATE TABLE warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id),
  name        TEXT NOT NULL,
  location    TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stok hareketleri
CREATE TABLE stock_movements (
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
CREATE MATERIALIZED VIEW stock_balances AS
SELECT
  product_id,
  warehouse_id,
  company_id,
  SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE -quantity END) as balance
FROM stock_movements
GROUP BY product_id, warehouse_id, company_id;
```

---

### 💰 Finans Tabloları (FIN)

```sql
-- Cari hesaplar (müşteri/tedarikçi)
CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id),
  account_type  TEXT CHECK (account_type IN ('customer','supplier','both')),
  name          TEXT NOT NULL,
  tax_number    TEXT,
  email         TEXT,
  phone         TEXT,
  address       JSONB,
  credit_limit  DECIMAL(18,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Faturalar
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  invoice_type    TEXT CHECK (invoice_type IN ('sale','purchase','return_sale','return_purchase')),
  invoice_number  TEXT NOT NULL,
  account_id      UUID REFERENCES accounts(id),
  issue_date      DATE NOT NULL,
  due_date        DATE,
  status          TEXT CHECK (status IN ('draft','issued','paid','cancelled')) DEFAULT 'draft',
  subtotal        DECIMAL(18,2) DEFAULT 0,
  vat_total       DECIMAL(18,2) DEFAULT 0,
  total           DECIMAL(18,2) DEFAULT 0,
  paid_amount     DECIMAL(18,2) DEFAULT 0,
  currency        TEXT DEFAULT 'TRY',
  exchange_rate   DECIMAL(10,6) DEFAULT 1,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- Fatura kalemleri
CREATE TABLE invoice_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  description   TEXT,
  quantity      DECIMAL(18,4) NOT NULL,
  unit_price    DECIMAL(18,4) NOT NULL,
  vat_rate      DECIMAL(5,2) DEFAULT 18,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  line_total    DECIMAL(18,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tahsilatlar/Ödemeler
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  invoice_id      UUID REFERENCES invoices(id),
  account_id      UUID REFERENCES accounts(id),
  payment_date    DATE NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,
  payment_method  TEXT CHECK (payment_method IN ('cash','bank','check','credit_card')),
  description     TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 👥 İnsan Kaynakları (HR)

```sql
-- Çalışanlar
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  user_id         UUID REFERENCES users(id),
  employee_number TEXT,
  department      TEXT,
  position        TEXT,
  hire_date       DATE,
  salary          DECIMAL(18,2),
  salary_type     TEXT CHECK (salary_type IN ('monthly','hourly','daily')),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- İzinler
CREATE TABLE leaves (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id),
  employee_id   UUID REFERENCES employees(id),
  leave_type    TEXT CHECK (leave_type IN ('annual','sick','unpaid','maternity')),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days          INTEGER,
  status        TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  approved_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Row Level Security (RLS) Örneği

```sql
-- Her kullanıcı sadece kendi şirketinin verilerini görsün
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON invoices
  USING (company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));
```

---

## Index Stratejisi

```sql
-- Sık sorgulanan kolonlar için index
CREATE INDEX idx_invoices_company_date ON invoices(company_id, issue_date DESC);
CREATE INDEX idx_invoices_account ON invoices(account_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, warehouse_id);
CREATE INDEX idx_products_code ON products(company_id, code);
```
