-- Migration: Cheque & Promissory Note Module (Çek & Senet Portföy Yönetimi)
-- Date: 2026-09-08

CREATE TABLE IF NOT EXISTS cheques_notes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID REFERENCES companies(id) NOT NULL,
    type              TEXT CHECK (type IN ('cheque', 'note')) NOT NULL DEFAULT 'cheque',
    direction         TEXT CHECK (direction IN ('received', 'issued')) NOT NULL DEFAULT 'received',
    serial_number     TEXT NOT NULL,
    bank_name         TEXT,
    bank_branch       TEXT,
    account_number    TEXT,
    drawer            TEXT, -- Keşideci / Borçlu ünvanı
    account_id        UUID REFERENCES accounts(id),
    issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date          DATE NOT NULL, -- Vade tarihi
    amount            DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency          TEXT NOT NULL DEFAULT 'TRY',
    status            TEXT CHECK (status IN ('portfolio', 'endorsed', 'bank_clearing', 'bank_collateral', 'collected', 'paid', 'unpaid', 'returned')) NOT NULL DEFAULT 'portfolio',
    cash_register_id  UUID REFERENCES cash_registers(id),
    notes             TEXT,
    created_by        UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

-- RLS Enable
ALTER TABLE cheques_notes ENABLE ROW LEVEL SECURITY;

-- Company Isolation Policy
CREATE POLICY "company_isolation_cheques_notes" ON cheques_notes
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Indexing
CREATE INDEX IF NOT EXISTS idx_cheques_notes_company ON cheques_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_cheques_notes_account ON cheques_notes(account_id);
CREATE INDEX IF NOT EXISTS idx_cheques_notes_due_date ON cheques_notes(due_date);
CREATE INDEX IF NOT EXISTS idx_cheques_notes_status ON cheques_notes(status);
