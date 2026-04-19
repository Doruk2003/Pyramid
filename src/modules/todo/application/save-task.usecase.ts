import { CreateTaskDTO, UpdateTaskDTO } from '../domain/task.entity';
import { ITodoRepository } from '../domain/todo.repository';
import { Result } from '@/shared/types/result';

export class SaveTaskUseCase {
    constructor(private todoRepository: ITodoRepository) {}

    async execute(task: CreateTaskDTO | UpdateTaskDTO): Promise<Result<void>> {
        return this.todoRepository.save(task);
    }
}
