-- Migration: Add current_exchange_rates view and index on effective_date
-- Date: 2026-08-28

-- Index for efficient date lookup and sorting
CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective_date
    ON exchange_rates(currency_id, effective_date DESC);

-- View representing the latest exchange rate for each currency
CREATE OR REPLACE VIEW current_exchange_rates WITH (security_invoker = true) AS
SELECT DISTINCT ON (currency_id)
    id,
    company_id,
    currency_id,
    rate,
    effective_date,
    notes,
    created_by,
    created_at,
    valid_date
FROM exchange_rates
ORDER BY currency_id, effective_date DESC;
