export interface PaymentProps {
    id: string;
    companyId: string;
    invoiceId?: string;
    accountId?: string;
    paymentDate: Date;
    amount: number;
    paymentMethod: 'cash' | 'bank' | 'check' | 'credit_card';
    description?: string;
    createdBy?: string;
    createdAt: Date;
    paymentType: 'collection' | 'payment' | 'debit_note' | 'credit_note';
    cashRegisterId?: string;
    documentNumber?: string;
    dueDate?: Date;
    status: 'pending' | 'completed' | 'cancelled';
    updatedAt: Date;

    // Join alanları (UI kolaylığı için)
    accountName?: string;
    cashRegisterName?: string;
    invoiceNumber?: string;
}

export class Payment {
    private constructor(private readonly props: PaymentProps) {}

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get invoiceId(): string | undefined { return this.props.invoiceId; }
    get accountId(): string | undefined { return this.props.accountId; }
    get paymentDate(): Date { return this.props.paymentDate; }
    get amount(): number { return this.props.amount; }
    get paymentMethod(): 'cash' | 'bank' | 'check' | 'credit_card' { return this.props.paymentMethod; }
    get description(): string | undefined { return this.props.description; }
    get createdBy(): string | undefined { return this.props.createdBy; }
    get createdAt(): Date { return this.props.createdAt; }
    get paymentType(): 'collection' | 'payment' | 'debit_note' | 'credit_note' { return this.props.paymentType; }
    get cashRegisterId(): string | undefined { return this.props.cashRegisterId; }
    get documentNumber(): string | undefined { return this.props.documentNumber; }
    get dueDate(): Date | undefined { return this.props.dueDate; }
    get status(): 'pending' | 'completed' | 'cancelled' { return this.props.status; }
    get updatedAt(): Date { return this.props.updatedAt; }

    // Join alanları
    get accountName(): string | undefined { return this.props.accountName; }
    get cashRegisterName(): string | undefined { return this.props.cashRegisterName; }
    get invoiceNumber(): string | undefined { return this.props.invoiceNumber; }

    static create(props: PaymentProps): Payment {
        return new Payment(props);
    }

    toObject(): PaymentProps {
        return { ...this.props };
    }
}
