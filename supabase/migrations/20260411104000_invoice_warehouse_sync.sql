-- Migration: Add warehouse tracking to invoices and sync with stock movements
-- 20260411104000_invoice_warehouse_sync.sql

-- 1) Add warehouse_id to invoices (Header level default)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- 2) Add warehouse_id to invoice_lines (Line level override)
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- 3) Function to manage stock movements for invoices
CREATE OR REPLACE FUNCTION sync_invoice_to_stock_movements()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice RECORD;
    v_line RECORD;
    v_movement_type TEXT;
    v_company_id UUID;
BEGIN
    -- Only proceed if the invoice is 'issued' or 'paid'
    -- If it's 'draft' or 'cancelled', we should ensure no movements exist
    
    -- If triggered from invoices table
    IF TG_TABLE_NAME = 'invoices' THEN
        v_invoice := NEW;
        v_company_id := NEW.company_id;
        
        -- If status changed to something other than issued/paid, or deleted
        IF (v_invoice.status NOT IN ('issued', 'paid') OR v_invoice.deleted_at IS NOT NULL) THEN
            DELETE FROM stock_movements WHERE reference_type = 'invoice' AND reference_id = v_invoice.id;
            RETURN NEW;
        END IF;

        -- Determine movement type
        IF v_invoice.invoice_type = 'purchase' THEN v_movement_type := 'in';
        ELSIF v_invoice.invoice_type = 'sale' THEN v_movement_type := 'out';
        ELSIF v_invoice.invoice_type = 'return_purchase' THEN v_movement_type := 'out';
        ELSIF v_invoice.invoice_type = 'return_sale' THEN v_movement_type := 'in';
        ELSE RETURN NEW; -- Unknown type
        END IF;

        -- Re-sync all lines for this invoice
        -- First clear existing invoice-level movements to be safe (or update? clear is simpler for state sync)
        DELETE FROM stock_movements WHERE reference_type = 'invoice' AND reference_id = v_invoice.id;

        FOR v_line IN SELECT * FROM invoice_lines WHERE invoice_id = v_invoice.id LOOP
            INSERT INTO stock_movements (
                company_id,
                product_id,
                warehouse_id,
                movement_type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                note,
                created_by
            ) VALUES (
                v_company_id,
                v_line.product_id,
                COALESCE(v_line.warehouse_id, v_invoice.warehouse_id),
                v_movement_type,
                v_line.quantity,
                v_line.unit_price,
                'invoice',
                v_invoice.id,
                'Invoice: ' || v_invoice.invoice_number,
                v_invoice.created_by
            );
        END LOOP;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Trigger for invoices table
DROP TRIGGER IF EXISTS trg_sync_invoice_stock ON invoices;
CREATE TRIGGER trg_sync_invoice_stock
AFTER UPDATE OF status, warehouse_id, deleted_at ON invoices
FOR EACH ROW
EXECUTE FUNCTION sync_invoice_to_stock_movements();

-- 5) Trigger for invoice_lines table
-- When lines change, if invoice is already issued, we need to re-sync
CREATE OR REPLACE FUNCTION handle_invoice_line_change()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    IF v_status IN ('issued', 'paid') THEN
        -- Trigger a dummy update on invoice to fire the sync trigger
        UPDATE invoices SET updated_at = NOW() WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_line_stock_sync ON invoice_lines;
CREATE TRIGGER trg_invoice_line_stock_sync
AFTER INSERT OR UPDATE OR DELETE ON invoice_lines
FOR EACH ROW
EXECUTE FUNCTION handle_invoice_line_change();
