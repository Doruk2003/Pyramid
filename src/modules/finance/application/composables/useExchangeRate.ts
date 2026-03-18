/**
 * useExchangeRate
 *
 * Tüm modüllerde (Fatura, Sipariş, Teklif, Stok Hareketi) kullanılabilecek
 * kur dönüşüm composable'ı.
 *
 * Kullanım Örneği:
 *   const { convert, formatWithCurrency, getRateByCode } = useExchangeRate();
 *   const tryAmount = convert(100, 'USD');           // 100 USD → TRY
 *   const label    = formatWithCurrency(100, 'USD'); // "100,00 USD (~3.250,00 ₺)"
 */

import { computed } from 'vue';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';

export function useExchangeRate() {
    const exchangeRateStore = useExchangeRateStore();
    const lookupStore = useLookupStore();

    /** Döviz kodu → güncel TRY kuru */
    function getRateByCode(code: string): number {
        return exchangeRateStore.getRateByCode(code);
    }

    /**
     * Yabancı para → TRY çevrim.
     * currency === 'TRY' ise amount doğrudan döner.
     */
    function toTRY(amount: number, currency: string, overrideRate?: number): number {
        const rate = overrideRate ?? getRateByCode(currency);
        return CurrencyConversionService.documentToTRY(amount, currency, rate);
    }

    /**
     * TRY → Yabancı para çevrim.
     */
    function fromTRY(amountTRY: number, currency: string, overrideRate?: number): number {
        const rate = overrideRate ?? getRateByCode(currency);
        return CurrencyConversionService.fromTRY(amountTRY, rate);
    }

    /**
     * Çapraz kur: A → B
     */
    function crossConvert(amount: number, fromCurrency: string, toCurrency: string): number {
        const fromRate = getRateByCode(fromCurrency);
        const toRate = getRateByCode(toCurrency);
        return CurrencyConversionService.crossConvert(amount, fromRate, toRate);
    }

    /**
     * Kur farkından doğan TRY kar/zarar hesabı.
     * Fatura vadesi geldiğinde güncel kur ile kayıt anındaki kur farkını hesaplar.
     */
    function exchangeGainLoss(foreignAmount: number, originalRate: number, currentCurrencyCode: string): number {
        const currentRate = getRateByCode(currentCurrencyCode);
        return CurrencyConversionService.exchangeGainLoss(foreignAmount, originalRate, currentRate);
    }

    /**
     * Tutarı para birimiyle birlikte formatlar.
     * Yabancı döviz ise TRY karşılığını parantez içinde gösterir.
     * Örn: "100,00 USD (~3.250,00 ₺)"
     */
    function formatWithCurrency(amount: number, currency: string, overrideRate?: number): string {
        const formatted = CurrencyConversionService.formatNumber(amount) + ` ${currency}`;
        if (!currency || currency === 'TRY') return formatted;

        const rate = overrideRate ?? getRateByCode(currency);
        if (rate <= 0) return formatted;

        const tryAmount = CurrencyConversionService.toTRY(amount, rate);
        return `${formatted} (~${CurrencyConversionService.formatNumber(tryAmount)} ₺)`;
    }

    /** Select bileşeni için döviz listesi (TRY dahil) */
    const currencyOptions = computed(() =>
        lookupStore.currencies.map((c) => ({
            label: `${c.code} — ${c.name}`,
            value: c.code,
            id: c.id
        }))
    );

    /** Kur güncel mi? (Son kayıt bugün mü?) */
    function isRateFresh(currencyCode: string): boolean {
        const er = exchangeRateStore.getExchangeRateByCode(currencyCode);
        if (!er) return false;
        const today = new Date().toISOString().split('T')[0];
        return er.effectiveDate.toISOString().split('T')[0] === today;
    }

    return {
        getRateByCode,
        toTRY,
        fromTRY,
        crossConvert,
        exchangeGainLoss,
        formatWithCurrency,
        currencyOptions,
        isRateFresh,
        rateMap: computed(() => exchangeRateStore.rateMap)
    };
}
