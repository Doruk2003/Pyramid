-- ============================================================
-- Migration: PRJ Modülü — Proje Yönetimi
-- Tarih: 2026-04-18
-- Açıklama: projects tablosu + kategorili bütçe +
--           invoices ve stock_movements'a project_id boyutu
-- ============================================================

-- 1) Proje durumu enum
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'suspended');

-- 2) projects tablosu
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    location        TEXT,
    client_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- İşveren / Proje sahibi
    status          project_status NOT NULL DEFAULT 'planning',
    start_date      DATE,
    end_date        DATE,

    -- Kategorili bütçe (Soru 9 — kategorili)
    budget_material  NUMERIC(18,2) NOT NULL DEFAULT 0,  -- Malzeme
    budget_labor     NUMERIC(18,2) NOT NULL DEFAULT 0,  -- İşçilik
    budget_equipment NUMERIC(18,2) NOT NULL DEFAULT 0,  -- Ekipman
    budget_general   NUMERIC(18,2) NOT NULL DEFAULT 0,  -- Genel Gider

    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (company_id, code)
);

-- 3) RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_company_isolation" ON projects
    FOR ALL USING (company_id = get_auth_user_company_id());

-- 4) Hız indeksleri
CREATE INDEX idx_projects_company_id  ON projects(company_id);
CREATE INDEX idx_projects_client_id   ON projects(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_projects_status      ON projects(status);
CREATE INDEX idx_projects_deleted_at  ON projects(deleted_at) WHERE deleted_at IS NULL;

-- 5) invoices tablosuna project_id eklenir (opsiyonel)
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id
    ON invoices(project_id) WHERE project_id IS NOT NULL;

-- 6) stock_movements tablosuna project_id eklenir (opsiyonel)
ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_project_id
    ON stock_movements(project_id) WHERE project_id IS NOT NULL;

-- 7) Proje maliyet özeti view'ı (raporlama)
--    Gerçek harcama = projeye bağlı alış faturaları toplamı
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
        SUM(i.total) FILTER (WHERE i.invoice_type = 'sales' AND i.deleted_at IS NULL),
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
  AND p.company_id = get_auth_user_company_id()
GROUP BY
    p.id, p.company_id, p.code, p.name, p.location, p.status,
    p.budget_material, p.budget_labor, p.budget_equipment, p.budget_general,
    p.is_active, p.start_date, p.end_date, p.client_id, p.created_at;
