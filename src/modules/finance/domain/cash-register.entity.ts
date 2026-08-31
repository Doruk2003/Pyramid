export interface CashRegisterProps {
    id: string;
    companyId: string;
    name: string;
    type: 'cash' | 'bank' | 'check_note' | 'credit_card';
    currency: string;
    description?: string;
    isActive: boolean;
    balance?: number;
    createdAt: Date;
    updatedAt: Date;
}

export class CashRegister {
    private constructor(private readonly props: CashRegisterProps) {}

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get name(): string { return this.props.name; }
    get type(): 'cash' | 'bank' | 'check_note' | 'credit_card' { return this.props.type; }
    get currency(): string { return this.props.currency; }
    get description(): string | undefined { return this.props.description; }
    get isActive(): boolean { return this.props.isActive; }
    get balance(): number { return this.props.balance ?? 0; }
    get createdAt(): Date { return this.props.createdAt; }
    get updatedAt(): Date { return this.props.updatedAt; }

    static create(props: CashRegisterProps): CashRegister {
        return new CashRegister(props);
    }

    toObject(): CashRegisterProps {
        return { ...this.props };
    }
}
