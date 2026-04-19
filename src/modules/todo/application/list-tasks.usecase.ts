import { Task } from '../domain/task.entity';
import { ITodoRepository } from '../domain/todo.repository';
import { Result } from '@/shared/types/result';

export class ListTasksUseCase {
    constructor(private todoRepository: ITodoRepository) {}

    async execute(startDate?: Date, endDate?: Date): Promise<Result<Task[]>> {
        return this.todoRepository.list(startDate, endDate);
    }
}
