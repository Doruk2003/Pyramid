import { defineStore } from 'pinia';
import { ExchangeRate } from '@/modules/finance/domain/exchange-rate.entity';
import { SupabaseExchangeRateRepository } from '@/modules/finance/infra/supabase-exchange-rate.repository';
import { useAuthStore } from '@/core/auth/auth.store';
import type { SaveExchangeRatePayload } from '@/modules/finance/domain/exchange-rate.repository';

const repo = new SupabaseExchangeRateRepository();

export const useExchangeRateStore = defineStore('exchangeRate', {
    state: () => ({
        /** Her döviz için en güncel kur (currencyCode → ExchangeRate) */
        currentRates: [] as ExchangeRate[],
        /** Geçmiş görüntülemek için seçilen dövizin tüm kayıtları */
        history: [] as ExchangeRate[],
        loading: false,
        error: null as string | null
    }),

    getters: {
        /**
         * Döviz koduna göre güncel kur değerini döner.
         * TRY için her zaman 1 döner.
         */
        getRateByCode:
            (state) =>
            (code: string): number => {
                if (!code || code.toUpperCase() === 'TRY') return 1;
                const found = state.currentRates.find(
                    (r) => r.currencyCode.toUpperCase() === code.toUpperCase()
                );
                return found ? found.rate : 0;
            },

        /**
         * Döviz koduna göre ExchangeRate nesnesini döner.
         */
        getExchangeRateByCode:
            (state) =>
            (code: string): ExchangeRate | null => {
                if (!code || code.toUpperCase() === 'TRY') return null;
                return (
                    state.currentRates.find(
                        (r) => r.currencyCode.toUpperCase() === code.toUpperCase()
                    ) ?? null
                );
            },

        /**
         * Güncel kur tablosu: currencyCode → rate (Map)
         * Hesaplamalar için kolay erişim.
         */
        rateMap: (state): Map<string, number> => {
            const map = new Map<string, number>();
            map.set('TRY', 1);
            state.currentRates.forEach((r) => map.set(r.currencyCode.toUpperCase(), r.rate));
            return map;
        }
    },

    actions: {
        async fetchCurrentRates() {
            this.loading = true;
            this.error = null;
            const result = await repo.getCurrentRates();
            if (result.success) {
                this.currentRates = result.data;
            } else {
                this.error = result.error.message;
            }
            this.loading = false;
        },

        async fetchHistory(currencyId: string) {
            this.loading = true;
            const result = await repo.getRateHistory(currencyId);
            if (result.success) this.history = result.data;
            this.loading = false;
        },

        async saveRate(currencyId: string, rate: number, effectiveDate: Date, notes?: string) {
            const authStore = useAuthStore();
            const payload: SaveExchangeRatePayload = {
                companyId: authStore.user?.companyId || '',
                currencyId,
                rate,
                effectiveDate,
                notes,
                createdBy: authStore.user?.id
            };

            const result = await repo.saveRate(payload);
            if (result.success) await this.fetchCurrentRates();
            return result;
        },

        async deleteRate(id: string) {
            const result = await repo.deleteRate(id);
            if (result.success) await this.fetchCurrentRates();
            return result;
        },

        /**
         * Belirli bir tarih için kur alır.
         * Fatura yüklenirken geçmiş kurun doğrulanması için kullanılır.
         */
        async getRateForDate(currencyId: string, date: Date): Promise<number> {
            const result = await repo.getRateForDate(currencyId, date);
            if (result.success && result.data) return result.data.rate;
            return 0;
        }
    }
});
