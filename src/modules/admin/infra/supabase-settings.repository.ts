import { supabase } from '@/lib/supabase';
import { CompanySettings } from '@/modules/admin/domain/settings.entity';
import type { ISettingsRepository } from '@/modules/admin/domain/settings.repository';
import { ok, err, type Result } from '@/shared/types/result';

export class SupabaseSettingsRepository implements ISettingsRepository {
    async getSettings(): Promise<Result<CompanySettings>> {
        // Note: In a real multi-tenant app, we'd fetch based on current user's company_id
        const { data, error } = await supabase.from('companies').select('*').limit(1).single();

        if (error) return err(new Error(error.message));

        return ok(
            CompanySettings.create({
                id: data.id,
                companyName: data.name,
                taxNumber: data.tax_number,
                address: data.address?.text || '', // Assuming simplified mapping for now
                currency: data.settings?.currency || 'TRY'
            })
        );
    }

    async saveSettings(settings: CompanySettings): Promise<Result<void>> {
        const obj = settings.toObject();
        const { error } = await supabase.from('companies').upsert({
            id: obj.id,
            name: obj.companyName,
            tax_number: obj.taxNumber,
            address: { text: obj.address },
            settings: { currency: obj.currency }
        });

        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
