export interface CategoryProps {
    id: string;
    name: string;
    companyId?: string; // Multi-tenant altyapısı: şu an tek firma, ileride çoklu firmaya hazır
    parentId?: string;  // Hiyerarşik kategori desteği
    isActive?: boolean;
}

export class Category {
    constructor(private props: CategoryProps) {}
    get id(): string {
        return this.props.id;
    }
    get name(): string {
        return this.props.name;
    }
    get companyId(): string | undefined {
        return this.props.companyId;
    }
    get parentId(): string | undefined {
        return this.props.parentId;
    }
    get isActive(): boolean {
        return this.props.isActive ?? true;
    }
    static create(props: CategoryProps): Category {
        return new Category(props);
    }
}
