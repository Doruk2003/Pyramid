export type AccountType = 'customer' | 'supplier' | 'both';

export interface AccountProps {
  id: string;
  companyId: string;
  accountType: AccountType;
  name: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: any;
  creditLimit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Account {
  constructor(private props: AccountProps) {}

  get id(): string { return this.props.id; }
  get companyId(): string { return this.props.companyId; }
  get accountType(): AccountType { return this.props.accountType; }
  get name(): string { return this.props.name; }
  get taxNumber(): string | undefined { return this.props.taxNumber; }
  get email(): string | undefined { return this.props.email; }
  get phone(): string | undefined { return this.props.phone; }
  get address(): any { return this.props.address; }
  get creditLimit(): number { return this.props.creditLimit; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(props: AccountProps): Account {
    return new Account(props);
  }

  toObject(): AccountProps {
    return { ...this.props };
  }
}

