/**
 * Sayıyı yazıya çevirir. 
 * TRY için Türkçe, diğer dövizler için İngilizce çıktı verir.
 */
export function numberToWords(amount: number, currencyCode: string = 'TRY'): string {
    const roundAmount = Math.round(amount * 100) / 100;
    const integerPart = Math.floor(roundAmount);
    const decimalPart = Math.round((roundAmount - integerPart) * 100);

    if (currencyCode === 'TRY') {
        return toTurkishWords(integerPart, decimalPart, currencyCode);
    } else {
        return toEnglishWords(integerPart, decimalPart, currencyCode);
    }
}

function toTurkishWords(integerPart: number, decimalPart: number, currencyCode: string): string {
    const units = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
    const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
    const thousands = ['', 'BİN', 'MİLYON', 'MİLYAR', 'TRİLYON'];

    function convertGroup(n: number): string {
        let res = '';
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        if (h > 0) {
            if (h > 1) res += units[h];
            res += 'YÜZ';
        }
        res += tens[t] + units[u];
        return res;
    }

    function convertInteger(n: number): string {
        if (n === 0) return 'SIFIR';
        let res = '';
        let groupIdx = 0;
        while (n > 0) {
            const group = n % 1000;
            if (group > 0) {
                let groupStr = convertGroup(group);
                if (groupIdx === 1 && group === 1) groupStr = '';
                res = groupStr + thousands[groupIdx] + res;
            }
            n = Math.floor(n / 1000);
            groupIdx++;
        }
        return res;
    }

    const integerWords = convertInteger(integerPart);
    const decimalWords = decimalPart > 0 ? convertInteger(decimalPart) : '';
    
    if (decimalWords) {
        return `YALNIZ ${integerWords} TÜRKLİRASI ${decimalWords} KURUŞDUR.`;
    } else {
        return `YALNIZ ${integerWords} TÜRKLİRASIDIR.`;
    }
}

function toEnglishWords(integerPart: number, decimalPart: number, currencyCode: string): string {
    const units = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const thousands = ['', 'THOUSAND', 'MILLION', 'BILLION'];

    function convertGroup(n: number): string {
        let res = '';
        const h = Math.floor(n / 100);
        const t = n % 100;
        if (h > 0) res += units[h] + ' HUNDRED ';
        if (t > 0) {
            if (t < 20) res += units[t];
            else res += tens[Math.floor(t / 10)] + (t % 10 > 0 ? '-' + units[t % 10] : '');
        }
        return res.trim();
    }

    function convertInteger(n: number): string {
        if (n === 0) return 'ZERO';
        let res = '';
        let groupIdx = 0;
        while (n > 0) {
            const group = n % 1000;
            if (group > 0) {
                res = convertGroup(group) + ' ' + thousands[groupIdx] + ' ' + res;
            }
            n = Math.floor(n / 1000);
            groupIdx++;
        }
        return res.trim();
    }

    const integerWords = convertInteger(integerPart);
    const decimalWords = decimalPart > 0 ? convertInteger(decimalPart) : '';

    let currencyName = currencyCode === 'USD' ? 'US DOLLARS' : 'EUROS';
    let subCurrencyName = 'CENTS';

    let res = `SAY TOTAL ${integerWords} ${currencyName}`;
    if (decimalWords) res += ` AND ${decimalWords} ${subCurrencyName}`;
    return res + ' ONLY.';
}
