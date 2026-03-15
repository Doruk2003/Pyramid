import { defineStore } from 'pinia';
import type { Category } from '@/modules/inventory/domain/category.entity';
import type { Brand } from '@/modules/inventory/domain/brand.entity';
import type { ProductType } from '@/modules/inventory/domain/product-type.entity';
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
        const cat = { id: '', name: name } as any;
        const result = await lookupRepo.saveCategory(cat); // UseCase eklenebilir
        if (result.success) await this.fetchAll();
        return result;
    },

    async addBrand(name: string) {
        const brand = { id: '', name: name } as any;
        const result = await lookupRepo.saveBrand(brand); // UseCase eklenebilir
        if (result.success) await this.fetchAll();
        return result;
    },

    async addProductType(name: string) {
        const type = { id: '', name: name } as any;
        const result = await lookupRepo.saveProductType(type); // UseCase eklenebilir
        if (result.success) await this.fetchAll();
        return result;
    }
  }
});



