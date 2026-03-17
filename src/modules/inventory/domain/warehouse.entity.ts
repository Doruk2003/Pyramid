export interface WarehouseProps {
    id: string;
    companyId: string;
    name: string;
    location?: string;
    isActive: boolean;
    createdAt: Date;
}

export class Warehouse {
    constructor(private props: WarehouseProps) {}
    get id(): string {
        return this.props.id;
    }
    get name(): string {
        return this.props.name;
    }
    get location(): string | undefined {
        return this.props.location;
    }
    static create(props: WarehouseProps): Warehouse {
        return new Warehouse(props);
    }
    toObject(): WarehouseProps {
        return { ...this.props };
    }
}
