import type { Warehouse } from '@/modules/inventory/domain/warehouse.entity';
import type { StockMovement } from '@/modules/inventory/domain/stock-movement.entity';
import type { StockBalance } from '@/modules/inventory/domain/stock-balance.entity';
import type { Result } from '@/shared/types/result';

export interface IInventoryRepository {
    getWarehouses(): Promise<Result<Warehouse[]>>;
    saveWarehouse(warehouse: Warehouse): Promise<Result<void>>;

    getStockMovements(productId?: string): Promise<Result<StockMovement[]>>;
    saveStockMovement(movement: StockMovement): Promise<Result<void>>;
    saveStockMovements(movements: StockMovement[]): Promise<Result<void>>;

    getStockBalances(): Promise<Result<StockBalance[]>>;
}
