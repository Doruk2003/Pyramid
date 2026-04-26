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
                address: data.address?.text || '', 
                currency: data.settings?.currency || 'TRY',
                invoiceSerial: data.invoice_serial || 'AAA',
                invoiceStartingNumber: data.invoice_starting_number || 1,
                discountLabel1: data.settings?.discountLabel1,
                discountLabel2: data.settings?.discountLabel2,
                discountLabel3: data.settings?.discountLabel3,
                productSerial: data.settings?.productSerial,
                productStartingNumber: data.settings?.productStartingNumber,
                accountSerial: data.settings?.accountSerial,
                accountStartingNumber: data.settings?.accountStartingNumber,
                bankSerial: data.settings?.bankSerial,
                bankStartingNumber: data.settings?.bankStartingNumber,
                cashSerial: data.settings?.cashSerial,
                cashStartingNumber: data.settings?.cashStartingNumber,
                employeeSerial: data.settings?.employeeSerial,
                employeeStartingNumber: data.settings?.employeeStartingNumber
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
            settings: { 
                currency: obj.currency,
                discountLabel1: obj.discountLabel1,
                discountLabel2: obj.discountLabel2,
                discountLabel3: obj.discountLabel3,
                productSerial: obj.productSerial,
                productStartingNumber: obj.productStartingNumber,
                accountSerial: obj.accountSerial,
                accountStartingNumber: obj.accountStartingNumber,
                bankSerial: obj.bankSerial,
                bankStartingNumber: obj.bankStartingNumber,
                cashSerial: obj.cashSerial,
                cashStartingNumber: obj.cashStartingNumber,
                employeeSerial: obj.employeeSerial,
                employeeStartingNumber: obj.employeeStartingNumber
            },
            invoice_serial: obj.invoiceSerial,
            invoice_starting_number: obj.invoiceStartingNumber
        });

        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
