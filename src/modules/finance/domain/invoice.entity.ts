export type InvoiceType = 'sale' | 'purchase' | 'return_sale' | 'return_purchase';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';
export type PaymentType = 'cash' | 'check' | 'note' | 'open_account' | 'credit_card';
export type DocumentCategory = 'domestic' | 'export' | 'export_registered';

export interface InvoiceLineProps {
    id: string;
    invoiceId: string;
    productId: string;
    warehouseId?: string; // Eklenen alan
    description?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discountRate1: number;
    discountRate2: number;
    discountRate3: number;
    lineTotal: number;
}

export interface InvoiceProps {
    id: string;
    companyId: string;
    invoiceType: InvoiceType;
    documentCategory: DocumentCategory;
    invoiceNumber: string;
    accountId: string;
    warehouseId?: string; // Eklenen alan (Header default)
    projectId?: string;   // PRJ modülü entegrasyonu
    paymentType: PaymentType;
    issueDate: Date;
    dueDate?: Date;
    status: InvoiceStatus;
    subtotal: number;
    discountRate: number;   // Fatura geneline uygulanan indirim oranı (%)
    discountAmount: number; // Fatura geneline uygulanan indirim tutarı
    vatTotal: number;
    total: number;
    paidAmount: number;
    currency: string;
    exchangeRate: number;
    notes?: string;
    lines: InvoiceLineProps[];
    createdAt: Date;
    updatedAt: Date;
}

export class Invoice {
    private constructor(private readonly props: InvoiceProps) {}

    get id(): string {
        return this.props.id;
    }
    get companyId(): string {
        return this.props.companyId;
    }
    get invoiceNumber(): string {
        return this.props.invoiceNumber;
    }
    get accountId(): string {
        return this.props.accountId;
    }
    get warehouseId(): string | undefined {
        return this.props.warehouseId;
    }
    get projectId(): string | undefined {
        return this.props.projectId;
    }
    get paymentType(): PaymentType {
        return this.props.paymentType;
    }
    get documentCategory(): DocumentCategory {
        return this.props.documentCategory;
    }
    get status(): InvoiceStatus {
        return this.props.status;
    }
    get total(): number {
        return this.props.total;
    }
    get subtotal(): number {
        return this.props.subtotal;
    }
    get discountRate(): number {
        return this.props.discountRate;
    }
    get discountAmount(): number {
        return this.props.discountAmount;
    }
    get vatTotal(): number {
        return this.props.vatTotal;
    }
    get invoiceType(): InvoiceType {
        return this.props.invoiceType;
    }
    get issueDate(): Date {
        return this.props.issueDate;
    }
    get dueDate(): Date | undefined {
        return this.props.dueDate;
    }
    get currency(): string {
        return this.props.currency;
    }
    get exchangeRate(): number {
        return this.props.exchangeRate;
    }
    get notes(): string | undefined {
        return this.props.notes;
    }
    get paidAmount(): number {
        return this.props.paidAmount;
    }
    get createdAt(): Date {
        return this.props.createdAt;
    }
    get lines(): readonly InvoiceLineProps[] {
        return this.props.lines;
    }

    static create(props: InvoiceProps): Invoice {
        return new Invoice(props);
    }

    // Domain logic: Yeni toplamlarla yeni bir instans dön (Immutability)
    calculateTotals(): Invoice {
        let linesSubtotal = 0;
        let linesVat = 0;

        const updatedLines = this.props.lines.map((line) => {
            // Bileşik İndirim Uygula (Compound Discount)
            const d1 = 1 - (line.discountRate1 || 0) / 100;
            const d2 = 1 - (line.discountRate2 || 0) / 100;
            const d3 = 1 - (line.discountRate3 || 0) / 100;
            
            const lineSubtotal = line.quantity * line.unitPrice * d1 * d2 * d3;
            const lineVat = lineSubtotal * (line.vatRate / 100);
            const lineTotal = lineSubtotal + lineVat;

            linesSubtotal += lineSubtotal;
            linesVat += lineVat;

            return { ...line, lineTotal };
        });

        // Fatura Geneli İndirim Hesaplama (Net Ara Toplam üzerinden)
        const discountRate = this.props.discountRate || 0;
        const discountAmount = linesSubtotal * (discountRate / 100);
        const netSubtotal = linesSubtotal - discountAmount;
        
        // KDV, indirim sonrası tutar üzerinden tekrar hesaplanır (veya orantılı düşülür)
        // Profesyonel yaklaşımda KDV her satırda hesaplanır, bu yüzden global indirimi satırlara orantılı yedirmek en temizidir.
        // Ancak burada basitlik için KDV'yi de net tutar üzerinden oranlıyoruz:
        const vatTotal = netSubtotal > 0 ? (linesVat * (netSubtotal / linesSubtotal)) : 0;

        return new Invoice({
            ...this.props,
            lines: updatedLines,
            subtotal: linesSubtotal,
            discountAmount: discountAmount,
            vatTotal: vatTotal,
            total: netSubtotal + vatTotal,
            updatedAt: new Date()
        });
    }

    toObject(): InvoiceProps {
        return JSON.parse(JSON.stringify(this.props)); // Deep copy for safety
    }
}

