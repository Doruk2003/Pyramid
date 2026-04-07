import { defineStore } from 'pinia';
import { Category } from '@/modules/inventory/domain/category.entity';
import { Brand } from '@/modules/inventory/domain/brand.entity';
import { ProductType } from '@/modules/inventory/domain/product-type.entity';
import { Currency } from '@/modules/inventory/domain/currency.entity';
import { SupabaseLookupRepository } from '@/modules/inventory/infra/supabase-lookup.repository';
import { FetchLookupsUseCase } from './fetch-lookups.usecase';

const lookupRepo = new SupabaseLookupRepository();
const fetchLookupsUseCase = new FetchLookupsUseCase(lookupRepo);

export const useLookupStore = defineStore('lookup', {
    state: () => ({
        categories: [] as Category[],
        brands: [] as Brand[],
        productTypes: [] as ProductType[],
        currencies: [] as Currency[],
        loading: false
    }),

    actions: {
        async fetchAll() {
            this.loading = true;
            const [cats, brs, types, curs] = await fetchLookupsUseCase.execute();

            if (cats.success) this.categories = cats.data;
            if (brs.success) this.brands = brs.data;
            if (types.success) this.productTypes = types.data;
            if (curs.success) this.currencies = curs.data;

            this.loading = false;
        },

        async addCategory(name: string) {
            const cat = Category.create({ id: '', name });
            const result = await lookupRepo.saveCategory(cat); // UseCase eklenebilir
            if (result.success) await this.fetchAll();
            return result;
        },

        async addBrand(name: string) {
            const brand = Brand.create({ id: '', name });
            const result = await lookupRepo.saveBrand(brand); // UseCase eklenebilir
            if (result.success) await this.fetchAll();
            return result;
        },

        async addProductType(name: string) {
            const type = ProductType.create({ id: '', name });
            const result = await lookupRepo.saveProductType(type);
            if (result.success) await this.fetchAll();
            return result;
        },

        async editCategory(id: string, name: string) {
            const cat = Category.create({ id, name });
            const result = await lookupRepo.saveCategory(cat);
            if (result.success) await this.fetchAll();
            return result;
        },

        async removeCategory(id: string) {
            const result = await lookupRepo.deleteCategory(id);
            if (result.success) await this.fetchAll();
            return result;
        },

        async editBrand(id: string, name: string) {
            const brand = Brand.create({ id, name });
            const result = await lookupRepo.saveBrand(brand);
            if (result.success) await this.fetchAll();
            return result;
        },

        async removeBrand(id: string) {
            const result = await lookupRepo.deleteBrand(id);
            if (result.success) await this.fetchAll();
            return result;
        },

        async editProductType(id: string, name: string) {
            const type = ProductType.create({ id, name });
            const result = await lookupRepo.saveProductType(type);
            if (result.success) await this.fetchAll();
            return result;
        },

        async removeProductType(id: string) {
            const result = await lookupRepo.deleteProductType(id);
            if (result.success) await this.fetchAll();
            return result;
        },

        async addCurrency(code: string, name: string) {
            const currency = Currency.create({ id: '', code, name });
            const result = await lookupRepo.saveCurrency(currency);
            if (result.success) await this.fetchAll();
            return result;
        },

        async editCurrency(id: string, code: string, name: string) {
            const currency = Currency.create({ id, code, name });
            const result = await lookupRepo.saveCurrency(currency);
            if (result.success) await this.fetchAll();
            return result;
        },

        async removeCurrency(id: string) {
            const result = await lookupRepo.deleteCurrency(id);
            if (result.success) await this.fetchAll();
            return result;
        }
    }
});
