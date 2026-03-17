export interface ProductTypeProps {
    id: string;
    name: string;
}

export class ProductType {
    constructor(private props: ProductTypeProps) {}
    get id(): string {
        return this.props.id;
    }
    get name(): string {
        return this.props.name;
    }
    static create(props: ProductTypeProps): ProductType {
        return new ProductType(props);
    }
}
