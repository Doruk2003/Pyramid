import { StockBalance } from '@/modules/inventory/domain/stock-balance.entity';
import { StockMovement } from '@/modules/inventory/domain/stock-movement.entity';
import { Warehouse } from '@/modules/inventory/domain/warehouse.entity';
import { SupabaseInventoryRepository } from '@/modules/inventory/infra/supabase-inventory.repository';
import { defineStore } from 'pinia';
import { ListWarehousesUseCase } from './list-warehouses.usecase';
import { SaveMovementUseCase } from './save-movement.usecase';

const invRepo = new SupabaseInventoryRepository();
const listWarehousesUseCase = new ListWarehousesUseCase(invRepo);
const saveMovementUseCase = new SaveMovementUseCase(invRepo);

export const useInventoryStore = defineStore('inventory', {
    state: () => ({
        warehouses: [] as Warehouse[],
        movements: [] as StockMovement[],
        balances: [] as StockBalance[],
        loading: false
    }),

    getters: {
        getTotalBalance: (state) => (productId: string): number => {
            return state.balances
                .filter(b => b.productId === productId)
                .reduce((sum, b) => sum + b.balance, 0);
        }
    },

    actions: {
        async fetchWarehouses() {
            this.loading = true;
            const result = await listWarehousesUseCase.execute();
            if (result.success) this.warehouses = result.data;
            this.loading = false;
        },

        async addWarehouse(warehouse: Warehouse) {
            const result = await invRepo.saveWarehouse(warehouse);
            if (result.success) await this.fetchWarehouses();
            return result;
        },

        async deleteWarehouse(id: string) {
            const result = await invRepo.deleteWarehouse(id);
            if (result.success) {
                this.warehouses = this.warehouses.filter((w) => w.id !== id);
            }
            return result;
        },

        async fetchMovements(productId?: string) {
            this.loading = true;
            const result = await invRepo.getStockMovements(productId);
            if (result.success) this.movements = result.data;
            this.loading = false;
        },

        async fetchBalances() {
            this.loading = true;
            const result = await invRepo.getStockBalances();
            if (result.success) this.balances = result.data;
            this.loading = false;
        },

        async addMovement(movement: StockMovement) {
            const result = await saveMovementUseCase.execute(movement);
            if (result.success) {
                await this.fetchBalances();
            }
            return result;
        },

        async addMovements(movements: StockMovement[]) {
            const result = await saveMovementUseCase.execute(movements);
            if (result.success) {
                await this.fetchBalances();
            }
            return result;
        }
    }
});
