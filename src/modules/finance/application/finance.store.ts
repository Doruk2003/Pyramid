import { defineStore } from 'pinia';
import type { Account } from '@/modules/finance/domain/account.entity';
import type { Invoice, InvoiceStatus } from '@/modules/finance/domain/invoice.entity';
import type { AccountFilters, InvoiceFilters } from '@/modules/finance/domain/finance.repository';
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
        async fetchAccounts(filters?: AccountFilters) {
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
            if (result.success) {
                // Optimistic: silinen hesabı store'dan anında kaldır
                this.accounts = this.accounts.filter((a) => a.id !== id);
            }
            return result;
        },

        // Invoices
        async fetchInvoices(filters?: InvoiceFilters) {
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

        async updateStatus(id: string, status: InvoiceStatus) {
            const result = await financeRepo.updateInvoiceStatus(id, status);
            if (result.success) await this.fetchInvoices();
            return result;
        },

        // Soft delete: sadece 'draft' statüsündeki faturalar silinebilir
        async deleteInvoice(id: string) {
            const result = await financeRepo.deleteInvoice(id);
            if (result.success) {
                // Store'dan anında kaldır (UI güncelle)
                this.invoices = this.invoices.filter((inv) => inv.id !== id);
            }
            return result;
        }
    }
});
