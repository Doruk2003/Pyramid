-- Migration: Automatic updated_at triggers for finance tables
-- Date: 2026-08-24

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Accounts trigger
DROP TRIGGER IF EXISTS trg_update_accounts_updated_at ON accounts;
CREATE TRIGGER trg_update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Invoices trigger
DROP TRIGGER IF EXISTS trg_update_invoices_updated_at ON invoices;
CREATE TRIGGER trg_update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cash Registers trigger
DROP TRIGGER IF EXISTS trg_update_cash_registers_updated_at ON cash_registers;
CREATE TRIGGER trg_update_cash_registers_updated_at
    BEFORE UPDATE ON cash_registers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Payments trigger
DROP TRIGGER IF EXISTS trg_update_payments_updated_at ON payments;
CREATE TRIGGER trg_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Projects trigger
DROP TRIGGER IF EXISTS trg_update_projects_updated_at ON projects;
CREATE TRIGGER trg_update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
