import type { IInventoryRepository } from '@/modules/inventory/domain/inventory.repository';
import type { StockMovement } from '@/modules/inventory/domain/stock-movement.entity';
import type { Result } from '@/shared/types/result';

export class SaveMovementUseCase {
  constructor(private inventoryRepo: IInventoryRepository) {}

  async execute(movement: StockMovement | StockMovement[]): Promise<Result<void>> {
    if (Array.isArray(movement)) {
      return await this.inventoryRepo.saveStockMovements(movement);
    }
    return await this.inventoryRepo.saveStockMovement(movement);
  }
}
