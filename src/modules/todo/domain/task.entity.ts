export type TaskStatus = 'pending' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
    id: string;
    companyId: string;
    userId: string;
    title: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    isAllDay: boolean;
    status: TaskStatus;
    priority: TaskPriority;
    category: string | null;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface CreateTaskDTO {
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    isAllDay?: boolean;
    status?: TaskStatus;
    priority?: TaskPriority;
    category?: string;
    color?: string;
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {
    id: string;
}
