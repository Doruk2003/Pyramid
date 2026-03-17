import { defineStore } from 'pinia';
import { Category } from '@/modules/inventory/domain/category.entity';
import { Brand } from '@/modules/inventory/domain/brand.entity';
import { ProductType } from '@/modules/inventory/domain/product-type.entity';
import type { Currency } from '@/modules/inventory/domain/currency.entity';
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
            const result = await lookupRepo.saveProductType(type); // UseCase eklenebilir
            if (result.success) await this.fetchAll();
            return result;
        }
    }
});
