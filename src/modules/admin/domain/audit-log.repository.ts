import type { AuditLog } from '@/modules/admin/domain/audit-log.entity';
import type { Result } from '@/shared/types/result';

export interface IAuditLogRepository {
    list(): Promise<Result<AuditLog[]>>;
}
