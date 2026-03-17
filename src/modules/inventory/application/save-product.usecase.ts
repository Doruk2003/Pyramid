import type { IProductRepository } from '@/modules/inventory/domain/product.repository';
import type { Product } from '@/modules/inventory/domain/product.entity';
import type { Result } from '@/shared/types/result';

export class SaveProductUseCase {
    constructor(private productRepo: IProductRepository) {}

    async execute(product: Product): Promise<Result<void>> {
        // Burada iş kuralları doğrulaması yapılabilir (örn: miktar kontrolü vb.)
        return await this.productRepo.save(product);
    }
}
