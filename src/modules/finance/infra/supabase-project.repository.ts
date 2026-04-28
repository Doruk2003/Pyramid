import { supabase } from '@/lib/supabase';
import { Project, type ProjectStatus } from '@/modules/finance/domain/project.entity';
import type { IProjectRepository, ProjectCostSummary, ProjectFilters } from '@/modules/finance/domain/project.repository';
import { ok, err, type Result } from '@/shared/types/result';
import type { DbProject } from '@/shared/infra/db-types';

function rowToProject(row: DbProject): Project {
    return Project.create({
        id: row.id,
        companyId: row.company_id,
        code: row.code,
        name: row.name,
        location: row.location ?? undefined,
        clientId: row.client_id ?? undefined,
        clientName: row.accounts?.name ?? undefined,
        status: row.status as ProjectStatus,
        startDate: row.start_date ? new Date(row.start_date) : undefined,
        endDate: row.end_date ? new Date(row.end_date) : undefined,
        budget: {
            material:  Number(row.budget_material),
            labor:     Number(row.budget_labor),
            equipment: Number(row.budget_equipment),
            general:   Number(row.budget_general)
        },
        description: row.description ?? undefined,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    });
}

export class SupabaseProjectRepository implements IProjectRepository {

    async getProjects(filters?: ProjectFilters): Promise<Result<Project[]>> {
        let query = supabase
            .from('projects')
            .select('*, accounts(name)')
            .is('deleted_at', null)
            .order('name', { ascending: true });

        if (filters?.status)   query = query.eq('status', filters.status);
        if (filters?.clientId) query = query.eq('client_id', filters.clientId);
        if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

        const { data, error } = await query;
        if (error) return err(new Error(error.message));
        return ok(((data as DbProject[]) || []).map(rowToProject));
    }

    async getProjectById(id: string): Promise<Result<Project>> {
        const { data, error } = await supabase
            .from('projects')
            .select('*, accounts(name)')
            .eq('id', id)
            .single();
        if (error) return err(new Error(error.message));
        return ok(rowToProject(data as DbProject));
    }

    async getProjectCostSummary(projectId: string): Promise<Result<ProjectCostSummary>> {
        // project_cost_summary view'ından tek projeyi getir
        const { data, error } = await supabase
            .from('project_cost_summary')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) return err(new Error(error.message));

        const row = data as {
            id: string; code: string; name: string; location?: string;
            status: string; total_budget: number;
            budget_material: number; budget_labor: number;
            budget_equipment: number; budget_general: number;
            actual_cost: number; actual_revenue: number;
            client_id?: string; start_date?: string; end_date?: string;
        };

        return ok({
            id:              row.id,
            code:            row.code,
            name:            row.name,
            location:        row.location,
            status:          row.status as ProjectStatus,
            totalBudget:     Number(row.total_budget),
            budgetMaterial:  Number(row.budget_material),
            budgetLabor:     Number(row.budget_labor),
            budgetEquipment: Number(row.budget_equipment),
            budgetGeneral:   Number(row.budget_general),
            actualCost:      Number(row.actual_cost),
            actualRevenue:   Number(row.actual_revenue),
            clientId:        row.client_id,
            startDate:       row.start_date ? new Date(row.start_date) : undefined,
            endDate:         row.end_date   ? new Date(row.end_date)   : undefined
        });
    }

    async saveProject(project: Project): Promise<Result<void>> {
        const obj = project.toObject();
        const { error } = await supabase.from('projects').upsert({
            id:               obj.id || undefined,
            company_id:       obj.companyId,
            code:             obj.code,
            name:             obj.name,
            location:         obj.location ?? null,
            client_id:        obj.clientId ?? null,
            status:           obj.status,
            start_date:       obj.startDate?.toISOString().split('T')[0] ?? null,
            end_date:         obj.endDate?.toISOString().split('T')[0]   ?? null,
            budget_material:  obj.budget.material,
            budget_labor:     obj.budget.labor,
            budget_equipment: obj.budget.equipment,
            budget_general:   obj.budget.general,
            description:      obj.description ?? null,
            is_active:        obj.isActive,
            updated_at:       new Date().toISOString()
        });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteProject(id: string): Promise<Result<void>> {
        const { error } = await supabase
            .from('projects')
            .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
