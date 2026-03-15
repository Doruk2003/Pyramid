import { defineStore } from 'pinia';
import type { Product } from '@/modules/inventory/domain/product.entity';
import { SupabaseProductRepository } from '@/modules/inventory/infra/supabase-product.repository';
import { ListProductsUseCase } from './list-products.usecase';
import { SaveProductUseCase } from './save-product.usecase';
import { DeleteProductUseCase } from './delete-product.usecase';

const productRepo = new SupabaseProductRepository();
const listProductsUseCase = new ListProductsUseCase(productRepo);
const saveProductUseCase = new SaveProductUseCase(productRepo);
const deleteProductUseCase = new DeleteProductUseCase(productRepo);

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [] as Product[],
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchProducts() {
      this.loading = true;
      const result = await listProductsUseCase.execute();
      if (result.success) {
        this.products = result.data;
      } else {
        this.error = (result as any).error.message;
      }
      this.loading = false;
    },

    async saveProduct(product: Product) {
      this.loading = true;
      const result = await saveProductUseCase.execute(product);
      if (result.success) {
        await this.fetchProducts();
      } else {
        this.error = (result as any).error.message;
      }
      this.loading = false;
      return result;
    },

    async deleteProduct(id: string) {
      this.loading = true;
      const result = await deleteProductUseCase.execute(id);
      if (result.success) {
        await this.fetchProducts();
      } else {
        this.error = (result as any).error.message;
      }
      this.loading = false;
      return result;
    }
  }
});


