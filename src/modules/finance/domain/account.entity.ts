export type AccountType = 'customer' | 'supplier' | 'both';
export type AddressValue = string | null;

export interface AccountProps {
    id: string;
    companyId: string;
    accountType: AccountType;
    name: string;
    taxNumber?: string;
    taxOffice?: string;
    email?: string;
    phone?: string;
    authorizedPerson?: string;
    authorizedGsm?: string;
    address?: AddressValue;
    city?: string;
    district?: string;
    country?: string;
    bankName?: string;
    accountOwner?: string;
    iban?: string;
    description?: string;
    isDealer?: boolean;
    dealerDiscount1?: number;
    dealerDiscount2?: number;
    dealerDiscount3?: number;
    creditLimit: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class Account {
    constructor(private props: AccountProps) {}

    get id(): string {
        return this.props.id;
    }
    get companyId(): string {
        return this.props.companyId;
    }
    get accountType(): AccountType {
        return this.props.accountType;
    }
    get name(): string {
        return this.props.name;
    }
    get taxNumber(): string | undefined {
        return this.props.taxNumber;
    }
    get taxOffice(): string | undefined {
        return this.props.taxOffice;
    }
    get email(): string | undefined {
        return this.props.email;
    }
    get phone(): string | undefined {
        return this.props.phone;
    }
    get authorizedPerson(): string | undefined {
        return this.props.authorizedPerson;
    }
    get authorizedGsm(): string | undefined {
        return this.props.authorizedGsm;
    }
    get address(): AddressValue | undefined {
        return this.props.address;
    }
    get city(): string | undefined {
        return this.props.city;
    }
    get district(): string | undefined {
        return this.props.district;
    }
    get country(): string | undefined {
        return this.props.country;
    }
    get bankName(): string | undefined {
        return this.props.bankName;
    }
    get accountOwner(): string | undefined {
        return this.props.accountOwner;
    }
    get iban(): string | undefined {
        return this.props.iban;
    }
    get description(): string | undefined {
        return this.props.description;
    }
    get isDealer(): boolean | undefined {
        return this.props.isDealer;
    }
    get dealerDiscount1(): number | undefined {
        return this.props.dealerDiscount1;
    }
    get dealerDiscount2(): number | undefined {
        return this.props.dealerDiscount2;
    }
    get dealerDiscount3(): number | undefined {
        return this.props.dealerDiscount3;
    }
    get creditLimit(): number {
        return this.props.creditLimit;
    }
    get isActive(): boolean {
        return this.props.isActive;
    }
    get createdAt(): Date {
        return this.props.createdAt;
    }
    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    static create(props: AccountProps): Account {
        return new Account(props);
    }

    toObject(): AccountProps {
        return { ...this.props };
    }
}
