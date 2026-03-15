import type { Account } from '@/modules/finance/domain/account.entity';
import type { Invoice } from '@/modules/finance/domain/invoice.entity';
import type { Result } from '@/shared/types/result';

export interface IFinanceRepository {
  // Account
  getAccounts(filters?: any): Promise<Result<Account[]>>;
  getAccountById(id: string): Promise<Result<Account>>;
  saveAccount(account: Account): Promise<Result<void>>;
  deleteAccount(id: string): Promise<Result<void>>;

  // Invoice
  getInvoices(filters?: any): Promise<Result<Invoice[]>>;
  getInvoiceById(id: string): Promise<Result<Invoice>>;
  saveInvoice(invoice: Invoice): Promise<Result<void>>;
  updateInvoiceStatus(id: string, status: string): Promise<Result<void>>;
}


