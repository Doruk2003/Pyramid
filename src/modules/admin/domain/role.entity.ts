export interface Permission {
  id: string;
  name: string;
  code: string; // örn: 'INV_READ', 'FIN_CREATE'
  description?: string;
}

export interface RoleProps {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export class Role {
  constructor(private props: RoleProps) {}

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get permissions(): Permission[] { return this.props.permissions; }

  static create(props: RoleProps): Role {
    return new Role(props);
  }
}

