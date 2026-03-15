import type { IProductRepository } from '@/modules/inventory/domain/product.repository';
import type { Product } from '@/modules/inventory/domain/product.entity';
import type { Result } from '@/shared/types/result';

export class ListProductsUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(): Promise<Result<Product[]>> {
    return await this.productRepo.list();
  }
}
