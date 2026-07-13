export interface AuditLogProps {
    id: string;
    tableName: string;
    recordId: string | null;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    changedBy: string | null;
    oldData: any;
    newData: any;
    changedAt: Date;
    userEmail?: string | null;
    userFullName?: string | null;
}

export class AuditLog {
    constructor(private props: AuditLogProps) {}

    get id(): string {
        return this.props.id;
    }
    get tableName(): string {
        return this.props.tableName;
    }
    get recordId(): string | null {
        return this.props.recordId;
    }
    get action(): 'INSERT' | 'UPDATE' | 'DELETE' {
        return this.props.action;
    }
    get changedBy(): string | null {
        return this.props.changedBy;
    }
    get oldData(): any {
        return this.props.oldData;
    }
    get newData(): any {
        return this.props.newData;
    }
    get changedAt(): Date {
        return this.props.changedAt;
    }
    get userEmail(): string | null | undefined {
        return this.props.userEmail;
    }
    get userFullName(): string | null | undefined {
        return this.props.userFullName;
    }

    setUserInfo(email: string | null, fullName: string | null) {
        this.props.userEmail = email;
        this.props.userFullName = fullName;
    }

    static create(props: AuditLogProps): AuditLog {
        return new AuditLog(props);
    }
}
