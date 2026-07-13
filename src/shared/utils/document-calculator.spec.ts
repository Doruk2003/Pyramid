import { describe, it, expect } from 'vitest';
import { DocumentCalculator, type DocumentLine } from './document-calculator';

describe('DocumentCalculator', () => {
    describe('calculateLine', () => {
        it('should calculate standard line total with VAT', () => {
            const line: DocumentLine = {
                quantity: 2,
                unitPrice: 100,
                vatRate: 20,
                discountRate1: 0,
                discountRate2: 0,
                discountRate3: 0,
                lineTotal: 0
            };
            const result = DocumentCalculator.calculateLine(line, false);
            // 200 + 20% VAT = 240
            expect(result).toBe(240);
        });

        it('should calculate line total with zero VAT for exports', () => {
            const line: DocumentLine = {
                quantity: 5,
                unitPrice: 50,
                vatRate: 20,
                discountRate1: 0,
                discountRate2: 0,
                discountRate3: 0,
                lineTotal: 0
            };
            const result = DocumentCalculator.calculateLine(line, true);
            // Export ignores VAT: 5 * 50 = 250
            expect(result).toBe(250);
        });

        it('should apply nested cascading discounts correctly', () => {
            const line: DocumentLine = {
                quantity: 10,
                unitPrice: 100,
                vatRate: 10,
                discountRate1: 10, // 1000 -> 900
                discountRate2: 5,  // 900 -> 855
                discountRate3: 2,  // 855 -> 837.9
                lineTotal: 0
            };
            const result = DocumentCalculator.calculateLine(line, false);
            // Subtotal = 837.9
            // VAT = 83.79
            // Total = 921.69
            expect(result).toBe(921.69);
        });
    });

    describe('calculateTotals', () => {
        it('should calculate correct totals for basic domestic invoice', () => {
            const lines: DocumentLine[] = [
                {
                    quantity: 2,
                    unitPrice: 100,
                    vatRate: 20,
                    discountRate1: 0,
                    discountRate2: 0,
                    discountRate3: 0,
                    lineTotal: 0
                },
                {
                    quantity: 1,
                    unitPrice: 200,
                    vatRate: 10,
                    discountRate1: 0,
                    discountRate2: 0,
                    discountRate3: 0,
                    lineTotal: 0
                }
            ];

            const totals = DocumentCalculator.calculateTotals(lines, 0, 'TRY', false);

            expect(totals.grossTotal).toBe(400);
            expect(totals.discountTotal).toBe(0);
            expect(totals.subtotal).toBe(400);
            expect(totals.vatTotal).toBe(60); // 200 * 0.20 (40) + 200 * 0.10 (20) = 60
            expect(totals.total).toBe(460);
            expect(totals.totalAsWords).toContain('YÜZALTMIŞ');
        });

        it('should calculate correct totals with global discount rate', () => {
            const lines: DocumentLine[] = [
                {
                    quantity: 2,
                    unitPrice: 100,
                    vatRate: 20,
                    discountRate1: 0,
                    discountRate2: 0,
                    discountRate3: 0,
                    lineTotal: 0
                }
            ];

            // 10% global discount on gross subtotal of 200
            const totals = DocumentCalculator.calculateTotals(lines, 10, 'TRY', false);

            expect(totals.grossTotal).toBe(200);
            expect(totals.globalDiscountAmount).toBe(20);
            expect(totals.discountTotal).toBe(20);
            expect(totals.subtotal).toBe(200); // Lines subtotal before global discount
            // VAT scaled down: 40 * (180 / 200) = 36
            expect(totals.vatTotal).toBe(36);
            expect(totals.total).toBe(216); // 180 + 36
        });

        it('should handle export invoice settings (zero VAT)', () => {
            const lines: DocumentLine[] = [
                {
                    quantity: 2,
                    unitPrice: 100,
                    vatRate: 20,
                    discountRate1: 0,
                    discountRate2: 0,
                    discountRate3: 0,
                    lineTotal: 0
                }
            ];

            const totals = DocumentCalculator.calculateTotals(lines, 0, 'USD', true);

            expect(totals.grossTotal).toBe(200);
            expect(totals.vatTotal).toBe(0); // Zero VAT for export
            expect(totals.total).toBe(200);
            expect(totals.totalAsWords).toContain('TWO HUNDRED');
        });

        it('should handle USD formatting and number to words mapping', () => {
            const lines: DocumentLine[] = [
                {
                    quantity: 1,
                    unitPrice: 1500.50,
                    vatRate: 0,
                    discountRate1: 0,
                    discountRate2: 0,
                    discountRate3: 0,
                    lineTotal: 0
                }
            ];

            const totals = DocumentCalculator.calculateTotals(lines, 0, 'USD', true);

            expect(totals.total).toBe(1500.50);
            expect(totals.totalAsWords.toUpperCase()).toContain('ONE THOUSAND FIVE HUNDRED');
        });

        it('should handle empty lines and return zero totals', () => {
            const totals = DocumentCalculator.calculateTotals([], 0, 'TRY', false);

            expect(totals.grossTotal).toBe(0);
            expect(totals.discountTotal).toBe(0);
            expect(totals.vatTotal).toBe(0);
            expect(totals.total).toBe(0);
        });
    });
});
