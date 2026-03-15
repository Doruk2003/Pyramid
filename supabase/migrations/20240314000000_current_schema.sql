-- 00_CURRENT_SCHEMA.sql
-- Mevcut manuel oluşturulmuş tabloların dökümü (Snapshot)

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL
);

-- Currencies
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  code TEXT NOT NULL,
  name TEXT NOT NULL
);

-- Types
CREATE TABLE IF NOT EXISTS types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  price NUMERIC DEFAULT 0,
  "inventoryStatus" TEXT,
  rating INTEGER,
  category_id UUID REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  type_id UUID REFERENCES types(id),
  currency_id UUID REFERENCES currencies(id),
  tax_rate INTEGER,
  price_unit TEXT,
  min_stock INTEGER,
  max_stock INTEGER,
  barcode TEXT,
  initial_stock INTEGER,
  status TEXT,
  images TEXT[]
);
