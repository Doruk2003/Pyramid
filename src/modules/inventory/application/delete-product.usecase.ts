import type { IProductRepository } from '@/modules/inventory/domain/product.repository';
import type { Result } from '@/shared/types/result';

export class DeleteProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(id: string): Promise<Result<void>> {
    return await this.productRepo.delete(id);
  }
}
