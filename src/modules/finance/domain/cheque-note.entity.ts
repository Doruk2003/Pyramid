export type ChequeNoteType = 'cheque' | 'note';
export type ChequeNoteDirection = 'received' | 'issued';
export type ChequeNoteStatus =
    | 'portfolio'       -- Portföyde (Henüz tahsil/ciro edilmedi)
    | 'endorsed'        -- Ciro Edildi (Tedarikçiye verildi)
    | 'bank_clearing'   -- Bankaya Takasa Verildi
    | 'bank_collateral' -- Bankaya Teminata Verildi
    | 'collected'       -- Tahsil Edildi (Alınan çek tahsil edildi)
    | 'paid'            -- Ödendi (Verilen borç çeki ödendi)
    | 'unpaid'          -- Karşılıksız / Protestolu
    | 'returned';       -- İade Edildi

export interface ChequeNoteProps {
    id: string;
    companyId: string;
    type: ChequeNoteType;
    direction: ChequeNoteDirection;
    serialNumber: string;
    bankName?: string;
    bankBranch?: string;
    accountNumber?: string;
    drawer?: string;
    accountId?: string;
    issueDate: Date;
    dueDate: Date;
    amount: number;
    currency: string;
    status: ChequeNoteStatus;
    cashRegisterId?: string;
    notes?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;

    // Join alanları (UI gösterimi için)
    accountName?: string;
    cashRegisterName?: string;
}

export class ChequeNote {
    private constructor(private readonly props: ChequeNoteProps) {}

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get type(): ChequeNoteType { return this.props.type; }
    get direction(): ChequeNoteDirection { return this.props.direction; }
    get serialNumber(): string { return this.props.serialNumber; }
    get bankName(): string | undefined { return this.props.bankName; }
    get bankBranch(): string | undefined { return this.props.bankBranch; }
    get accountNumber(): string | undefined { return this.props.accountNumber; }
    get drawer(): string | undefined { return this.props.drawer; }
    get accountId(): string | undefined { return this.props.accountId; }
    get issueDate(): Date { return this.props.issueDate; }
    get dueDate(): Date { return this.props.dueDate; }
    get amount(): number { return this.props.amount; }
    get currency(): string { return this.props.currency; }
    get status(): ChequeNoteStatus { return this.props.status; }
    get cashRegisterId(): string | undefined { return this.props.cashRegisterId; }
    get notes(): string | undefined { return this.props.notes; }
    get createdBy(): string | undefined { return this.props.createdBy; }
    get createdAt(): Date { return this.props.createdAt; }
    get updatedAt(): Date { return this.props.updatedAt; }

    get accountName(): string | undefined { return this.props.accountName; }
    get cashRegisterName(): string | undefined { return this.props.cashRegisterName; }

    static create(props: ChequeNoteProps): ChequeNote {
        return new ChequeNote(props);
    }

    toObject(): ChequeNoteProps {
        return { ...this.props };
    }
}
