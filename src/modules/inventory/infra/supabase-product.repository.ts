import { supabase } from '@/lib/supabase';
import { Product } from '@/modules/inventory/domain/product.entity';
import type { IProductRepository } from '@/modules/inventory/domain/product.repository';
import { ok, err, type Result } from '@/shared/types/result';
import type { DbProduct } from '@/shared/infra/db-types';

export class SupabaseProductRepository implements IProductRepository {
    async getById(id: string): Promise<Result<Product>> {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();

        if (error) return err(new Error(error.message));
        return ok(this.mapToEntity(data as DbProduct));
    }

    async list(): Promise<Result<Product[]>> {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

        if (error) return err(new Error(error.message));
        return ok(((data as DbProduct[]) || []).map((row) => this.mapToEntity(row)));
    }

    async save(product: Product): Promise<Result<void>> {
        const p = product.toObject();
        const { error } = await supabase.from('products').upsert({
            id: p.id,
            company_id: p.companyId,
            code: p.code,
            name: p.name,
            description: p.description,
            image: p.image,
            price: p.price,
            inventoryStatus: p.inventoryStatus,
            rating: p.rating,
            category_id: p.categoryId,
            brand_id: p.brandId,
            type_id: p.typeId,
            currency_id: p.currencyId,
            tax_rate: p.taxRate,
            price_unit: p.priceUnit,
            min_stock: p.minStock,
            max_stock: p.maxStock,
            barcode: p.barcode,
            initial_stock: p.initialStock,
            status: p.status,
            images: p.images
        });

        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async delete(id: string): Promise<Result<void>> {
        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    private mapToEntity(row: DbProduct): Product {
        return Product.create({
            id: row.id,
            companyId: row.company_id,
            code: row.code,
            name: row.name,
            description: row.description,
            image: row.image,
            price: row.price,
            inventoryStatus: row.inventoryStatus,
            rating: row.rating,
            categoryId: row.category_id,
            brandId: row.brand_id,
            typeId: row.type_id,
            currencyId: row.currency_id,
            taxRate: row.tax_rate,
            priceUnit: row.price_unit,
            minStock: row.min_stock,
            maxStock: row.max_stock,
            barcode: row.barcode,
            initialStock: row.initial_stock,
            status: row.status || 'active',
            images: row.images,
            createdAt: new Date(row.created_at)
        });
    }
}
