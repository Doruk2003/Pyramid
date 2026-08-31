-- Migration: cash_registers_with_balance view for DB-side balance calculation
-- Date: 2026-08-24

CREATE OR REPLACE VIEW cash_registers_with_balance WITH (security_invoker = true) AS
SELECT 
    cr.id,
    cr.company_id,
    cr.name,
    cr.type,
    cr.currency,
    cr.description,
    cr.is_active,
    cr.created_at,
    cr.updated_at,
    COALESCE(
        SUM(
            CASE 
                WHEN p.payment_type = 'collection' AND p.status = 'completed' THEN p.amount
                WHEN p.payment_type = 'payment' AND p.status = 'completed' THEN -p.amount
                ELSE 0
            END
        ), 
        0
    )::numeric(18,2) AS balance
FROM cash_registers cr
LEFT JOIN payments p ON p.cash_register_id = cr.id
GROUP BY 
    cr.id, 
    cr.company_id, 
    cr.name, 
    cr.type, 
    cr.currency, 
    cr.description, 
    cr.is_active, 
    cr.created_at, 
    cr.updated_at;
