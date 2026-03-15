import { defineStore } from 'pinia';
import type { Warehouse } from '@/modules/inventory/domain/warehouse.entity';
import type { StockMovement } from '@/modules/inventory/domain/stock-movement.entity';
import { SupabaseInventoryRepository } from '@/modules/inventory/infra/supabase-inventory.repository';
import { ListWarehousesUseCase } from './list-warehouses.usecase';
import { SaveMovementUseCase } from './save-movement.usecase';

const invRepo = new SupabaseInventoryRepository();
const listWarehousesUseCase = new ListWarehousesUseCase(invRepo);
const saveMovementUseCase = new SaveMovementUseCase(invRepo);

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    warehouses: [] as Warehouse[],
    movements: [] as StockMovement[],
    balances: [] as any[],
    loading: false
  }),

  actions: {
    async fetchWarehouses() {
      this.loading = true;
      const result = await listWarehousesUseCase.execute();
      if (result.success) this.warehouses = result.data;
      this.loading = false;
    },

    async addWarehouse(warehouse: Warehouse) {
      return await invRepo.saveWarehouse(warehouse); // Warehouse için bir UseCase eklenebilir
    },

    async fetchMovements(productId?: string) {
      this.loading = true;
      const result = await invRepo.getStockMovements(productId); // Movement listesi için bir UseCase eklenebilir
      if (result.success) this.movements = result.data;
      this.loading = false;
    },

    async fetchBalances() {
      this.loading = true;
      const result = await invRepo.getStockBalances(); // Balance için bir UseCase eklenebilir
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


