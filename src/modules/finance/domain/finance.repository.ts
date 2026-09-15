import type { Account, AccountType } from '@/modules/finance/domain/account.entity';
import type { Invoice, InvoiceStatus, InvoiceType } from '@/modules/finance/domain/invoice.entity';
import type { CashRegister } from '@/modules/finance/domain/cash-register.entity';
import type { Payment } from '@/modules/finance/domain/payment.entity';
import type { ChequeNote, ChequeNoteDirection, ChequeNoteStatus, ChequeNoteType } from '@/modules/finance/domain/cheque-note.entity';
import type { FiscalYear } from '@/modules/finance/domain/fiscal-year.entity';
import type { Result } from '@/shared/types/result';

export interface AccountFilters {
    accountType?: AccountType;
    parentId?: string | null;  // null: sadece ana hesaplar, string: belirli ebeveynin altları
}

export interface InvoiceFilters {
    invoiceType?: InvoiceType;
    accountId?: string;
}

export interface PaymentFilters {
    accountId?: string;
    cashRegisterId?: string;
    paymentType?: 'collection' | 'payment' | 'debit_note' | 'credit_note';
}

export interface ChequeNoteFilters {
    type?: ChequeNoteType;
    direction?: ChequeNoteDirection;
    status?: ChequeNoteStatus;
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
    deleteInvoice(id: string): Promise<Result<void>>;
    getNextInvoiceNumber(serial: string, startingNumber: number): Promise<Result<string>>;

    // Cash Register
    getCashRegisters(): Promise<Result<CashRegister[]>>;
    getCashRegisterById(id: string): Promise<Result<CashRegister>>;
    saveCashRegister(register: CashRegister): Promise<Result<void>>;

    // Payment
    getPayments(filters?: PaymentFilters): Promise<Result<Payment[]>>;
    getPaymentById(id: string): Promise<Result<Payment>>;
    savePayment(payment: Payment): Promise<Result<void>>;
    deletePayment(id: string): Promise<Result<void>>;

    // Cheque & Note
    getChequeNotes(filters?: ChequeNoteFilters): Promise<Result<ChequeNote[]>>;
    getChequeNoteById(id: string): Promise<Result<ChequeNote>>;
    saveChequeNote(item: ChequeNote): Promise<Result<void>>;
    updateChequeNoteStatus(id: string, status: ChequeNoteStatus, cashRegisterId?: string): Promise<Result<void>>;
    deleteChequeNote(id: string): Promise<Result<void>>;

    // Fiscal Years & Period Closing
    getFiscalYears(): Promise<Result<FiscalYear[]>>;
    closeFiscalYear(year: number, closedByUserId?: string): Promise<Result<{ transferredAccountsCount: number; message: string }>>;
    reopenFiscalYear(year: number): Promise<Result<void>>;

    // Reports
    getAccountBalancesReport(currency?: string): Promise<Result<AccountBalanceReportItem[]>>;
    getAccountStatementReport(
        accountId: string,
        startDate?: Date | null,
        endDate?: Date | null,
        currency?: string | null
    ): Promise<Result<AccountStatementReportData>>;
    getAccountReconciliation(
        accountId: string,
        asOfDate: Date,
        currency?: string
    ): Promise<Result<AccountReconciliationData>>;
}

export interface AccountBalanceReportItem {
    id: string;
    code: string;
    name: string;
    accountType: string;
    phone: string;
    authorizedPerson: string;
    currency: string;
    debit: number;
    credit: number;
    balance: number;
    rawBalance: number;
    balanceType: string;
}

export interface AccountStatementRow {
    id: string;
    date: Date;
    invoiceNumber: string;
    invoiceType: string;
    currency?: string;
    exchangeRate?: number;
    notes: string;
    debit: number;
    credit: number;
    cumulativeBalance: number;
    cumulativeBalanceType: string;
}

export interface AccountStatementReportData {
    initialBalance: number;
    initialBalanceType: string;
    rawInitialBalance: number;
    rows: AccountStatementRow[];
    periodDebitTotal: number;
    periodCreditTotal: number;
    finalBalance: number;
    finalBalanceType: string;
}

export interface AccountReconciliationData {
    asOfDate: Date;
    currency: string;
    account: {
        id: string;
        code?: string;
        name: string;
        taxOffice?: string;
        taxNumber?: string;
        phone?: string;
        email?: string;
        address?: string;
        authorizedPerson?: string;
        city?: string;
        district?: string;
    };
    company: {
        name: string;
        taxOffice?: string;
        taxNumber?: string;
        phone?: string;
        email?: string;
        address?: string;
    };
    financials: {
        debitTotal: number;
        creditTotal: number;
        balance: number;
        balanceType: string;
        baCount: number;
        baTotal: number;
        bsCount: number;
        bsTotal: number;
    };
}

