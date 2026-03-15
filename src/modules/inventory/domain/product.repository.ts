import type { Product } from '@/modules/inventory/domain/product.entity';
import type { Result } from '@/shared/types/result';

export interface IProductRepository {
  getById(id: string): Promise<Result<Product>>;
  list(): Promise<Result<Product[]>>;
  save(product: Product): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
}


