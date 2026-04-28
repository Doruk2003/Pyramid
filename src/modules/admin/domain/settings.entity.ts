export interface CompanySettingsProps {
    id: string;
    companyName: string;
    taxNumber?: string;
    taxOffice?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    currency: string;
    invoiceSerial: string;
    invoiceStartingNumber: number;
    discountLabel1?: string;
    discountLabel2?: string;
    discountLabel3?: string;
    productSerial?: string;
    productStartingNumber?: number;
    accountSerial?: string;
    accountStartingNumber?: number;
    bankSerial?: string;
    bankStartingNumber?: number;
    cashSerial?: string;
    cashStartingNumber?: number;
    employeeSerial?: string;
    employeeStartingNumber?: number;
}

export class CompanySettings {
    constructor(private props: CompanySettingsProps) {}

    get id(): string {
        return this.props.id;
    }
    get companyName(): string {
        return this.props.companyName;
    }
    get currency(): string {
        return this.props.currency;
    }
    get invoiceSerial(): string {
        return this.props.invoiceSerial;
    }
    get invoiceStartingNumber(): number {
        return this.props.invoiceStartingNumber;
    }
    get discountLabel1(): string | undefined {
        return this.props.discountLabel1;
    }
    get discountLabel2(): string | undefined {
        return this.props.discountLabel2;
    }
    get discountLabel3(): string | undefined {
        return this.props.discountLabel3;
    }
    get taxOffice(): string | undefined {
        return this.props.taxOffice;
    }
    get taxNumber(): string | undefined {
        return this.props.taxNumber;
    }
    get address(): string | undefined {
        return this.props.address;
    }
    get phone(): string | undefined {
        return this.props.phone;
    }
    get email(): string | undefined {
        return this.props.email;
    }
    get website(): string | undefined {
        return this.props.website;
    }
    get logoUrl(): string | undefined {
        return this.props.logoUrl;
    }
    get productSerial(): string | undefined {
        return this.props.productSerial;
    }
    get productStartingNumber(): number | undefined {
        return this.props.productStartingNumber;
    }
    get accountSerial(): string | undefined {
        return this.props.accountSerial;
    }
    get accountStartingNumber(): number | undefined {
        return this.props.accountStartingNumber;
    }
    get bankSerial(): string | undefined {
        return this.props.bankSerial;
    }
    get bankStartingNumber(): number | undefined {
        return this.props.bankStartingNumber;
    }
    get cashSerial(): string | undefined {
        return this.props.cashSerial;
    }
    get cashStartingNumber(): number | undefined {
        return this.props.cashStartingNumber;
    }
    get employeeSerial(): string | undefined {
        return this.props.employeeSerial;
    }
    get employeeStartingNumber(): number | undefined {
        return this.props.employeeStartingNumber;
    }

    toObject(): CompanySettingsProps {
        return { ...this.props };
    }

    static create(props: CompanySettingsProps): CompanySettings {
        return new CompanySettings(props);
    }
}
