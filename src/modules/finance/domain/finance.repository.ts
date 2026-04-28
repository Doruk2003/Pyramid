import type { Account, AccountType } from '@/modules/finance/domain/account.entity';
import type { Invoice, InvoiceStatus, InvoiceType } from '@/modules/finance/domain/invoice.entity';
import type { Result } from '@/shared/types/result';

export interface AccountFilters {
    accountType?: AccountType;
    parentId?: string | null;  // null: sadece ana hesaplar, string: belirli ebeveynin altları
}

export interface InvoiceFilters {
    invoiceType?: InvoiceType;
    accountId?: string;
}

export interface IFinanceRepository {
    // Account
    getAccounts(filters?: AccountFilters): Promise<Result<Account[]>>;
    getAccountById(id: string): Promise<Result<Account>>;
    getSubAccounts(parentId: string): Promise<Result<Account[]>>;      // Belirli ana hesabın alt hesapları
    getRootAccounts(): Promise<Result<Account[]>>;                      // Sadece ana hesaplar (parent_id IS NULL)
    saveAccount(account: Account): Promise<Result<void>>;
    deleteAccount(id: string): Promise<Result<void>>;

    // Invoice
    getInvoices(filters?: InvoiceFilters): Promise<Result<Invoice[]>>;
    getInvoiceById(id: string): Promise<Result<Invoice>>;
    saveInvoice(invoice: Invoice): Promise<Result<void>>;
    updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Result<void>>;
    // Soft delete: sadece 'draft' statüsündeki faturalar silinebilir
    deleteInvoice(id: string): Promise<Result<void>>;
}
