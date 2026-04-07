import { supabase } from '@/lib/supabase';
import { Warehouse } from '@/modules/inventory/domain/warehouse.entity';
import { StockMovement, type MovementType } from '@/modules/inventory/domain/stock-movement.entity';
import type { StockBalance } from '@/modules/inventory/domain/stock-balance.entity';
import type { IInventoryRepository } from '@/modules/inventory/domain/inventory.repository';
import { ok, err, type Result } from '@/shared/types/result';
import type { DbWarehouse, DbStockMovement } from '@/shared/infra/db-types';

interface DbStockBalance {
    product_id: string;
    warehouse_id: string;
    company_id: string;
    balance: number;
}

export class SupabaseInventoryRepository implements IInventoryRepository {
    async getWarehouses(): Promise<Result<Warehouse[]>> {
        // Soft-delete: silinmiş depolar gösterilmez
        const { data, error } = await supabase
            .from('warehouses')
            .select('*')
            .eq('is_active', true)
            .is('deleted_at', null);
        if (error) return err(new Error(error.message));
        return ok(
            ((data as DbWarehouse[]) || []).map((row: DbWarehouse) =>
                Warehouse.create({
                    id: row.id,
                    companyId: row.company_id,
                    name: row.name,
                    location: row.location,
                    isActive: row.is_active,
                    createdAt: new Date(row.created_at)
                })
            )
        );
    }

    async deleteWarehouse(id: string): Promise<Result<void>> {
        // Soft delete: depo fiziksel olarak silinmez.
        // Stok hareketleri ve geçmiş kayıtlar korunur.
        const { error } = await supabase
            .from('warehouses')
            .update({ is_active: false, deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async saveWarehouse(warehouse: Warehouse): Promise<Result<void>> {
        const obj = warehouse.toObject();
        const { error } = await supabase.from('warehouses').upsert({
            id: obj.id || undefined,
            company_id: obj.companyId,
            name: obj.name,
            location: obj.location,
            is_active: obj.isActive
        });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async getStockMovements(productId?: string): Promise<Result<StockMovement[]>> {
        let query = supabase.from('stock_movements').select('*');
        if (productId) query = query.eq('product_id', productId);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) return err(new Error(error.message));

        return ok(
            ((data as DbStockMovement[]) || []).map((row: DbStockMovement) =>
                StockMovement.create({
                    id: row.id,
                    companyId: row.company_id,
                    productId: row.product_id,
                    warehouseId: row.warehouse_id,
                    movementType: row.movement_type as MovementType,
                    quantity: Number(row.quantity),
                    unitCost: row.unit_cost ? Number(row.unit_cost) : undefined,
                    referenceType: row.reference_type,
                    referenceId: row.reference_id,
                    note: row.note,
                    createdBy: row.created_by,
                    createdAt: new Date(row.created_at)
                })
            )
        );
    }

    async saveStockMovement(movement: StockMovement): Promise<Result<void>> {
        const obj = movement.toObject();
        const { error } = await supabase.from('stock_movements').insert({
            product_id: obj.productId,
            company_id: obj.companyId,
            warehouse_id: obj.warehouseId,
            movement_type: obj.movementType,
            quantity: obj.quantity,
            unit_cost: obj.unitCost,
            reference_type: obj.referenceType,
            reference_id: obj.referenceId,
            note: obj.note,
            created_by: obj.createdBy
        });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async saveStockMovements(movements: StockMovement[]): Promise<Result<void>> {
        const payloads = movements.map((m) => {
            const obj = m.toObject();
            return {
                product_id: obj.productId,
                company_id: obj.companyId,
                warehouse_id: obj.warehouseId,
                movement_type: obj.movementType,
                quantity: obj.quantity,
                unit_cost: obj.unitCost,
                reference_type: obj.referenceType,
                reference_id: obj.referenceId,
                note: obj.note,
                created_by: obj.createdBy
            };
        });
        const { error } = await supabase.from('stock_movements').insert(payloads);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async getStockBalances(): Promise<Result<StockBalance[]>> {
        const { data, error } = await supabase.from('stock_balances').select('*');
        if (error) return err(new Error(error.message));
        const rows = (data as DbStockBalance[]) || [];
        return ok(
            rows.map((row) => ({
                productId: row.product_id,
                warehouseId: row.warehouse_id,
                companyId: row.company_id,
                balance: Number(row.balance)
            }))
        );
    }
}
