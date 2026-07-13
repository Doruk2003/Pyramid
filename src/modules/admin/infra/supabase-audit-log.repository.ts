import { supabase } from '@/lib/supabase';
import { AuditLog } from '@/modules/admin/domain/audit-log.entity';
import type { IAuditLogRepository } from '@/modules/admin/domain/audit-log.repository';
import type { DbAuditLog } from '@/shared/infra/db-types';
import { ok, err, type Result } from '@/shared/types/result';

export class SupabaseAuditLogRepository implements IAuditLogRepository {
    async list(): Promise<Result<AuditLog[]>> {
        const { data: logData, error: logError } = await supabase
            .from('audit_logs')
            .select('*')
            .order('changed_at', { ascending: false });

        if (logError) return err(new Error(logError.message));
        if (!logData) return ok([]);

        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email, full_name');

        const userMap = new Map<string, { email: string; fullName: string }>();
        if (usersData && !usersError) {
            usersData.forEach((u) => {
                userMap.set(u.id, {
                    email: u.email || '',
                    fullName: u.full_name || ''
                });
            });
        }

        const entities = (logData as DbAuditLog[]).map((row) => {
            const entity = AuditLog.create({
                id: row.id,
                tableName: row.table_name,
                recordId: row.record_id,
                action: row.action as 'INSERT' | 'UPDATE' | 'DELETE',
                changedBy: row.changed_by ?? null,
                oldData: row.old_data,
                newData: row.new_data,
                changedAt: new Date(row.changed_at)
            });

            if (row.changed_by) {
                const user = userMap.get(row.changed_by);
                if (user) {
                    entity.setUserInfo(user.email, user.fullName);
                } else {
                    entity.setUserInfo(null, 'Bilinmeyen Kullanıcı');
                }
            } else {
                entity.setUserInfo('system', 'Sistem');
            }

            return entity;
        });

        return ok(entities);
    }
}
