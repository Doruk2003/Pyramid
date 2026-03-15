-- 01_INITIAL_SCHEMA.sql
-- ADM Modülü: Şirketler ve Kullanıcılar

-- Şirketler (Multi-tenant)
CREATE TABLE IF NOT EXISTS companies (
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
CREATE TABLE IF NOT EXISTS users (
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

-- Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politikalar
-- Not: Bu politikalar dökümandaki mantığa göre örneklenmiştir.
CREATE POLICY "company_isolation_companies" ON companies
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_isolation_users" ON users
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
