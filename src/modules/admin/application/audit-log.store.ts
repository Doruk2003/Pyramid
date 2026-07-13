import { ListAuditLogsUseCase } from '@/modules/admin/application/list-audit-logs.usecase';
import type { AuditLog } from '@/modules/admin/domain/audit-log.entity';
import { SupabaseAuditLogRepository } from '@/modules/admin/infra/supabase-audit-log.repository';
import { getErrorMessage } from '@/shared/utils/error';
import { defineStore } from 'pinia';

const auditLogRepository = new SupabaseAuditLogRepository();
const listAuditLogsUseCase = new ListAuditLogsUseCase(auditLogRepository);

export const useAuditLogStore = defineStore('audit-log', {
    state: () => ({
        logs: [] as AuditLog[],
        loading: false,
        error: null as string | null
    }),

    actions: {
        async fetchLogs() {
            this.loading = true;
            this.error = null;
            const result = await listAuditLogsUseCase.execute();
            if (result.success) {
                this.logs = result.data;
            } else {
                this.error = getErrorMessage(result.error);
            }
            this.loading = false;
        }
    }
});
