export type InvoiceType = 'sale' | 'purchase' | 'return_sale' | 'return_purchase';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export interface InvoiceLineProps {
    id: string;
    invoiceId: string;
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discountRate: number;
    lineTotal: number;
}

export interface InvoiceProps {
    id: string;
    companyId: string;
    invoiceType: InvoiceType;
    invoiceNumber: string;
    accountId: string;
    issueDate: Date;
    dueDate?: Date;
    status: InvoiceStatus;
    subtotal: number;
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
    get status(): InvoiceStatus {
        return this.props.status;
    }
    get total(): number {
        return this.props.total;
    }
    get subtotal(): number {
        return this.props.subtotal;
    }
    get vatTotal(): number {
        return this.props.vatTotal;
    }
    get lines(): readonly InvoiceLineProps[] {
        return this.props.lines;
    }

    static create(props: InvoiceProps): Invoice {
        return new Invoice(props);
    }

    // Domain logic: Yeni toplamlarla yeni bir instans dön (Immutability)
    calculateTotals(): Invoice {
        let subtotal = 0;
        let vatTotal = 0;

        const updatedLines = this.props.lines.map((line) => {
            const lineSubtotal = line.quantity * line.unitPrice * (1 - line.discountRate / 100);
            const lineVat = lineSubtotal * (line.vatRate / 100);
            const lineTotal = lineSubtotal + lineVat;

            subtotal += lineSubtotal;
            vatTotal += lineVat;

            return { ...line, lineTotal };
        });

        return new Invoice({
            ...this.props,
            lines: updatedLines,
            subtotal,
            vatTotal,
            total: subtotal + vatTotal,
            updatedAt: new Date()
        });
    }

    toObject(): InvoiceProps {
        return JSON.parse(JSON.stringify(this.props)); // Deep copy for safety
    }
}
