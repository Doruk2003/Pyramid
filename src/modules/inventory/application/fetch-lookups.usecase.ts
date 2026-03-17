import type { ILookupRepository } from '@/modules/inventory/domain/lookup.repository';
import type { Result } from '@/shared/types/result';

export class FetchLookupsUseCase {
    constructor(private lookupRepo: ILookupRepository) {}

    async execute() {
        return await Promise.all([this.lookupRepo.getCategories(), this.lookupRepo.getBrands(), this.lookupRepo.getProductTypes(), this.lookupRepo.getCurrencies()]);
    }
}
