export interface ExchangeRateProps {
    id: string;
    companyId: string;
    currencyId: string;
    currencyCode: string;   // currencies join'den
    currencyName: string;   // currencies join'den
    rate: number;           // 1 birim yabancı para = ? TRY
    effectiveDate: Date;
    notes?: string;
    createdBy?: string;
    createdAt: Date;
}

export class ExchangeRate {
    private constructor(private readonly props: ExchangeRateProps) {}

    get id(): string             { return this.props.id; }
    get companyId(): string      { return this.props.companyId; }
    get currencyId(): string     { return this.props.currencyId; }
    get currencyCode(): string   { return this.props.currencyCode; }
    get currencyName(): string   { return this.props.currencyName; }
    get rate(): number           { return this.props.rate; }
    get effectiveDate(): Date    { return this.props.effectiveDate; }
    get notes(): string | undefined { return this.props.notes; }
    get createdBy(): string | undefined { return this.props.createdBy; }
    get createdAt(): Date        { return this.props.createdAt; }

    static create(props: ExchangeRateProps): ExchangeRate {
        return new ExchangeRate(props);
    }

    toObject(): ExchangeRateProps {
        return { ...this.props };
    }
}
