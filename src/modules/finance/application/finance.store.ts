import { defineStore } from 'pinia';
import type { Account } from '@/modules/finance/domain/account.entity';
import type { Invoice } from '@/modules/finance/domain/invoice.entity';
import { SupabaseFinanceRepository } from '@/modules/finance/infra/supabase-finance.repository';

const financeRepo = new SupabaseFinanceRepository();

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    accounts: [] as Account[],
    invoices: [] as Invoice[],
    loading: false,
    error: null as string | null
  }),

  actions: {
    // Accounts
    async fetchAccounts(filters?: any) {
      this.loading = true;
      const result = await financeRepo.getAccounts(filters);
      if (result.success) this.accounts = result.data;
      this.loading = false;
    },

    async saveAccount(account: Account) {
      const result = await financeRepo.saveAccount(account);
      if (result.success) await this.fetchAccounts();
      return result;
    },

    async deleteAccount(id: string) {
      const result = await financeRepo.deleteAccount(id);
      if (result.success) await this.fetchAccounts();
      return result;
    },

    // Invoices
    async fetchInvoices(filters?: any) {
      this.loading = true;
      const result = await financeRepo.getInvoices(filters);
      if (result.success) this.invoices = result.data;
      this.loading = false;
    },

    async saveInvoice(invoice: Invoice) {
      const result = await financeRepo.saveInvoice(invoice);
      if (result.success) await this.fetchInvoices();
      return result;
    },

    async updateStatus(id: string, status: string) {
      const result = await financeRepo.updateInvoiceStatus(id, status);
      if (result.success) await this.fetchInvoices();
      return result;
    }
  }
});


