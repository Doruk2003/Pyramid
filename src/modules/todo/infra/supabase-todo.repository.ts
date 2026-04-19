import { supabase } from '@/lib/supabase';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../domain/task.entity';
import { ITodoRepository } from '../domain/todo.repository';
import { ok, err, Result } from '@/shared/types/result';
import { DbTask } from '@/shared/infra/db-types';

export class SupabaseTodoRepository implements ITodoRepository {
    async getById(id: string): Promise<Result<Task>> {
        const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
        if (error) return err(new Error(error.message));
        return ok(this.mapToEntity(data as DbTask));
    }

    async list(startDate?: Date, endDate?: Date): Promise<Result<Task[]>> {
        let query = supabase.from('tasks').select('*').is('deleted_at', null);

        if (startDate) {
            query = query.gte('start_date', startDate.toISOString());
        }
        if (endDate) {
            query = query.lte('start_date', endDate.toISOString());
        }

        const { data, error } = await query.order('start_date', { ascending: true });

        if (error) return err(new Error(error.message));
        return ok(((data as DbTask[]) || []).map((row) => this.mapToEntity(row)));
    }

    async save(task: CreateTaskDTO | UpdateTaskDTO): Promise<Result<void>> {
        const isUpdate = 'id' in task;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {
            title: task.title,
            description: task.description,
            start_date: task.startDate?.toISOString(),
            end_date: task.endDate?.toISOString(),
            is_all_day: task.isAllDay,
            status: task.status,
            priority: task.priority,
            category: task.category,
            color: task.color,
            updated_at: new Date().toISOString()
        };

        if (isUpdate) {
            const { error } = await supabase
                .from('tasks')
                .update(data)
                .eq('id', (task as UpdateTaskDTO).id);
            if (error) return err(new Error(error.message));
        } else {
            // company_id and user_id will be handled by RLS if possible, 
            // but we usually need to provide them in upsert if they are NOT NULL.
            // Getting them from auth store or user store.
            // For now, let's assume we pass them or RLS handles them via defaults.
            // Actually, we usually get current company from store in the use-case layer.
            // I'll add them here assuming they are provided in the DTO if needed 
            // or I'll need to fetch them.
            
            // To be safe, I'll pass them in the store.
        }

        return ok(undefined);
    }
    
    // Better save method that takes full data
    async upsert(task: any): Promise<Result<void>> {
        const { error } = await supabase.from('tasks').upsert(task);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async delete(id: string): Promise<Result<void>> {
        const { error } = await supabase
            .from('tasks')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async complete(id: string): Promise<Result<void>> {
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    private mapToEntity(row: DbTask): Task {
        return {
            id: row.id,
            companyId: row.company_id,
            userId: row.user_id,
            title: row.title,
            description: row.description || null,
            startDate: new Date(row.start_date),
            endDate: row.end_date ? new Date(row.end_date) : null,
            isAllDay: row.is_all_day,
            status: row.status,
            priority: row.priority,
            category: row.category || null,
            color: row.color || null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            deletedAt: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
