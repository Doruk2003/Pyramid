import { supabase } from '@/lib/supabase';
import { Category } from '@/modules/inventory/domain/category.entity';
import { Brand } from '@/modules/inventory/domain/brand.entity';
import { ProductType } from '@/modules/inventory/domain/product-type.entity';
import { Currency } from '@/modules/inventory/domain/currency.entity';
import type { ILookupRepository } from '@/modules/inventory/domain/lookup.repository';
import { ok, err, type Result } from '@/shared/types/result';

export class SupabaseLookupRepository implements ILookupRepository {
  async getCategories(): Promise<Result<Category[]>> {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) return err(new Error(error.message));
    return ok((data || []).map(row => Category.create({ id: row.id, name: row.name })));
  }

  async getBrands(): Promise<Result<Brand[]>> {
    const { data, error } = await supabase.from('brands').select('*').order('name');
    if (error) return err(new Error(error.message));
    return ok((data || []).map(row => Brand.create({ id: row.id, name: row.name })));
  }

  async getProductTypes(): Promise<Result<ProductType[]>> {
    const { data, error } = await supabase.from('types').select('*').order('name');
    if (error) return err(new Error(error.message));
    return ok((data || []).map(row => ProductType.create({ id: row.id, name: row.name })));
  }

  async getCurrencies(): Promise<Result<Currency[]>> {
    const { data, error } = await supabase.from('currencies').select('*').order('code');
    if (error) return err(new Error(error.message));
    return ok((data || []).map(row => Currency.create({ id: row.id, code: row.code, name: row.name })));
  }

  async saveCategory(category: Category): Promise<Result<void>> {
    const { error } = await supabase.from('categories').upsert({ id: category.id || undefined, name: category.name });
    if (error) return err(new Error(error.message));
    return ok(undefined);
  }

  async saveBrand(brand: Brand): Promise<Result<void>> {
    const { error } = await supabase.from('brands').upsert({ id: brand.id || undefined, name: brand.name });
    if (error) return err(new Error(error.message));
    return ok(undefined);
  }

  async saveProductType(type: ProductType): Promise<Result<void>> {
    const { error } = await supabase.from('types').upsert({ id: type.id || undefined, name: type.name });
    if (error) return err(new Error(error.message));
    return ok(undefined);
  }
}



