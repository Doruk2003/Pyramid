import type { Project, ProjectStatus } from '@/modules/finance/domain/project.entity';
import type { Result } from '@/shared/types/result';

export interface ProjectFilters {
    status?: ProjectStatus;
    clientId?: string;
    isActive?: boolean;
}

/** Proje maliyet özeti (project_cost_summary view'dan gelir) */
export interface ProjectCostSummary {
    id: string;
    code: string;
    name: string;
    location?: string;
    status: ProjectStatus;
    totalBudget: number;
    budgetMaterial: number;
    budgetLabor: number;
    budgetEquipment: number;
    budgetGeneral: number;
    actualCost: number;       // Gerçekleşen alım faturaları toplamı
    actualRevenue: number;    // Gerçekleşen satış faturaları toplamı
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
}

export interface IProjectRepository {
    getProjects(filters?: ProjectFilters): Promise<Result<Project[]>>;
    getProjectById(id: string): Promise<Result<Project>>;
    getProjectCostSummary(projectId: string): Promise<Result<ProjectCostSummary>>;
    saveProject(project: Project): Promise<Result<void>>;
    deleteProject(id: string): Promise<Result<void>>;      // Soft delete
}
