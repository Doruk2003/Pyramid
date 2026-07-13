// View-katmanına özgü InvoiceForm tipleri
// Domain entity'leri ile karıştırılmamalı
import type { DocumentCategory, InvoiceStatus, InvoiceType, PaymentType } from '@/modules/finance/domain/invoice.entity';

export interface InvoiceLineForm {
    id: string;
    productId: string;
    warehouseId?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    originalPrice?: number;
    originalCurrency?: string;
    vatRate: number;
    discountRate1: number;
    discountRate2: number;
    discountRate3: number;
    lineTotal: number;
    sourceLineId?: string;
}

export interface InvoiceFormModel {
    invoiceType: InvoiceType;
    documentCategory: DocumentCategory;
    invoiceNumber: string;
    accountId: string;
    warehouseId: string;
    projectId: string;
    paymentType: PaymentType;
    issueDate: Date;
    dueDate: Date | null;
    status: InvoiceStatus;
    currency: string;
    exchangeRate: number;
    discountRate: number;
    notes: string;
    lines: InvoiceLineForm[];
    paidAmount?: number;
    sourceType?: 'quote' | 'order';
    sourceIds?: string[];
    createdAt?: Date;
}

export interface InvoiceTotals {
    grossTotal: number;
    discountTotal: number;
    linesDiscount: number;
    globalDiscount: number;
    subtotal: number;
    netSubtotal: number;
    vatTotal: number;
    total: number;
}
