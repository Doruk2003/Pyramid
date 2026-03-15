import type { User } from '@/modules/admin/domain/user.entity';
import type { IUserRepository, NewUserPayload } from '@/modules/admin/domain/user.repository';
import type { Result } from '@/shared/types/result';

export class SaveUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    /** Mevcut kullanıcıyı günceller (id var) */
    async execute(user: User): Promise<Result<void>> {
        return this.userRepository.save(user);
    }
}

export class CreateUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    /**
     * Yeni kullanıcı oluşturur.
     * auth.users + public.users kaydını RPC üzerinden atomik açar.
     */
    async execute(payload: NewUserPayload): Promise<Result<string>> {
        return this.userRepository.create(payload);
    }
}
