import { Task, CreateTaskDTO, UpdateTaskDTO } from './task.entity';
import { Result } from '@/shared/types/result';

export interface ITodoRepository {
    getById(id: string): Promise<Result<Task>>;
    list(startDate?: Date, endDate?: Date): Promise<Result<Task[]>>;
    save(task: CreateTaskDTO | UpdateTaskDTO): Promise<Result<void>>;
    delete(id: string): Promise<Result<void>>;
    complete(id: string): Promise<Result<void>>;
}
