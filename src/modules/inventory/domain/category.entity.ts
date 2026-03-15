export interface CategoryProps {
  id: string;
  name: string;
}

export class Category {
  constructor(private props: CategoryProps) {}
  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  static create(props: CategoryProps): Category { return new Category(props); }
}

