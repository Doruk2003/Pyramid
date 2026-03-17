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

    toObject(): CompanySettingsProps {
        return { ...this.props };
    }

    static create(props: CompanySettingsProps): CompanySettings {
        return new CompanySettings(props);
    }
}
