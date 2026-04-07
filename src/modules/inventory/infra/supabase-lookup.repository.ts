import { supabase } from '@/lib/supabase';
import { Category } from '@/modules/inventory/domain/category.entity';
import { Brand } from '@/modules/inventory/domain/brand.entity';
import { ProductType } from '@/modules/inventory/domain/product-type.entity';
import { Currency } from '@/modules/inventory/domain/currency.entity';
import type { ILookupRepository } from '@/modules/inventory/domain/lookup.repository';
import { ok, err, type Result } from '@/shared/types/result';

// =============================================================================
// SupabaseLookupRepository
// Brands, Categories, Types, Currencies için CRUD işlemleri.
//
// TASARIM NOTU (Multi-tenant Altyapısı):
// - Sistem şu an "Tek Firma — Çok Kullanıcı" modunda çalışır.
// - RLS politikaları get_auth_user_company_id() ile şirket izolasyonunu sağlar.
// - Upsert işlemlerinde company_id DB tarafından RLS üzerinden belirlenir;
//   frontend'den gönderilmesi WITH CHECK politikası için zorunludur.
// - İleride multi-tenant'a geçişte bu dosyada değişiklik GEREKMEz.
// =============================================================================

/**
 * Oturum açmış kullanıcının company_id'sini Supabase users tablosundan çeker.
 * Tüm save işlemlerinde company_id sağlamak için kullanılır.
 */
async function getCurrentCompanyId(): Promise<string | null> {
    const {
        data: { user }
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase.from('users').select('company_id').eq('id', user.id).single();

    return data?.company_id ?? null;
}

export class SupabaseLookupRepository implements ILookupRepository {
    // ─── OKUMA ──────────────────────────────────────────────────────────────

    async getCategories(): Promise<Result<Category[]>> {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) return err(new Error(error.message));
        return ok(
            (data || []).map((row) =>
                Category.create({
                    id: row.id,
                    name: row.name,
                    companyId: row.company_id ?? undefined,
                    parentId: row.parent_id ?? undefined,
                    isActive: row.is_active ?? true
                })
            )
        );
    }

    async getBrands(): Promise<Result<Brand[]>> {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) return err(new Error(error.message));
        return ok(
            (data || []).map((row) =>
                Brand.create({
                    id: row.id,
                    name: row.name,
                    companyId: row.company_id ?? undefined,
                    isActive: row.is_active ?? true
                })
            )
        );
    }

    async getProductTypes(): Promise<Result<ProductType[]>> {
        const { data, error } = await supabase
            .from('types')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) return err(new Error(error.message));
        return ok(
            (data || []).map((row) =>
                ProductType.create({
                    id: row.id,
                    name: row.name,
                    companyId: row.company_id ?? undefined,
                    isActive: row.is_active ?? true
                })
            )
        );
    }

    async getCurrencies(): Promise<Result<Currency[]>> {
        const { data, error } = await supabase
            .from('currencies')
            .select('*')
            .order('code');
        if (error) return err(new Error(error.message));
        return ok(
            (data || []).map((row) => Currency.create({ id: row.id, code: row.code, name: row.name }))
        );
    }

    // ─── KAYDETME ────────────────────────────────────────────────────────────

    async saveCategory(category: Category): Promise<Result<void>> {
        const companyId = await getCurrentCompanyId();
        if (!companyId) return err(new Error('Şirket bilgisi bulunamadı. Lütfen tekrar giriş yapın.'));

        const payload: Record<string, unknown> = {
            name: category.name.trim(),
            company_id: companyId,
            is_active: true
        };

        // Düzenleme: id varsa upsert, ekleme: id yoksa insert
        if (category.id) payload['id'] = category.id;

        const { error } = await supabase.from('categories').upsert(payload);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async saveBrand(brand: Brand): Promise<Result<void>> {
        const companyId = await getCurrentCompanyId();
        if (!companyId) return err(new Error('Şirket bilgisi bulunamadı. Lütfen tekrar giriş yapın.'));

        const payload: Record<string, unknown> = {
            name: brand.name.trim(),
            company_id: companyId,
            is_active: true
        };

        if (brand.id) payload['id'] = brand.id;

        const { error } = await supabase.from('brands').upsert(payload);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async saveProductType(type: ProductType): Promise<Result<void>> {
        const companyId = await getCurrentCompanyId();
        if (!companyId) return err(new Error('Şirket bilgisi bulunamadı. Lütfen tekrar giriş yapın.'));

        const payload: Record<string, unknown> = {
            name: type.name.trim(),
            company_id: companyId,
            is_active: true
        };

        if (type.id) payload['id'] = type.id;

        const { error } = await supabase.from('types').upsert(payload);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async saveCurrency(currency: Currency): Promise<Result<void>> {
        const payload: Record<string, unknown> = {
            code: currency.code.toUpperCase().trim(),
            name: currency.name.trim()
        };

        if (currency.id) payload['id'] = currency.id;

        const { error } = await supabase.from('currencies').upsert(payload);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    // ─── SİLME (Soft delete: is_active = false) ──────────────────────────────

    async deleteCategory(id: string): Promise<Result<void>> {
        // Soft delete: kayıt gerçekten silinmez, is_active = false yapılır
        const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteBrand(id: string): Promise<Result<void>> {
        const { error } = await supabase.from('brands').update({ is_active: false }).eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteProductType(id: string): Promise<Result<void>> {
        const { error } = await supabase.from('types').update({ is_active: false }).eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteCurrency(id: string): Promise<Result<void>> {
        // Currency tablosunda is_active yok — hard delete (para birimleri nadiren silinir)
        const { error } = await supabase.from('currencies').delete().eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
