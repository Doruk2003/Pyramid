import type { AuditLog } from '@/modules/admin/domain/audit-log.entity';
import type { IAuditLogRepository } from '@/modules/admin/domain/audit-log.repository';
import type { Result } from '@/shared/types/result';

export class ListAuditLogsUseCase {
    constructor(private auditLogRepository: IAuditLogRepository) {}

    async execute(): Promise<Result<AuditLog[]>> {
        return this.auditLogRepository.list();
    }
}
