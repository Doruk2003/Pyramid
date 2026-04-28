export type ProjectStatus = 'planning' | 'active' | 'completed' | 'suspended';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    planning:  'Planlama',
    active:    'Aktif',
    completed: 'Tamamlandı',
    suspended: 'Askıya Alındı'
};

export const PROJECT_STATUS_SEVERITIES: Record<ProjectStatus, string> = {
    planning:  'info',
    active:    'success',
    completed: 'secondary',
    suspended: 'warn'
};

export interface ProjectBudget {
    material:  number;   // Malzeme
    labor:     number;   // İşçilik
    equipment: number;   // Ekipman
    general:   number;   // Genel Gider
}

export interface ProjectProps {
    id: string;
    companyId: string;
    code: string;
    name: string;
    location?: string;
    clientId?: string;           // İşveren cari ID (accounts.id)
    clientName?: string;         // JOIN ile gelen cari adı (UI kolaylığı)
    status: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    budget: ProjectBudget;       // Kategorili bütçe
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class Project {
    constructor(private props: ProjectProps) {}

    get id(): string            { return this.props.id; }
    get companyId(): string     { return this.props.companyId; }
    get code(): string          { return this.props.code; }
    get name(): string          { return this.props.name; }
    get location(): string | undefined  { return this.props.location; }
    get clientId(): string | undefined  { return this.props.clientId; }
    get clientName(): string | undefined { return this.props.clientName; }
    get status(): ProjectStatus { return this.props.status; }
    get startDate(): Date | undefined   { return this.props.startDate; }
    get endDate(): Date | undefined     { return this.props.endDate; }
    get budget(): ProjectBudget { return this.props.budget; }
    get description(): string | undefined { return this.props.description; }
    get isActive(): boolean     { return this.props.isActive; }
    get createdAt(): Date       { return this.props.createdAt; }
    get updatedAt(): Date       { return this.props.updatedAt; }

    /** Toplam bütçe (4 kategori toplamı) */
    get totalBudget(): number {
        return this.props.budget.material
             + this.props.budget.labor
             + this.props.budget.equipment
             + this.props.budget.general;
    }

    static create(props: ProjectProps): Project {
        return new Project(props);
    }

    toObject(): ProjectProps {
        return { ...this.props };
    }
}
