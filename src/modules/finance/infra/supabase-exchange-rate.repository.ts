import { supabase } from '@/lib/supabase';
import { ExchangeRate } from '@/modules/finance/domain/exchange-rate.entity';
import type {
    IExchangeRateRepository,
    SaveExchangeRatePayload
} from '@/modules/finance/domain/exchange-rate.repository';
import { ok, err, type Result } from '@/shared/types/result';
import type { DbExchangeRate } from '@/shared/infra/db-types';

function rowToExchangeRate(row: DbExchangeRate): ExchangeRate {
    return ExchangeRate.create({
        id: row.id,
        companyId: row.company_id,
        currencyId: row.currency_id,
        currencyCode: row.currencies?.code ?? '',
        currencyName: row.currencies?.name ?? '',
        rate: Number(row.rate),
        effectiveDate: new Date(row.effective_date),
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at)
    });
}

export class SupabaseExchangeRateRepository implements IExchangeRateRepository {

    /**
     * Her döviz için en güncel kur kaydını döner.
     * DISTINCT ON ile aynı currency_id içinde effective_date en büyük olanı alır.
     */
    async getCurrentRates(): Promise<Result<ExchangeRate[]>> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .select('*, currencies(code, name)')
            .order('currency_id')
            .order('effective_date', { ascending: false });

        if (error) return err(new Error(error.message));

        // Uygulama katmanında her currency_id için ilk kaydı al (en güncel)
        const seen = new Set<string>();
        const latest: DbExchangeRate[] = [];
        for (const row of (data as DbExchangeRate[]) || []) {
            if (!seen.has(row.currency_id)) {
                seen.add(row.currency_id);
                latest.push(row);
            }
        }

        return ok(latest.map(rowToExchangeRate));
    }

    async getRateHistory(currencyId: string): Promise<Result<ExchangeRate[]>> {
        const { data, error } = await supabase
            .from('exchange_rates')
            .select('*, currencies(code, name)')
            .eq('currency_id', currencyId)
            .order('effective_date', { ascending: false });

        if (error) return err(new Error(error.message));
        return ok(((data as DbExchangeRate[]) || []).map(rowToExchangeRate));
    }

    /**
     * Belirtilen tarihe eşit ya da daha önceki en yakın kuru döner.
     * Geçmiş belgelerdeki kur farkı hesapları için kullanılır.
     */
    async getRateForDate(currencyId: string, date: Date): Promise<Result<ExchangeRate | null>> {
        const dateStr = date.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('exchange_rates')
            .select('*, currencies(code, name)')
            .eq('currency_id', currencyId)
            .lte('effective_date', dateStr)
            .order('effective_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return err(new Error(error.message));
        if (!data) return ok(null);
        return ok(rowToExchangeRate(data as DbExchangeRate));
    }

    async saveRate(payload: SaveExchangeRatePayload): Promise<Result<void>> {
        const effectiveDateStr = payload.effectiveDate.toISOString().split('T')[0];

        const { error } = await supabase.from('exchange_rates').upsert(
            {
                company_id: payload.companyId,
                currency_id: payload.currencyId,
                rate: payload.rate,
                effective_date: effectiveDateStr,
                notes: payload.notes,
                created_by: payload.createdBy
            },
            { onConflict: 'company_id,currency_id,effective_date' }
        );

        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteRate(id: string): Promise<Result<void>> {
        const { error } = await supabase.from('exchange_rates').delete().eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
