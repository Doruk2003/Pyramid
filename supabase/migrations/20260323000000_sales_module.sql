-- 🛒 Satış Modülü (SLS)
-- Teklifler (Quotes) ve Siparişler (Orders)

-- Teklifler Tablosu
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    quote_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    status TEXT CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')) DEFAULT 'draft',
    subtotal DECIMAL(18,2) DEFAULT 0,
    vat_total DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    exchange_rate DECIMAL(10,6) DEFAULT 1,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, quote_number)
);

-- Teklif Satırları
CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT,
    quantity DECIMAL(18,4) NOT NULL,
    unit_price DECIMAL(18,4) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 20,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Siparişler Tablosu
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL, -- Eğer tekliften dönüştüyse
    order_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT CHECK (status IN ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed')) DEFAULT 'draft',
    subtotal DECIMAL(18,2) DEFAULT 0,
    vat_total DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    exchange_rate DECIMAL(10,6) DEFAULT 1,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, order_number)
);

-- Sipariş Satırları
CREATE TABLE IF NOT EXISTS order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT,
    quantity DECIMAL(18,4) NOT NULL,
    unit_price DECIMAL(18,4) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 20,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Politikaları
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;

-- Teklifler Politikaları
CREATE POLICY "şirket_izolasyonu_quotes" ON quotes
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "şirket_izolasyonu_quote_lines" ON quote_lines
    FOR ALL USING (quote_id IN (SELECT id FROM quotes WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())));

-- Siparişler Politikaları
CREATE POLICY "şirket_izolasyonu_orders" ON orders
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "şirket_izolasyonu_order_lines" ON order_lines
    FOR ALL USING (order_id IN (SELECT id FROM orders WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())));

-- Otomatik Sıra No Yardımı ve Indexler
CREATE INDEX idx_quotes_company_date ON quotes(company_id, issue_date DESC);
CREATE INDEX idx_orders_company_date ON orders(company_id, issue_date DESC);
CREATE INDEX idx_quotes_account ON quotes(account_id);
CREATE INDEX idx_orders_account ON orders(account_id);
