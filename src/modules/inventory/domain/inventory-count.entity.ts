export interface InventoryCountItemProps {
    id: string;
    countId: string;
    productId: string;
    systemQty: number;
    countedQty: number;
    difference: number;
}

export interface InventoryCountProps {
    id: string;
    companyId: string;
    warehouseId: string;
    countedAt: Date;
    createdBy: string;
    note?: string;
    itemCount: number;
    createdAt: Date;
    items?: InventoryCountItemProps[];
}

export class InventoryCount {
    constructor(private props: InventoryCountProps) {}

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get warehouseId(): string { return this.props.warehouseId; }
    get countedAt(): Date { return this.props.countedAt; }
    get createdBy(): string { return this.props.createdBy; }
    get note(): string | undefined { return this.props.note; }
    get itemCount(): number { return this.props.itemCount; }
    get createdAt(): Date { return this.props.createdAt; }
    get items(): InventoryCountItemProps[] { return this.props.items || []; }

    static create(props: InventoryCountProps): InventoryCount {
        return new InventoryCount(props);
    }

    toObject(): InventoryCountProps {
        return { ...this.props };
    }
}
