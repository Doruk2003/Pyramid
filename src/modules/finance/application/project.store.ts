import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import { Project } from '@/modules/finance/domain/project.entity';
import type { ProjectFilters, ProjectCostSummary } from '@/modules/finance/domain/project.repository';
import { SupabaseProjectRepository } from '@/modules/finance/infra/supabase-project.repository';
import { useAuthStore } from '@/core/auth/auth.store';

const projectRepo = new SupabaseProjectRepository();

export const useProjectStore = defineStore('project', {
    state: () => ({
        projects: [] as Project[],
        activeProject: null as Project | null,
        costSummary: null as ProjectCostSummary | null,
        loading: false,
        error: null as string | null
    }),

    getters: {
        // Sadece aktif projeler — fatura formu dropdown'ı için
        activeProjects: (state) => state.projects.filter((p) => p.status === 'active' || p.status === 'planning')
    },

    actions: {
        async fetchProjects(filters?: ProjectFilters) {
            this.loading = true;
            const result = await projectRepo.getProjects(filters);
            if (result.success) this.projects = result.data.map((p) => markRaw(p));
            else this.error = result.error?.message ?? 'Projeler yüklenemedi';
            this.loading = false;
        },

        async fetchProjectById(id: string) {
            this.loading = true;
            const result = await projectRepo.getProjectById(id);
            if (result.success) this.activeProject = markRaw(result.data);
            else this.error = result.error?.message ?? 'Proje bulunamadı';
            this.loading = false;
        },

        async fetchCostSummary(projectId: string) {
            const result = await projectRepo.getProjectCostSummary(projectId);
            if (result.success) this.costSummary = result.data;
            return result;
        },

        async saveProject(project: Project) {
            const result = await projectRepo.saveProject(project);
            if (result.success) await this.fetchProjects();
            return result;
        },

        async deleteProject(id: string) {
            const result = await projectRepo.deleteProject(id);
            if (result.success) {
                // Optimistic update
                this.projects = this.projects.filter((p) => p.id !== id);
                if (this.activeProject?.id === id) this.activeProject = null;
            }
            return result;
        },

        /** Yeni proje entity'si oluştur (form başlangıç değeri) */
        buildNewProject(): Project {
            const authStore = useAuthStore();
            return Project.create({
                id: crypto.randomUUID(),
                companyId: authStore.user?.companyId ?? '',
                code: '',
                name: '',
                status: 'planning',
                budget: { material: 0, labor: 0, equipment: 0, general: 0 },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    }
});
