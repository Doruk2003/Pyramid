-- Kasalar/Bankalar Tablosu
CREATE TABLE IF NOT EXISTS cash_registers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  type          TEXT CHECK (type IN ('cash', 'bank', 'check_note', 'credit_card')) NOT NULL,
  currency      TEXT DEFAULT 'TRY',
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS cash_registers
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON cash_registers
  USING (company_id = get_auth_user_company_id())
  WITH CHECK (company_id = get_auth_user_company_id());

-- payments tablosunu genisletme
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('collection', 'payment', 'debit_note', 'credit_note')),
  ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- payments tablosuna default degerler atama (eski veriler icin)
UPDATE payments 
SET payment_type = CASE 
  WHEN payment_method = 'cash' THEN 'collection'::text
  ELSE 'collection'::text
END
WHERE payment_type IS NULL;

-- payments audit log trigger'i varsa cash_registers icin de universal trigger veya benzeri ekleme ihtiyaci olabilir.
-- 08_PROGRESS.md dosyasinda 7 kritik tabloya audit log trigger'i eklendigi belirtilmis.
-- payments zaten audit_logs kapsamindaydi (payments schema'da var miydi? progress'te 'accounts, invoices, orders, products, quotes, stock_movements, warehouses' deniyor. payments yokmus.)
