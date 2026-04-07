import type { Category } from '@/modules/inventory/domain/category.entity';
import type { Brand } from '@/modules/inventory/domain/brand.entity';
import type { ProductType } from '@/modules/inventory/domain/product-type.entity';
import type { Currency } from '@/modules/inventory/domain/currency.entity';
import type { Result } from '@/shared/types/result';

export interface ILookupRepository {
    getCategories(): Promise<Result<Category[]>>;
    getBrands(): Promise<Result<Brand[]>>;
    getProductTypes(): Promise<Result<ProductType[]>>;
    getCurrencies(): Promise<Result<Currency[]>>;

    saveCategory(category: Category): Promise<Result<void>>;
    saveBrand(brand: Brand): Promise<Result<void>>;
    saveProductType(type: ProductType): Promise<Result<void>>;
    saveCurrency(currency: Currency): Promise<Result<void>>;
    deleteCurrency(id: string): Promise<Result<void>>;
    deleteCategory(id: string): Promise<Result<void>>;
    deleteBrand(id: string): Promise<Result<void>>;
    deleteProductType(id: string): Promise<Result<void>>;
}
