import type { Account } from '@/modules/finance/domain/account.entity';
import type { CashRegister } from '@/modules/finance/domain/cash-register.entity';
import type { AccountFilters, InvoiceFilters, PaymentFilters } from '@/modules/finance/domain/finance.repository';
import type { Invoice, InvoiceStatus } from '@/modules/finance/domain/invoice.entity';
import { Payment } from '@/modules/finance/domain/payment.entity';
import { SupabaseFinanceRepository } from '@/modules/finance/infra/supabase-finance.repository';
import { defineStore } from 'pinia';

const financeRepo = new SupabaseFinanceRepository();

export const useFinanceStore = defineStore('finance', {
    state: () => ({
        accounts: [] as Account[],
        rootAccounts: [] as Account[],          // Sadece ana hesaplar (parent_id IS NULL)
        subAccounts: [] as Account[],           // Aktif ana hesabın alt hesapları
        invoices: [] as Invoice[],
        cashRegisters: [] as CashRegister[],    // Kasalar/Bankalar
        payments: [] as Payment[],              // Kasa hareketleri / Tahsilatlar / Ödemeler
        loadingAccounts: false,
        loadingSubAccounts: false,
        loadingInvoices: false,
        loadingCashRegisters: false,
        loadingPayments: false,
        error: null as string | null
    }),

    getters: {
        loading(state): boolean {
            return state.loadingAccounts ||
                   state.loadingSubAccounts ||
                   state.loadingInvoices ||
                   state.loadingCashRegisters ||
                   state.loadingPayments;
        }
    },

    actions: {
        // Accounts — tüm liste (filtre opsiyonel)
        async fetchAccounts(filters?: AccountFilters) {
            this.loadingAccounts = true;
            try {
                const result = await financeRepo.getAccounts(filters);
                if (result.success) this.accounts = result.data;
            } finally {
                this.loadingAccounts = false;
            }
        },

        // Sadece ana hesaplar (parent_id IS NULL) — form dropdown'ları için
        async fetchRootAccounts() {
            const result = await financeRepo.getRootAccounts();
            if (result.success) this.rootAccounts = result.data;
        },

        // Belirli bir ana hesabın alt hesapları
        async fetchSubAccounts(parentId: string) {
            this.loadingSubAccounts = true;
            try {
                const result = await financeRepo.getSubAccounts(parentId);
                if (result.success) this.subAccounts = result.data;
                else this.subAccounts = [];
            } finally {
                this.loadingSubAccounts = false;
            }
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
            this.loadingInvoices = true;
            try {
                const result = await financeRepo.getInvoices(filters);
                if (result.success) this.invoices = result.data;
            } finally {
                this.loadingInvoices = false;
            }
        },

        async saveInvoice(invoice: Invoice) {
            const result = await financeRepo.saveInvoice(invoice);
            if (result.success) await this.fetchInvoices();
            return result;
        },

        /**
         * Sonraki güvenli fatura numarasını DB'den üretir.
         * View katmanı artık store belleğinden saymaz; doğrudan DB'ye sorgu atılır.
         *
         * @param serial           - Ayarlardan gelen seri öneki ("ABC" gibi)
         * @param startingNumber   - Seri için başlangıç numarası
         * @returns Güvenli çerçevede üretilen numara veya null (hata durumunda)
         */
        async fetchNextInvoiceNumber(serial: string, startingNumber: number): Promise<string | null> {
            const result = await financeRepo.getNextInvoiceNumber(serial, startingNumber);
            if (result.success) return result.data;
            console.warn('[FinanceStore] fetchNextInvoiceNumber hatası:', result.error.message);
            return null;
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


        // Cash Registers
        async fetchCashRegisters() {
            this.loadingCashRegisters = true;
            try {
                const result = await financeRepo.getCashRegisters();
                if (result.success) this.cashRegisters = result.data;
            } finally {
                this.loadingCashRegisters = false;
            }
        },

        async saveCashRegister(register: CashRegister) {
            const result = await financeRepo.saveCashRegister(register);
            if (result.success) await this.fetchCashRegisters();
            return result;
        },

        // Payments
        async fetchPayments(filters?: PaymentFilters) {
            this.loadingPayments = true;
            try {
                const result = await financeRepo.getPayments(filters);
                if (result.success) this.payments = result.data;
            } finally {
                this.loadingPayments = false;
            }
        },

        async getPaymentById(id: string) {
            return await financeRepo.getPaymentById(id);
        },

        async savePayment(payment: Payment) {
            const result = await financeRepo.savePayment(payment);
            if (result.success) await this.fetchPayments();
            return result;
        },

        async deletePayment(id: string) {
            const result = await financeRepo.deletePayment(id);
            if (result.success) {
                this.payments = this.payments.map((p) => p.id === id ? Payment.create({ ...p.toObject(), status: 'cancelled' }) : p);
            }
            return result;
        }
    }
});
