import { supabase } from '@/lib/supabase';
import { User } from '@/modules/admin/domain/user.entity';
import { err, ok, type Result } from '@/shared/types/result';

// getSession için timeout wrapper — 5 saniye içinde cevap gelmezse session temizle
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))]);
}

export class AuthService {
    async getCurrentUser(): Promise<Result<User | null>> {
        try {
            const {
                data: { session },
                error: sessionError
            } = await withTimeout(
                supabase.auth.getSession(),
                10000 // 10 saniye içinde cevap gelmezse timeout
            );

            if (sessionError) return err(new Error(sessionError.message));
            if (!session?.user) return ok(null);

            const { data: profile, error: profileErr } = await supabase.from('users').select('*').eq('id', session.user.id).single();

            if (profileErr) return err(new Error(profileErr.message));
            if (!profile) return ok(null);

            return ok(
                User.create({
                    id: session.user.id,
                    email: session.user.email ?? '',
                    companyId: profile.company_id,
                    fullName: profile.full_name,
                    role: profile.role,
                    isActive: profile.is_active,
                    createdAt: new Date(profile.created_at)
                })
            );
        } catch (e: unknown) {
            // Timeout veya beklenmedik hata — bozuk session'ı temizle
            const message = e instanceof Error ? e.message : 'Unknown error';
            if (message === 'TIMEOUT') {
                console.warn('Supabase getSession timeout');
            }
            return ok(null); // null dönünce router guard login'e yönlendirir
        }
    }

    async login(email: string, password: string): Promise<Result<void>> {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async logout(): Promise<Result<void>> {
        const { error } = await supabase.auth.signOut();
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
