import { defineStore } from 'pinia';
import type { Account } from '@/modules/finance/domain/account.entity';
import type { Invoice, InvoiceStatus } from '@/modules/finance/domain/invoice.entity';
import type { AccountFilters, InvoiceFilters } from '@/modules/finance/domain/finance.repository';
import { SupabaseFinanceRepository } from '@/modules/finance/infra/supabase-finance.repository';
import { SupabaseProjectRepository } from '@/modules/finance/infra/supabase-project.repository';

const financeRepo = new SupabaseFinanceRepository();
const projectRepo = new SupabaseProjectRepository();

export const useFinanceStore = defineStore('finance', {
    state: () => ({
        accounts: [] as Account[],
        rootAccounts: [] as Account[],          // Sadece ana hesaplar (parent_id IS NULL)
        subAccounts: [] as Account[],           // Aktif ana hesabın alt hesapları
        invoices: [] as Invoice[],
        projects: [] as any[],                  // Projeler listesi
        loading: false,
        error: null as string | null
    }),

    actions: {
        // Accounts — tüm liste (filtre opsiyonel)
        async fetchAccounts(filters?: AccountFilters) {
            this.loading = true;
            const result = await financeRepo.getAccounts(filters);
            if (result.success) this.accounts = result.data;
            this.loading = false;
        },

        // Sadece ana hesaplar (parent_id IS NULL) — form dropdown'ları için
        async fetchRootAccounts() {
            const result = await financeRepo.getRootAccounts();
            if (result.success) this.rootAccounts = result.data;
        },

        // Belirli bir ana hesabın alt hesapları
        async fetchSubAccounts(parentId: string) {
            this.loading = true;
            const result = await financeRepo.getSubAccounts(parentId);
            if (result.success) this.subAccounts = result.data;
            else this.subAccounts = [];
            this.loading = false;
        },

        // Tekil cari hesap getir (sub-account düzenleme için)
        async getAccountById(id: string) {
            return await financeRepo.getAccountById(id);
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
                this.rootAccounts = this.rootAccounts.filter((a) => a.id !== id);
                this.subAccounts = this.subAccounts.filter((a) => a.id !== id);
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
        },
        
        // Projects
        async fetchProjects() {
            this.loading = true;
            const result = await projectRepo.getProjects();
            if (result.success) this.projects = result.data;
            this.loading = false;
        }
    }
});
