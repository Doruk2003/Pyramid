export interface ProductTypeProps {
    id: string;
    name: string;
    companyId?: string; // Multi-tenant altyapısı: şu an tek firma, ileride çoklu firmaya hazır
    isActive?: boolean;
}

export class ProductType {
    constructor(private props: ProductTypeProps) {}
    get id(): string {
        return this.props.id;
    }
    get name(): string {
        return this.props.name;
    }
    get companyId(): string | undefined {
        return this.props.companyId;
    }
    get isActive(): boolean {
        return this.props.isActive ?? true;
    }
    static create(props: ProductTypeProps): ProductType {
        return new ProductType(props);
    }
}
