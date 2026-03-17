import type { IUserRepository } from '@/modules/admin/domain/user.repository';
import type { Result } from '@/shared/types/result';

export class DeleteUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(id: string): Promise<Result<void>> {
        return this.userRepository.delete(id);
    }
}
