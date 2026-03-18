import type { ExchangeRate } from '@/modules/finance/domain/exchange-rate.entity';
import type { Result } from '@/shared/types/result';

export interface ExchangeRateFilters {
    currencyId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

export interface SaveExchangeRatePayload {
    companyId: string;
    currencyId: string;
    rate: number;
    effectiveDate: Date;
    notes?: string;
    createdBy?: string;
}

export interface IExchangeRateRepository {
    /** Her döviz için en güncel kuru döner */
    getCurrentRates(): Promise<Result<ExchangeRate[]>>;

    /** Belirli bir dövizin kur geçmişini döner (tarihe göre azalan) */
    getRateHistory(currencyId: string): Promise<Result<ExchangeRate[]>>;

    /** Belirli bir tarih için en yakın kuru döner (tarih <= effective_date) */
    getRateForDate(currencyId: string, date: Date): Promise<Result<ExchangeRate | null>>;

    /** Yeni kur kaydı ekler (aynı gün varsa günceller — upsert) */
    saveRate(payload: SaveExchangeRatePayload): Promise<Result<void>>;

    /** Kur kaydını siler */
    deleteRate(id: string): Promise<Result<void>>;
}
