import type { CompanySettings } from '@/modules/admin/domain/settings.entity';
import type { Result } from '@/shared/types/result';

export interface ISettingsRepository {
    getSettings(): Promise<Result<CompanySettings>>;
    saveSettings(settings: CompanySettings): Promise<Result<void>>;
}
