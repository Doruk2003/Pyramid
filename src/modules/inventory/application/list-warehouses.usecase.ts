import type { IInventoryRepository } from '@/modules/inventory/domain/inventory.repository';
import type { Warehouse } from '@/modules/inventory/domain/warehouse.entity';
import type { Result } from '@/shared/types/result';

export class ListWarehousesUseCase {
  constructor(private inventoryRepo: IInventoryRepository) {}

  async execute(): Promise<Result<Warehouse[]>> {
    return await this.inventoryRepo.getWarehouses();
  }
}
