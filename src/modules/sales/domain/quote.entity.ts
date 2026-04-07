export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface QuoteLineProps {
    id: string;
    quoteId: string;
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discountRate: number;
    lineTotal: number;
    sortOrder: number;
}

export interface QuoteProps {
    id: string;
    companyId: string;
    accountId: string;
    accountName?: string; // accounts join'den gelir — görüntüleme için
    quoteNumber: string;
    issueDate: Date;
    validUntil?: Date;
    status: QuoteStatus;
    subtotal: number;
    vatTotal: number;
    total: number;
    currency: string;
    exchangeRate: number;
    notes?: string;
    lines: QuoteLineProps[];
    createdAt: Date;
    updatedAt: Date;
}

export class Quote {
    private constructor(private readonly props: QuoteProps) {}

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get accountId(): string { return this.props.accountId; }
    get accountName(): string | undefined { return this.props.accountName; }
    get quoteNumber(): string { return this.props.quoteNumber; }
    get status(): QuoteStatus { return this.props.status; }
    get total(): number { return this.props.total; }
    get subtotal(): number { return this.props.subtotal; }
    get vatTotal(): number { return this.props.vatTotal; }
    get currency(): string { return this.props.currency; }
    get exchangeRate(): number { return this.props.exchangeRate; }
    get issueDate(): Date { return this.props.issueDate; }
    get validUntil(): Date | undefined { return this.props.validUntil; }
    get notes(): string | undefined { return this.props.notes; }
    get lines(): readonly QuoteLineProps[] { return this.props.lines; }

    static create(props: QuoteProps): Quote {
        return new Quote(props);
    }

    calculateTotals(): Quote {
        let subtotal = 0;
        let vatTotal = 0;

        const updatedLines = this.props.lines.map((line) => {
            const lineSubtotal = line.quantity * line.unitPrice * (1 - (line.discountRate || 0) / 100);
            const lineVat = lineSubtotal * ((line.vatRate || 0) / 100);
            const lineTotal = lineSubtotal + lineVat;

            subtotal += lineSubtotal;
            vatTotal += lineVat;

            return { ...line, lineTotal };
        });

        return new Quote({
            ...this.props,
            lines: updatedLines,
            subtotal,
            vatTotal,
            total: subtotal + vatTotal,
            updatedAt: new Date()
        });
    }

    toObject(): QuoteProps {
        return JSON.parse(JSON.stringify(this.props));
    }
}
