import { DeleteUserUseCase } from '@/modules/admin/application/delete-user.usecase';
import { ListUsersUseCase } from '@/modules/admin/application/list-users.usecase';
import { CreateUserUseCase, SaveUserUseCase } from '@/modules/admin/application/save-user.usecase';
import type { User } from '@/modules/admin/domain/user.entity';
import type { NewUserPayload } from '@/modules/admin/domain/user.repository';
import { SupabaseUserRepository } from '@/modules/admin/infra/supabase-user.repository';
import { getErrorMessage } from '@/shared/utils/error';
import { defineStore } from 'pinia';

const userRepository = new SupabaseUserRepository();
const listUsersUseCase = new ListUsersUseCase(userRepository);
const saveUserUseCase = new SaveUserUseCase(userRepository);
const createUserUseCase = new CreateUserUseCase(userRepository);
const deleteUserUseCase = new DeleteUserUseCase(userRepository);

export const useUserStore = defineStore('user', {
    state: () => ({
        users: [] as User[],
        loading: false,
        error: null as string | null
    }),

    actions: {
        async fetchUsers() {
            this.loading = true;
            const result = await listUsersUseCase.execute();
            if (result.success) {
                this.users = result.data;
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
        },

        /** Yeni kullanıcı — auth.users + public.users atomik RPC */
        async createUser(payload: NewUserPayload) {
            this.loading = true;
            const result = await createUserUseCase.execute(payload);
            if (result.success) {
                await this.fetchUsers();
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
            return result;
        },

        /** Mevcut kullanıcı güncelleme — sadece public.users */
        async saveUser(user: User) {
            this.loading = true;
            const result = await saveUserUseCase.execute(user);
            if (result.success) {
                await this.fetchUsers();
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
            return result;
        },

        async deleteUser(id: string) {
            this.loading = true;
            const result = await deleteUserUseCase.execute(id);
            if (result.success) {
                await this.fetchUsers();
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
            return result;
        }
    }
});
