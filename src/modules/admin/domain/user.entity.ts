export interface UserProps {
    id: string;
    companyId?: string;
    email: string;
    fullName?: string;
    role: 'admin' | 'user' | 'manager' | 'viewer';
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
}

export class User {
    constructor(private props: UserProps) {}

    get id(): string {
        return this.props.id;
    }
    get companyId(): string | undefined {
        return this.props.companyId;
    }
    get email(): string {
        return this.props.email;
    }
    get fullName(): string | undefined {
        return this.props.fullName;
    }
    get role(): 'admin' | 'user' | 'manager' | 'viewer' {
        return this.props.role;
    }
    get isActive(): boolean {
        return this.props.isActive;
    }
    get lastLoginAt(): Date | undefined {
        return this.props.lastLoginAt;
    }
    get createdAt(): Date {
        return this.props.createdAt;
    }

    static create(props: UserProps): User {
        return new User(props);
    }

    // Domain logic example
    isAdmin(): boolean {
        return this.props.role === 'admin';
    }
}
