export type MovementType = 'in' | 'out' | 'transfer' | 'adjustment';

export interface StockMovementProps {
    id: string;
    companyId: string;
    productId: string;
    warehouseId: string;
    movementType: MovementType;
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    note?: string;
    createdBy: string;
    createdAt: Date;
}

export class StockMovement {
    constructor(private props: StockMovementProps) {}
    get id(): string {
        return this.props.id;
    }
    get productId(): string {
        return this.props.productId;
    }
    get warehouseId(): string {
        return this.props.warehouseId;
    }
    get quantity(): number {
        return this.props.quantity;
    }
    get movementType(): MovementType {
        return this.props.movementType;
    }
    get createdAt(): Date {
        return this.props.createdAt;
    }
    static create(props: StockMovementProps): StockMovement {
        return new StockMovement(props);
    }
    toObject(): StockMovementProps {
        return { ...this.props };
    }
}
