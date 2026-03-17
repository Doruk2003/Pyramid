import type { IUserRepository } from '@/modules/admin/domain/user.repository';
import type { User } from '@/modules/admin/domain/user.entity';
import type { Result } from '@/shared/types/result';

export class ListUsersUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(): Promise<Result<User[]>> {
        return this.userRepository.list();
    }
}
