import type { User } from '@/modules/admin/domain/user.entity';
import type { Result } from '@/shared/types/result';

export interface NewUserPayload {
    email: string;
    fullName: string;
    role: 'admin' | 'user' | 'manager' | 'viewer';
    companyId: string;
    password: string;
}

export interface IUserRepository {
    getById(id: string): Promise<Result<User>>;
    getByEmail(email: string): Promise<Result<User>>;
    /**
     * Yeni kullanıcı oluşturur.
     * auth.users + public.users kaydını atomik olarak açar (RPC).
     * Sadece admin rolündeki kullanıcılar çağırabilir.
     */
    create(payload: NewUserPayload): Promise<Result<string>>;
    /**
     * Mevcut kullanıcıyı günceller (sadece public.users).
     * Yeni kullanıcı için create() kullanın.
     */
    save(user: User): Promise<Result<void>>;
    delete(id: string): Promise<Result<void>>;
    list(): Promise<Result<User[]>>;
}
