-- ============================================================
-- Migration: PRJ Modülü — Proje Yönetimi
-- Tarih: 2026-04-18
-- Açıklama: projects tablosu + kategorili bütçe +
--           invoices ve stock_movements'a project_id boyutu
-- NOT: Tamamen idempotent — tekrar çalıştırılabilir
-- ============================================================

-- 1) Proje durumu enum (zaten varsa atla)
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2) projects tablosu (zaten varsa atla)
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    location        TEXT,
    client_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
    status          project_status NOT NULL DEFAULT 'planning',
    start_date      DATE,
    end_date        DATE,

    -- Kategorili bütçe
    budget_material  NUMERIC(18,2) NOT NULL DEFAULT 0,
    budget_labor     NUMERIC(18,2) NOT NULL DEFAULT 0,
    budget_equipment NUMERIC(18,2) NOT NULL DEFAULT 0,
    budget_general   NUMERIC(18,2) NOT NULL DEFAULT 0,

    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE constraint (zaten varsa atla)
DO $$ BEGIN
    ALTER TABLE projects ADD CONSTRAINT projects_company_id_code_key UNIQUE (company_id, code);
EXCEPTION
    WHEN duplicate_table THEN NULL;   -- "duplicate_table" aslında constraint için de çalışır
    WHEN duplicate_object THEN NULL;
END $$;

-- 3) RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy (zaten varsa yeniden oluştur)
DROP POLICY IF EXISTS "projects_company_isolation" ON projects;
CREATE POLICY "projects_company_isolation" ON projects
    FOR ALL USING (company_id = get_auth_user_company_id());

-- 4) İndeksler (IF NOT EXISTS ile)
CREATE INDEX IF NOT EXISTS idx_projects_company_id  ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id   ON projects(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at  ON projects(deleted_at) WHERE deleted_at IS NULL;

-- 5) invoices.project_id (ADD COLUMN IF NOT EXISTS)
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id
    ON invoices(project_id) WHERE project_id IS NOT NULL;

-- 6) stock_movements.project_id (ADD COLUMN IF NOT EXISTS)
ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_project_id
    ON stock_movements(project_id) WHERE project_id IS NOT NULL;

-- 7) Proje maliyet özeti view (DROP + CREATE = idempotent)
DROP VIEW IF EXISTS project_cost_summary;

CREATE VIEW project_cost_summary AS
SELECT
    p.id,
    p.company_id,
    p.code,
    p.name,
    p.location,
    p.status,
    p.budget_material,
    p.budget_labor,
    p.budget_equipment,
    p.budget_general,
    (p.budget_material + p.budget_labor + p.budget_equipment + p.budget_general) AS total_budget,
    COALESCE(
        SUM(i.total) FILTER (WHERE i.invoice_type = 'purchase' AND i.deleted_at IS NULL),
        0
    ) AS actual_cost,
    COALESCE(
        SUM(i.total) FILTER (WHERE i.invoice_type = 'sale' AND i.deleted_at IS NULL),
        0
    ) AS actual_revenue,
    p.is_active,
    p.start_date,
    p.end_date,
    p.client_id,
    p.created_at
FROM projects p
LEFT JOIN invoices i ON i.project_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY
    p.id, p.company_id, p.code, p.name, p.location, p.status,
    p.budget_material, p.budget_labor, p.budget_equipment, p.budget_general,
    p.is_active, p.start_date, p.end_date, p.client_id, p.created_at;
