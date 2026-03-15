import type { Role } from '@/modules/admin/domain/role.entity';
import type { Result } from '@/shared/types/result';

export interface IRoleRepository {
  getById(id: string): Promise<Result<Role>>;
  list(): Promise<Result<Role[]>>;
  save(role: Role): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
}


