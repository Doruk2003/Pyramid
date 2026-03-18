/**
 * CurrencyConversionService
 *
 * Tüm döviz dönüşüm hesaplamalarının merkezi.
 * Pure fonksiyonlar — yan etki yok, test edilebilir.
 *
 * Kur mantığı:
 *   rate = 1 birim yabancı para kaç TRY eder
 *   Örnek: USD rate = 32.50  →  1 USD = 32.50 TRY
 *
 * TRY için rate her zaman 1'dir.
 */
export class CurrencyConversionService {
    private static readonly PRECISION = 6;
    private static readonly round = (n: number, d = 2) =>
        Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

    /**
     * Yabancı para biriminden TRY'ye çevir
     * amount * rate = TRY karşılığı
     */
    static toTRY(amount: number, rate: number): number {
        return this.round(amount * rate, this.PRECISION);
    }

    /**
     * TRY'den yabancı para birimine çevir
     * amountTRY / rate = yabancı para karşılığı
     */
    static fromTRY(amountTRY: number, rate: number): number {
        if (rate === 0) return 0;
        return this.round(amountTRY / rate, this.PRECISION);
    }

    /**
     * Çapraz kur: A → TRY → B
     * Örnek: 100 USD → TRY → EUR
     */
    static crossConvert(amount: number, fromRateInTRY: number, toRateInTRY: number): number {
        if (toRateInTRY === 0) return 0;
        const inTRY = amount * fromRateInTRY;
        return this.round(inTRY / toRateInTRY, this.PRECISION);
    }

    /**
     * Fatura / belge tutarını TRY'ye çevir.
     * currency === 'TRY' ise doğrudan döner.
     */
    static documentToTRY(amount: number, currency: string, rate: number): number {
        if (currency === 'TRY') return this.round(amount);
        return this.toTRY(amount, rate);
    }

    /**
     * İki tarihteki kur farkı (kur riski)
     * Pozitif = kur artmış (zarar), Negatif = kur düşmüş (kazanç)
     */
    static exchangeRateDiff(originalRate: number, currentRate: number): number {
        return this.round(currentRate - originalRate, this.PRECISION);
    }

    /**
     * Kur farkından doğan TRY kar/zarar
     */
    static exchangeGainLoss(amount: number, originalRate: number, currentRate: number): number {
        const diff = this.exchangeRateDiff(originalRate, currentRate);
        return this.round(amount * diff);
    }

    /**
     * Para birimi formatla (Intl.NumberFormat)
     */
    static format(amount: number, currencyCode: string, locale = 'tr-TR'): string {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Sadece sayı formatla (para birimi sembolü olmadan)
     */
    static formatNumber(amount: number, fractionDigits = 2, locale = 'tr-TR'): string {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(amount);
    }
}
