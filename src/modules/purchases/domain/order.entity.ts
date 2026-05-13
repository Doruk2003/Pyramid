export type OrderStatus = 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'partially_invoiced' | 'cancelled' | 'completed';

export interface OrderLineProps {
    id: string;
    orderId: string;
    productId: string;
    warehouseId?: string; // Yeni eklendi
    description?: string;
    quantity: number;
    invoicedQuantity: number; // Yeni eklenen: Faturalanan miktar
    shippedQuantity: number;  // Yeni eklenen: Sevk edilen miktar
    unitPrice: number;
    vatRate: number;
    discountRate1: number;
    discountRate2: number;
    discountRate3: number;
    lineTotal: number;
    sortOrder: number;
    sourceLineId?: string;     // Yeni eklenen: Hangi teklif satırından geldi?
}

export interface OrderProps {
    id: string;
    companyId: string;
    accountId: string;
    accountName?: string; // accounts join'den gelir — görüntüleme için
    quoteId?: string;
    orderNumber: string;
    issueDate: Date;
    dueDate?: Date;
    status: OrderStatus;
    subtotal: number;
    vatTotal: number;
    total: number;
    currency: string;
    exchangeRate: number;
    projectId?: string;
    type: 'sale' | 'purchase'; // Yeni eklendi
    notes?: string;
    lines: OrderLineProps[];
    createdAt: Date;
    updatedAt: Date;
}

export class Order {
    private constructor(private readonly props: OrderProps) {}

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get accountId(): string { return this.props.accountId; }
    get accountName(): string | undefined { return this.props.accountName; }
    get orderNumber(): string { return this.props.orderNumber; }
    get status(): OrderStatus { return this.props.status; }
    get total(): number { return this.props.total; }
    get subtotal(): number { return this.props.subtotal; }
    get vatTotal(): number { return this.props.vatTotal; }
    get currency(): string { return this.props.currency; }
    get exchangeRate(): number { return this.props.exchangeRate; }
    get projectId(): string | undefined { return this.props.projectId; }
    get type(): 'sale' | 'purchase' { return this.props.type; }
    get issueDate(): Date { return this.props.issueDate; }
    get dueDate(): Date | undefined { return this.props.dueDate; }
    get notes(): string | undefined { return this.props.notes; }
    get quoteId(): string | undefined { return this.props.quoteId; }
    get lines(): readonly OrderLineProps[] { return this.props.lines; }

    static create(props: OrderProps): Order {
        return new Order(props);
    }

    calculateTotals(): Order {
        let subtotal = 0;
        let vatTotal = 0;

        const updatedLines = this.props.lines.map((line) => {
            const d1 = 1 - (line.discountRate1 || 0) / 100;
            const d2 = 1 - (line.discountRate2 || 0) / 100;
            const d3 = 1 - (line.discountRate3 || 0) / 100;
            
            const lineSubtotal = line.quantity * line.unitPrice * d1 * d2 * d3;
            const lineVat = lineSubtotal * ((line.vatRate || 0) / 100);
            const lineTotal = lineSubtotal + lineVat;

            subtotal += lineSubtotal;
            vatTotal += lineVat;

            return { ...line, lineTotal };
        });

        return new Order({
            ...this.props,
            lines: updatedLines,
            subtotal,
            vatTotal,
            total: subtotal + vatTotal,
            updatedAt: new Date()
        });
    }

    toObject(): OrderProps {
        return JSON.parse(JSON.stringify(this.props));
    }
}
