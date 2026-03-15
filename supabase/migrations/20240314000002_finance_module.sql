-- 02_FINANCE_MODULE.sql
-- FIN Modülü: Cari Hesaplar, Faturalar ve Tahsilatlar

-- Cari hesaplar (müşteri/tedarikçi)
CREATE TABLE IF NOT EXISTS accounts (
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
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  invoice_type    TEXT CHECK (invoice_type IN ('sale','purchase','return_sale','return_purchase')),
  invoice_number  TEXT NOT NULL,
  account_id      UUID REFERENCES accounts(id),
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  status          TEXT CHECK (status IN ('draft','issued','paid','cancelled')) DEFAULT 'draft',
  subtotal        DECIMAL(18,2) DEFAULT 0,
  vat_total       DECIMAL(18,2) DEFAULT 0,
  total           DECIMAL(18,2) DEFAULT 0,
  paid_amount     DECIMAL(18,2) DEFAULT 0,
  currency        TEXT DEFAULT 'TRY',
  exchange_rate   DECIMAL(10,6) DEFAULT 1,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- Fatura kalemleri
CREATE TABLE IF NOT EXISTS invoice_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  description   TEXT,
  quantity      DECIMAL(18,4) NOT NULL,
  unit_price    DECIMAL(18,4) NOT NULL,
  vat_rate      DECIMAL(5,2) DEFAULT 20,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  line_total    DECIMAL(18,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tahsilatlar/Ödemeler
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  invoice_id      UUID REFERENCES invoices(id),
  account_id      UUID REFERENCES accounts(id),
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount          DECIMAL(18,2) NOT NULL,
  payment_method  TEXT CHECK (payment_method IN ('cash','bank','check','credit_card')),
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Aktifleştirme
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Temel İzolasyon Politikaları
CREATE POLICY "company_isolation_accounts" ON accounts USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "company_isolation_invoices" ON invoices USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "company_isolation_invoice_lines" ON invoice_lines USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_lines.invoice_id AND invoices.company_id = (SELECT company_id FROM users WHERE id = auth.uid())));
CREATE POLICY "company_isolation_payments" ON payments USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
