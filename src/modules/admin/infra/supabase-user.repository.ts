import { supabase } from '@/lib/supabase';
import { User } from '@/modules/admin/domain/user.entity';
import type { IUserRepository, NewUserPayload } from '@/modules/admin/domain/user.repository';
import type { DbUser } from '@/shared/infra/db-types';
import { err, ok, type Result } from '@/shared/types/result';

export class SupabaseUserRepository implements IUserRepository {
    async getById(id: string): Promise<Result<User>> {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

        if (error) return err(new Error(error.message));
        if (!data) return err(new Error('User not found'));

        return ok(this.mapToEntity(data as DbUser));
    }

    async getByEmail(email: string): Promise<Result<User>> {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

        if (error) return err(new Error(error.message));
        if (!data) return err(new Error('User not found'));

        return ok(this.mapToEntity(data as DbUser));
    }

    /**
     * YENİ KULLANICI OLUŞTURUR.
     *
     * Neden RPC? public.users.id -> auth.users.id FK constraint var.
     * Önce auth.users'a kayıt açılmadan public.users'a insert yapılamaz.
     * Auth Admin API service_role ister (frontend'e açılamaz), bu yüzden
     * SECURITY DEFINER bir PostgreSQL fonksiyonu üzerinden atomik olarak
     * her iki tabloya birden kayıt açıyoruz.
     */
    async create(payload: NewUserPayload): Promise<Result<string>> {
        const { data, error } = await supabase.rpc('create_user_for_company', {
            p_email: payload.email,
            p_password: payload.password,
            p_full_name: payload.fullName,
            p_role: payload.role,
            p_company_id: payload.companyId
        });

        if (error) return err(new Error(error.message));
        return ok(data as string);
    }

    /**
     * MEVCUT KULLANICIYI GÜNCELLER.
     * Sadece public.users tablosunu günceller (auth.users'a dokunmaz).
     * Yeni kullanıcı için create() kullanın.
     */
    async save(user: User): Promise<Result<void>> {
        const { error } = await supabase
            .from('users')
            .update({
                full_name: user.fullName,
                role: user.role,
                is_active: user.isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async delete(id: string): Promise<Result<void>> {
        const { error } = await supabase.from('users').delete().eq('id', id);

        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async list(): Promise<Result<User[]>> {
        const { data, error } = await supabase.from('users').select('*');

        if (error) return err(new Error(error.message));
        return ok(((data as DbUser[]) || []).map((row) => this.mapToEntity(row)));
    }

    private mapToEntity(row: DbUser): User {
        return User.create({
            id: row.id,
            companyId: row.company_id,
            email: row.email,
            fullName: row.full_name,
            role: row.role,
            isActive: row.is_active,
            createdAt: new Date(row.created_at)
        });
    }
}
