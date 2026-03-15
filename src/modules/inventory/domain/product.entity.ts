export interface ProductProps {
  id: string;
  companyId: string;
  code?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  inventoryStatus?: string;
  rating?: number;
  categoryId?: string;
  brandId?: string;
  typeId?: string;
  currencyId?: string;
  taxRate?: number;
  priceUnit?: string;
  minStock?: number;
  maxStock?: number;
  barcode?: string;
  initialStock?: number;
  status: string;
  images?: string[];
  createdAt: Date;
}

export class Product {
  constructor(private props: ProductProps) {}

  get id(): string { return this.props.id; }
  get companyId(): string { return this.props.companyId; }
  get code(): string | undefined { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get image(): string | undefined { return this.props.image; }
  get price(): number { return this.props.price; }
  get inventoryStatus(): string | undefined { return this.props.inventoryStatus; }
  get rating(): number | undefined { return this.props.rating; }
  get categoryId(): string | undefined { return this.props.categoryId; }
  get brandId(): string | undefined { return this.props.brandId; }
  get typeId(): string | undefined { return this.props.typeId; }
  get currencyId(): string | undefined { return this.props.currencyId; }
  get taxRate(): number | undefined { return this.props.taxRate; }
  get priceUnit(): string | undefined { return this.props.priceUnit; }
  get minStock(): number | undefined { return this.props.minStock; }
  get maxStock(): number | undefined { return this.props.maxStock; }
  get barcode(): string | undefined { return this.props.barcode; }
  get initialStock(): number | undefined { return this.props.initialStock; }
  get status(): string { return this.props.status; }
  get images(): string[] | undefined { return this.props.images; }
  get createdAt(): Date { return this.props.createdAt; }

  static create(props: ProductProps): Product {
    return new Product(props);
  }

  toObject(): ProductProps {
    return { ...this.props };
  }
}

