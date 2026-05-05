import { numberToWords as convertNumberToWords } from './number-to-words';

export interface DocumentLine {
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discountRate1: number;
    discountRate2: number;
    discountRate3: number;
    lineTotal: number;
}

export interface DocumentTotals {
    grossTotal: number;
    discountTotal: number;
    subtotal: number;
    vatTotal: number;
    total: number;
    totalAsWords: string;
    globalDiscountAmount: number;
}

export class DocumentCalculator {
    static calculateLine(line: DocumentLine, isExport = false): number {
        const lineGross = line.quantity * (line.unitPrice || 0);
        const d1 = 1 - (line.discountRate1 || 0) / 100;
        const d2 = 1 - (line.discountRate2 || 0) / 100;
        const d3 = 1 - (line.discountRate3 || 0) / 100;
        
        const lineSubtotal = lineGross * d1 * d2 * d3;
        const lineVat = isExport ? 0 : lineSubtotal * (line.vatRate / 100);
        
        return Math.round((lineSubtotal + lineVat) * 100) / 100;
    }

    static calculateTotals(
        lines: DocumentLine[], 
        globalDiscountRate = 0, 
        currency = 'TRY', 
        isExport = false
    ): DocumentTotals {
        let grossTotal = 0;
        let discountTotal = 0;
        let vatTotal = 0;

        lines.forEach((line) => {
            const lineGross = line.quantity * (line.unitPrice || 0);
            const d1 = 1 - (line.discountRate1 || 0) / 100;
            const d2 = 1 - (line.discountRate2 || 0) / 100;
            const d3 = 1 - (line.discountRate3 || 0) / 100;
            
            const lineSubtotal = lineGross * d1 * d2 * d3;
            const lineDiscount = lineGross - lineSubtotal;
            const lineVat = isExport ? 0 : lineSubtotal * (line.vatRate / 100);
            
            line.lineTotal = Math.round((lineSubtotal + lineVat) * 100) / 100;
            grossTotal += lineGross;
            discountTotal += lineDiscount;
            vatTotal += lineVat;
        });

        const linesSubtotal = Math.round((grossTotal - discountTotal) * 100) / 100;
        const globalDiscountAmount = Math.round((linesSubtotal * (globalDiscountRate / 100)) * 100) / 100;
        const netSubtotal = Math.round((linesSubtotal - globalDiscountAmount) * 100) / 100;
        
        // Vat scaling for global discount
        const finalVatTotal = linesSubtotal > 0 ? Math.round((vatTotal * (netSubtotal / linesSubtotal)) * 100) / 100 : 0;
        const finalTotal = Math.round((netSubtotal + finalVatTotal) * 100) / 100;

        return {
            grossTotal: Math.round(grossTotal * 100) / 100,
            discountTotal: Math.round((discountTotal + globalDiscountAmount) * 100) / 100,
            subtotal: linesSubtotal,
            vatTotal: finalVatTotal,
            total: finalTotal,
            globalDiscountAmount,
            totalAsWords: convertNumberToWords(finalTotal, currency)
        };
    }
}
