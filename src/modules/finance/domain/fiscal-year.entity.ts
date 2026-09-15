export type FiscalYearStatus = 'open' | 'closed';

export interface FiscalYearProps {
    id: string;
    companyId: string;
    year: number;
    startDate: Date;
    endDate: Date;
    status: FiscalYearStatus;
    closedAt?: Date;
    closedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export class FiscalYear {
    private constructor(private readonly props: FiscalYearProps) {}

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get year(): number { return this.props.year; }
    get startDate(): Date { return this.props.startDate; }
    get endDate(): Date { return this.props.endDate; }
    get status(): FiscalYearStatus { return this.props.status; }
    get closedAt(): Date | undefined { return this.props.closedAt; }
    get closedBy(): string | undefined { return this.props.closedBy; }
    get createdAt(): Date { return this.props.createdAt; }
    get updatedAt(): Date { return this.props.updatedAt; }

    static create(props: FiscalYearProps): FiscalYear {
        return new FiscalYear(props);
    }

    toObject(): FiscalYearProps {
        return { ...this.props };
    }
}
