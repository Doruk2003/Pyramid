import { defineStore } from 'pinia';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../domain/task.entity';
import { SupabaseTodoRepository } from '../infra/supabase-todo.repository';
import { ListTasksUseCase } from './list-tasks.usecase';
import { SaveTaskUseCase } from './save-task.usecase';
import { getErrorMessage } from '@/shared/utils/error';
import { useAuthStore } from '@/core/auth/auth.store';

const todoRepo = new SupabaseTodoRepository();
const listTasksUseCase = new ListTasksUseCase(todoRepo);
const saveTaskUseCase = new SaveTaskUseCase(todoRepo);

export const useTodoStore = defineStore('todo', {
    state: () => ({
        tasks: [] as Task[],
        loading: false,
        error: null as string | null
    }),

    getters: {
        todayTasks: (state) => {
            const today = new Date().toDateString();
            return state.tasks.filter(t => t.startDate.toDateString() === today);
        },
        pendingTasks: (state) => state.tasks.filter(t => t.status === 'pending'),
    },

    actions: {
        async fetchTasks(startDate?: Date, endDate?: Date) {
            this.loading = true;
            this.error = null;
            const result = await listTasksUseCase.execute(startDate, endDate);
            if (result.success) {
                this.tasks = result.data;
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
        },

        async saveTask(task: CreateTaskDTO | UpdateTaskDTO) {
            this.loading = true;
            this.error = null;
            
            const authStore = useAuthStore();
            const companyId = authStore.user?.companyId;
            const userId = authStore.user?.id;

            if (!companyId || !userId) {
                this.error = 'Oturum bilgisi bulunamadı.';
                this.loading = false;
                return;
            }

            // Map DTO to full DB object for repository
            const isUpdate = 'id' in task;
            const dbData = {
                ...(isUpdate ? { id: (task as any).id } : {}),
                company_id: companyId,
                user_id: userId,
                title: task.title,
                description: task.description,
                start_date: task.startDate?.toISOString(),
                end_date: task.endDate?.toISOString(),
                is_all_day: task.isAllDay || false,
                status: task.status || 'pending',
                priority: task.priority || 'normal',
                category: task.category,
                color: task.color,
                updated_at: new Date().toISOString()
            };

            const result = await todoRepo.upsert(dbData);
            if (result.success) {
                await this.fetchTasks();
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
            return result;
        },

        async completeTask(id: string) {
            this.loading = true;
            const result = await todoRepo.complete(id);
            if (result.success) {
                await this.fetchTasks();
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
            return result;
        },

        async deleteTask(id: string) {
            this.loading = true;
            const result = await todoRepo.delete(id);
            if (result.success) {
                this.tasks = this.tasks.filter(t => t.id !== id);
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
            return result;
        }
    }
});
