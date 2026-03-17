export interface BrandProps {
    id: string;
    name: string;
}

export class Brand {
    constructor(private props: BrandProps) {}
    get id(): string {
        return this.props.id;
    }
    get name(): string {
        return this.props.name;
    }
    static create(props: BrandProps): Brand {
        return new Brand(props);
    }
}
