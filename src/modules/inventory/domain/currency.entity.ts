export interface CurrencyProps {
    id: string;
    code: string;
    name: string;
}

export class Currency {
    constructor(private props: CurrencyProps) {}
    get id(): string {
        return this.props.id;
    }
    get code(): string {
        return this.props.code;
    }
    get name(): string {
        return this.props.name;
    }
    static create(props: CurrencyProps): Currency {
        return new Currency(props);
    }
}
