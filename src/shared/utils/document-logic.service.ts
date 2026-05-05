import type { ProductProps } from '@/modules/inventory/domain/product.entity';

export interface ProductWithCategory extends Partial<ProductProps> {
    categoryName?: string;
}

export class DocumentLogicService {
    /**
     * Maps product and account information to determine the correct discount type and rates.
     */
    static getProductDiscount(product: ProductWithCategory, account?: any, settings?: any): number {
        let discountType = product.categoryDiscount || 0;

        // If product has no specific discount type, try to match by category name in settings labels
        if (!discountType && product.categoryId && settings) {
            const categoryName = product.categoryName || ''; // Category name should be available or fetched
            if (categoryName) {
                const matchCategory = (label: string, catName: string) => {
                    if (!label || label.toLocaleLowerCase('tr-TR').startsWith('bayi')) return false;
                    const l = label.toLocaleLowerCase('tr-TR').trim();
                    const c = catName.toLocaleLowerCase('tr-TR').trim();
                    if (l.includes(c) || c.includes(l)) return true;
                    return false;
                };

                if (matchCategory(settings.discountLabel1 || '', categoryName)) discountType = 1;
                else if (matchCategory(settings.discountLabel2 || '', categoryName)) discountType = 2;
                else if (matchCategory(settings.discountLabel3 || '', categoryName)) discountType = 3;
            }
        }

        return discountType;
    }

    static applyAccountDealerDiscount(discountType: number, account: any): { d1: number, d2: number, d3: number } {
        const result = { d1: 0, d2: 0, d3: 0 };
        if (!account) return result;

        if (discountType === 1) result.d1 = account.dealerDiscount1 || 0;
        else if (discountType === 2) result.d2 = account.dealerDiscount2 || 0;
        else if (discountType === 3) result.d3 = account.dealerDiscount3 || 0;

        return result;
    }
}
