import { supabase } from '@/lib/supabase';
import { Warehouse } from '@/modules/inventory/domain/warehouse.entity';
import { StockMovement, type MovementType } from '@/modules/inventory/domain/stock-movement.entity';
import { InventoryCount, type InventoryCountItemProps } from '@/modules/inventory/domain/inventory-count.entity';
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

    async saveInventoryCount(count: {
        id: string;
        companyId: string;
        warehouseId: string;
        createdBy: string;
        note?: string;
        itemCount: number;
        items: InventoryCountItemProps[];
    }): Promise<Result<string>> {
        // Ana sayım kaydını oluştur
        const { error: countError } = await supabase.from('inventory_counts').insert({
            id: count.id,
            company_id: count.companyId,
            warehouse_id: count.warehouseId,
            created_by: count.createdBy,
            note: count.note || null,
            item_count: count.itemCount,
            counted_at: new Date().toISOString()
        });
        if (countError) return err(new Error(countError.message));

        // Kalem detaylarını kaydet
        if (count.items.length > 0) {
            const itemPayloads = count.items.map((item) => ({
                id: item.id,
                count_id: count.id,
                product_id: item.productId,
                system_qty: item.systemQty,
                counted_qty: item.countedQty
            }));
            const { error: itemsError } = await supabase.from('inventory_count_items').insert(itemPayloads);
            if (itemsError) return err(new Error(itemsError.message));
        }

        return ok(count.id);
    }

    async getInventoryCountById(id: string): Promise<Result<InventoryCount | null>> {
        const { data: countData, error: countError } = await supabase
            .from('inventory_counts')
            .select('*')
            .eq('id', id)
            .single();
        if (countError) return err(new Error(countError.message));
        if (!countData) return ok(null);

        const { data: itemsData, error: itemsError } = await supabase
            .from('inventory_count_items')
            .select('*')
            .eq('count_id', id);
        if (itemsError) return err(new Error(itemsError.message));

        const items: InventoryCountItemProps[] = ((itemsData as any[]) || []).map((row) => ({
            id: row.id,
            countId: row.count_id,
            productId: row.product_id,
            systemQty: Number(row.system_qty),
            countedQty: Number(row.counted_qty),
            difference: Number(row.difference)
        }));

        return ok(
            InventoryCount.create({
                id: countData.id,
                companyId: countData.company_id,
                warehouseId: countData.warehouse_id,
                countedAt: new Date(countData.counted_at),
                createdBy: countData.created_by,
                note: countData.note,
                itemCount: countData.item_count,
                createdAt: new Date(countData.created_at),
                items
            })
        );
    }

    /** Belirli bir referansa bağlı tüm stok hareketlerini siler */
    async deleteStockMovementsByReference(referenceType: string, referenceId: string): Promise<Result<void>> {
        const { error } = await supabase
            .from('stock_movements')
            .delete()
            .eq('reference_type', referenceType)
            .eq('reference_id', referenceId);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    /** Sayım kalemlerini günceller: eski hareketleri siler, yeni hareketler yazar */
    async updateInventoryCount(
        countId: string,
        companyId: string,
        warehouseId: string,
        createdBy: string,
        updatedItems: InventoryCountItemProps[]
    ): Promise<Result<void>> {
        // 1) Eski stok hareketlerini sil
        const delResult = await this.deleteStockMovementsByReference('count', countId);
        if (!delResult.success) return delResult;

        // 2) count_items güncelle
        for (const item of updatedItems) {
            const { error } = await supabase
                .from('inventory_count_items')
                .update({ counted_qty: item.countedQty })
                .eq('id', item.id);
            if (error) return err(new Error(error.message));
        }

        // 3) item_count güncelle
        const diffItems = updatedItems.filter(i => (i.countedQty - i.systemQty) !== 0);
        await supabase
            .from('inventory_counts')
            .update({ item_count: diffItems.length })
            .eq('id', countId);

        // 4) Yeni stok hareketlerini oluştur (sadece fark olanlar)
        const now = new Date();
        const movements = diffItems.map((item) => {
            const diff = item.countedQty - item.systemQty;
            return {
                id: crypto.randomUUID(),
                company_id: companyId,
                product_id: item.productId,
                warehouse_id: warehouseId,
                movement_type: diff > 0 ? 'in' : 'out',
                quantity: Math.abs(diff),
                reference_type: 'count',
                reference_id: countId,
                note: `Envanter Sayım Düzeltmesi (Sistem: ${item.systemQty}, Sayılan: ${item.countedQty})`,
                created_by: createdBy,
                created_at: now.toISOString()
            };
        });

        if (movements.length > 0) {
            const { error } = await supabase.from('stock_movements').insert(movements);
            if (error) return err(new Error(error.message));
        }

        return ok(undefined);
    }

    /** Sayım kaydını ve bağlı tüm stok hareketlerini siler */
    async deleteInventoryCount(countId: string): Promise<Result<void>> {
        // Önce stok hareketlerini geri al
        const delMov = await this.deleteStockMovementsByReference('count', countId);
        if (!delMov.success) return delMov;

        // Sonra sayım kaydını sil (CASCADE → count_items da silinir)
        const { error } = await supabase
            .from('inventory_counts')
            .delete()
            .eq('id', countId);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
