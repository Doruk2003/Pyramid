import { supabase } from '@/lib/supabase';
import { Account, type AddressValue } from '@/modules/finance/domain/account.entity';
import { Invoice, type InvoiceLineProps, type InvoiceStatus, type InvoiceType, type PaymentType, type DocumentCategory } from '@/modules/finance/domain/invoice.entity';
import { CashRegister } from '@/modules/finance/domain/cash-register.entity';
import { Payment } from '@/modules/finance/domain/payment.entity';
import { ChequeNote, type ChequeNoteStatus } from '@/modules/finance/domain/cheque-note.entity';
import { FiscalYear } from '@/modules/finance/domain/fiscal-year.entity';
import type { AccountFilters, IFinanceRepository, InvoiceFilters, PaymentFilters, ChequeNoteFilters, AccountBalanceReportItem, AccountStatementReportData, AccountReconciliationData } from '@/modules/finance/domain/finance.repository';
import { ok, err, type Result } from '@/shared/types/result';
import type { DbAccount, DbInvoice, DbInvoiceLine } from '@/shared/infra/db-types';


function normalizeAddress(address: unknown): AddressValue {
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object' && 'text' in address) {
        const value = (address as { text?: unknown }).text;
        if (typeof value === 'string') return value;
    }
    return null;
}

function rowToAccount(row: DbAccount): Account {
    return Account.create({
        id: row.id,
        companyId: row.company_id,
        code: row.code,
        parentId: row.parent_id ?? undefined,
        accountType: row.account_type as 'customer' | 'supplier' | 'both',
        name: row.name,
        taxNumber: row.tax_number,
        taxOffice: row.tax_office,
        email: row.email,
        phone: row.phone,
        address: normalizeAddress(row.address),
        authorizedPerson: row.authorized_person,
        authorizedGsm: row.authorized_gsm,
        city: row.city,
        district: row.district,
        country: row.country,
        bankName: row.bank_name,
        accountOwner: row.account_owner,
        iban: row.iban,
        description: row.description,
        isDealer: row.is_dealer,
        dealerDiscount1: row.dealer_discount1 !== undefined ? Number(row.dealer_discount1) : undefined,
        dealerDiscount2: row.dealer_discount2 !== undefined ? Number(row.dealer_discount2) : undefined,
        dealerDiscount3: row.dealer_discount3 !== undefined ? Number(row.dealer_discount3) : undefined,
        creditLimit: Number(row.credit_limit),
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    });
}

// K4 — Tekrarlayan satır mapping kodu tek fonksiyona çekildi (DRY)
function rowToInvoiceLine(l: any): InvoiceLineProps {
    return {
        id: l.id,
        invoiceId: l.invoice_id,
        productId: l.product_id,
        warehouseId: l.warehouse_id,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unit_price),
        originalPrice: l.original_price ? Number(l.original_price) : undefined,
        originalCurrency: l.original_currency,
        vatRate: Number(l.vat_rate),
        discountRate1: Number(l.discount_rate1),
        discountRate2: Number(l.discount_rate2),
        discountRate3: Number(l.discount_rate3),
        withholdingRate: Number(l.withholding_rate || 0),
        withholdingAmount: Number(l.withholding_amount || 0),
        lineTotal: Number(l.line_total),
        sourceLineId: l.source_line_id
    };
}

function rowToInvoice(row: any): Invoice {
    return Invoice.create({
        id: row.id,
        companyId: row.company_id,
        invoiceType: row.invoice_type as InvoiceType,
        invoiceNumber: row.invoice_number,
        accountId: row.account_id,
        warehouseId: row.warehouse_id,
        projectId: row.project_id ?? undefined,
        issueDate: new Date(row.issue_date),
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        status: row.status as InvoiceStatus,
        paymentType: (row.payment_type as PaymentType) || 'cash',
        subtotal: Number(row.subtotal),
        discountRate: Number(row.discount_rate || 0),
        discountAmount: Number(row.discount_amount || 0),
        vatTotal: Number(row.vat_total),
        withholdingTotal: Number(row.withholding_total || 0),
        total: Number(row.total),
        paidAmount: Number(row.paid_amount),
        currency: row.currency,
        exchangeRate: Number(row.exchange_rate),
        notes: row.notes,
        sourceType: (row.source_type as 'quote' | 'order' | undefined) ?? undefined,
        sourceIds: row.source_ids,
        documentCategory: (row.document_category as DocumentCategory) || 'domestic',
        lines: (row.invoice_lines || []).map(rowToInvoiceLine),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    });
}


function rowToCashRegister(row: any): CashRegister {
    return CashRegister.create({
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        type: row.type as 'cash' | 'bank' | 'check_note' | 'credit_card',
        currency: row.currency,
        description: row.description ?? undefined,
        isActive: row.is_active,
        balance: row.balance !== undefined ? Number(row.balance) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    });
}

function rowToPayment(row: any): Payment {
    return Payment.create({
        id: row.id,
        companyId: row.company_id,
        invoiceId: row.invoice_id ?? undefined,
        accountId: row.account_id ?? undefined,
        paymentDate: new Date(row.payment_date),
        amount: Number(row.amount),
        paymentMethod: row.payment_method as 'cash' | 'bank' | 'check' | 'credit_card',
        description: row.description ?? undefined,
        createdAt: new Date(row.created_at),
        paymentType: (row.payment_type as 'collection' | 'payment' | 'debit_note' | 'credit_note') || 'collection',
        cashRegisterId: row.cash_register_id ?? undefined,
        documentNumber: row.document_number ?? undefined,
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        status: (row.status as 'pending' | 'completed' | 'cancelled') || 'completed',
        updatedAt: new Date(row.updated_at),
        accountName: row.accounts?.name || undefined,
        invoiceNumber: row.invoices?.invoice_number || undefined
    });
}

function rowToChequeNote(row: any): ChequeNote {
    return ChequeNote.create({
        id: row.id,
        companyId: row.company_id,
        type: row.type,
        direction: row.direction,
        serialNumber: row.serial_number,
        bankName: row.bank_name ?? undefined,
        bankBranch: row.bank_branch ?? undefined,
        accountNumber: row.account_number ?? undefined,
        drawer: row.drawer ?? undefined,
        accountId: row.account_id ?? undefined,
        issueDate: new Date(row.issue_date),
        dueDate: new Date(row.due_date),
        amount: Number(row.amount),
        currency: row.currency,
        status: row.status,
        cashRegisterId: row.cash_register_id ?? undefined,
        notes: row.notes ?? undefined,
        createdBy: row.created_by ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        accountName: row.accounts?.name || undefined,
        cashRegisterName: row.cash_registers?.name || undefined
    });
}

function rowToFiscalYear(row: any): FiscalYear {
    return FiscalYear.create({
        id: row.id,
        companyId: row.company_id,
        year: row.year,
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        status: row.status,
        closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
        closedBy: row.closed_by ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    });
}

export class SupabaseFinanceRepository implements IFinanceRepository {

    async getAccounts(filters?: AccountFilters): Promise<Result<Account[]>> {
        let query = supabase
            .from('accounts')
            .select('*')
            .eq('is_active', true)
            .is('deleted_at', null); // Soft-delete: silinen cari hesaplar gizlenir
        if (filters?.accountType) query = query.eq('account_type', filters.accountType);
        // parentId filtresi: null ise sadece ana hesaplar, string ise o parent'ın alt hesapları
        if (filters?.parentId === null) {
            query = query.is('parent_id', null);
        } else if (filters?.parentId) {
            query = query.eq('parent_id', filters.parentId);
        }

        const { data, error } = await query.order('name', { ascending: true });
        if (error) return err(new Error(error.message));

        return ok(((data as DbAccount[]) || []).map(rowToAccount));
    }

    async getSubAccounts(parentId: string): Promise<Result<Account[]>> {
        // Belirli bir ana hesabın doğrudan alt hesaplarını getirir
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('parent_id', parentId)
            .is('deleted_at', null)
            .order('name', { ascending: true });
        if (error) return err(new Error(error.message));
        return ok(((data as DbAccount[]) || []).map(rowToAccount));
    }

    async getRootAccounts(): Promise<Result<Account[]>> {
        // Sadece parent_id IS NULL olan (ana) hesapları getirir
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .is('parent_id', null)
            .is('deleted_at', null)
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error) return err(new Error(error.message));
        return ok(((data as DbAccount[]) || []).map(rowToAccount));
    }

    async getAccountById(id: string): Promise<Result<Account>> {
        const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
        if (error) return err(new Error(error.message));
        return ok(rowToAccount(data as DbAccount));
    }

    async saveAccount(account: Account): Promise<Result<void>> {
        const obj = account.toObject();
        const { error } = await supabase.from('accounts').upsert({
            id: obj.id || undefined,
            company_id: obj.companyId,
            code: obj.code,
            parent_id: obj.parentId ?? null,   // Alt hesap bağlantısı
            account_type: obj.accountType,
            name: obj.name,
            tax_number: obj.taxNumber,
            tax_office: obj.taxOffice,
            email: obj.email,
            phone: obj.phone,
            address: obj.address,
            authorized_person: obj.authorizedPerson,
            authorized_gsm: obj.authorizedGsm,
            city: obj.city,
            district: obj.district,
            country: obj.country,
            bank_name: obj.bankName,
            account_owner: obj.accountOwner,
            iban: obj.iban,
            description: obj.description,
            is_dealer: obj.isDealer,
            dealer_discount1: obj.dealerDiscount1,
            dealer_discount2: obj.dealerDiscount2,
            dealer_discount3: obj.dealerDiscount3,
            credit_limit: obj.creditLimit,
            is_active: obj.isActive
        });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteAccount(id: string): Promise<Result<void>> {
        // Soft delete: is_active = false + deleted_at damgalanır.
        // Her iki alan da RLS politikasında kontrol edilir.
        const { error } = await supabase
            .from('accounts')
            .update({ is_active: false, deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async getInvoices(filters?: InvoiceFilters): Promise<Result<Invoice[]>> {
        let query = supabase
            .from('invoices')
            .select('*, invoice_lines(*)')
            .is('deleted_at', null); // Soft-delete: iptal edilmiş/silinen faturalar gizlenir
        if (filters?.invoiceType) query = query.eq('invoice_type', filters.invoiceType);
        if (filters?.accountId) query = query.eq('account_id', filters.accountId);

        const { data, error } = await query.order('issue_date', { ascending: false });
        if (error) return err(new Error(error.message));

        // K4 — rowToInvoice() helper kullanılıyor (tekrar eden mapping kaldırıldı)
        return ok(((data as DbInvoice[]) || []).map(rowToInvoice));
    }

    async getInvoiceById(id: string): Promise<Result<Invoice>> {
        const { data, error } = await supabase.from('invoices').select('*, invoice_lines(*)').eq('id', id).single();
        if (error) return err(new Error(error.message));
        // K4 — rowToInvoice() helper kullanılıyor
        return ok(rowToInvoice(data as DbInvoice));
    }

    async saveInvoice(invoice: Invoice): Promise<Result<void>> {
        const obj = invoice.toObject();

        // 1) Fatura numarası: boşsa DB'den atomik olarak al
        let invoiceNumber = obj.invoiceNumber?.trim();
        if (!invoiceNumber) {
            const { data: seqData, error: seqError } = await supabase.rpc('get_next_invoice_number');
            if (seqError || !seqData) {
                // RPC mevcut değil veya başarısız — fatura numarası zorunlu; hata döndür.
                // Eski count-tabanlı fallback kaldırıldı: race condition'a yol açıyordu.
                return err(new Error(
                    `Fatura numarası üretilemedi: ${seqError?.message ?? 'Bilinmeyen hata'}. ` +
                    `Lütfen fatura numarasını manuel olarak girin veya veritabanı yöneticinize başvurun.`
                ));
            }
            invoiceNumber = seqData as string;
        }

        const savedId = obj.id || crypto.randomUUID();

        // Prepare the invoice header object matching the database schema
        const invoiceHeader = {
            id: savedId,
            company_id: obj.companyId,
            invoice_type: obj.invoiceType,
            invoice_number: invoiceNumber,
            account_id: obj.accountId,
            warehouse_id: obj.warehouseId || null,
            project_id: obj.projectId || null,
            issue_date: obj.issueDate instanceof Date ? obj.issueDate.toISOString().split('T')[0] : obj.issueDate,
            due_date: obj.dueDate instanceof Date ? obj.dueDate.toISOString().split('T')[0] : (obj.dueDate || null),
            status: obj.status,
            payment_type: obj.paymentType,
            document_category: obj.documentCategory,
            subtotal: obj.subtotal,
            discount_rate: obj.discountRate,
            discount_amount: obj.discountAmount,
            vat_total: obj.vatTotal,
            withholding_total: obj.withholdingTotal || 0,
            total: obj.total,
            paid_amount: obj.paidAmount,
            currency: obj.currency,
            exchange_rate: obj.exchangeRate,
            notes: obj.notes ?? null,
            source_type: obj.sourceType ?? null,
            source_ids: obj.sourceIds ?? null
        };

        // Prepare the lines array matching the database schema
        const invoiceLines = obj.lines.map((l) => ({
            id: l.id || crypto.randomUUID(),
            invoice_id: savedId,
            product_id: l.productId || null,
            warehouse_id: l.warehouseId || null,
            description: l.description ?? null,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            original_price: l.originalPrice,
            original_currency: l.originalCurrency,
            vat_rate: l.vatRate,
            discount_rate1: l.discountRate1,
            discount_rate2: l.discountRate2,
            discount_rate3: l.discountRate3,
            withholding_rate: l.withholdingRate || 0,
            withholding_amount: l.withholdingAmount || 0,
            line_total: l.lineTotal,
            source_line_id: l.sourceLineId || null
        }));


        // Call the secure RPC function to perform upsert/delete/insert atomically
        const { error } = await supabase.rpc('save_invoice_with_lines', {
            p_invoice: invoiceHeader,
            p_lines: invoiceLines
        });

        if (error) {
            return err(new Error(`Fatura kaydedilemedi: ${error.message}`));
        }

        return ok(undefined);
    }


    async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Result<void>> {
        if (status === 'cancelled') {
            // Güvenlik kısıtı: Faturaya bağlı aktif/tamamlanmış ödeme var mı kontrol et
            const { data: payments, error: payErr } = await supabase
                .from('payments')
                .select('id, amount')
                .eq('invoice_id', id)
                .eq('status', 'completed');

            if (payErr) return err(new Error(`Fatura durum kontrolü başarısız: ${payErr.message}`));
            if (payments && payments.length > 0) {
                const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
                return err(new Error(
                    `Bu faturaya bağlı ${payments.length} adet tamamlanmış ödeme/tahsilat kaydı (Toplam: ${totalPaid.toFixed(2)}) bulunmaktadır.\n` +
                    `Faturayı iptal etmek için önce bağlı tahsilat/ödeme kayıtlarını iptal etmelisiniz.`
                ));
            }
        }

        const { error } = await supabase
            .from('invoices')
            .update({ status })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteInvoice(id: string): Promise<Result<void>> {
        // Soft delete: fatura fiziksel olarak silinmez — yasal zorunluluk.
        // Sadece taslak (draft) faturalar silinebilir; diğerleri iptal edilmeli.
        const { data, error } = await supabase
            .from('invoices')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'draft') // Güvenlik: sadece draft faturaları sil
            .select('id');
            
        if (error) return err(new Error(error.message));
        if (!data || data.length === 0) {
            return err(new Error('Fatura silinemedi. Yalnızca taslak (draft) durumundaki faturalar silinebilir.'));
        }
        return ok(undefined);
    }

    async getCashRegisters(): Promise<Result<CashRegister[]>> {
        const { data, error } = await supabase
            .from('cash_registers_with_balance')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error) return err(new Error(error.message));
        return ok((data || []).map(rowToCashRegister));
    }

    async getCashRegisterById(id: string): Promise<Result<CashRegister>> {
        const { data, error } = await supabase
            .from('cash_registers_with_balance')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return err(new Error(error.message));
        return ok(rowToCashRegister(data));
    }

    async saveCashRegister(register: CashRegister): Promise<Result<void>> {
        const obj = register.toObject();
        const { error } = await supabase
            .from('cash_registers')
            .upsert({
                id: obj.id || undefined,
                company_id: obj.companyId,
                name: obj.name,
                type: obj.type,
                currency: obj.currency,
                description: obj.description ?? null,
                is_active: obj.isActive
            });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async getPayments(filters?: PaymentFilters): Promise<Result<Payment[]>> {
        let query = supabase
            .from('payments')
            .select('*, accounts(name), cash_registers(name), invoices(invoice_number)');
        
        if (filters?.accountId) query = query.eq('account_id', filters.accountId);
        if (filters?.cashRegisterId) query = query.eq('cash_register_id', filters.cashRegisterId);
        if (filters?.paymentType) query = query.eq('payment_type', filters.paymentType);

        const { data, error } = await query.order('payment_date', { ascending: false });
        if (error) return err(new Error(error.message));
        return ok((data || []).map(rowToPayment));
    }

    async getPaymentById(id: string): Promise<Result<Payment>> {
        const { data, error } = await supabase
            .from('payments')
            .select('*, accounts(name), cash_registers(name), invoices(invoice_number)')
            .eq('id', id)
            .single();
        if (error) return err(new Error(error.message));
        return ok(rowToPayment(data));
    }

    async savePayment(payment: Payment): Promise<Result<void>> {
        const obj = payment.toObject();

        // Ödeme/tediye durumunda (outflow) kasa bakiyesinin yeterli olup olmadığını kontrol et
        if (obj.paymentType === 'payment' && obj.cashRegisterId && obj.status === 'completed') {
            const regResult = await this.getCashRegisterById(obj.cashRegisterId);
            if (!regResult.success) {
                return err(new Error(`Kasa/Banka hesabı bulunamadı: ${regResult.error.message}`));
            }

            const register = regResult.data;
            let currentBalance = register.balance;

            // Düzenleme modunda isek, bu işlemin kendi eski tutarını bakiye hesabından geçici olarak arındır (geri ekle)
            if (obj.id) {
                const oldPaymentResult = await this.getPaymentById(obj.id);
                if (oldPaymentResult.success) {
                    const oldPayment = oldPaymentResult.data;
                    if (oldPayment.status === 'completed' && oldPayment.cashRegisterId === obj.cashRegisterId) {
                        if (oldPayment.paymentType === 'payment') {
                            currentBalance += oldPayment.amount; // Eski ödemeyi iade et
                        } else if (oldPayment.paymentType === 'collection') {
                            currentBalance -= oldPayment.amount; // Eski tahsilatı çıkar
                        }
                    }
                }
            }

            if (currentBalance < obj.amount) {
                return err(new Error(
                    `Yetersiz Bakiye! Seçilen Kasa/Banka hesabında yeterli bakiye bulunmamaktadır. \n` +
                    `Mevcut Bakiye: ${currentBalance.toFixed(2)} ${register.currency} | ` +
                    `Ödenmek İstenen: ${obj.amount.toFixed(2)} ${register.currency}`
                ));
            }
        }

        let paymentDescription = obj.description ?? null;

        // Faturaya bağlı ödemelerde Kur Farkı (FX Difference) tespiti ve audit açıklaması
        if (obj.invoiceId && obj.status === 'completed') {
            const { data: invData } = await supabase
                .from('invoices')
                .select('currency, exchange_rate, invoice_number')
                .eq('id', obj.invoiceId)
                .maybeSingle();

            if (invData && invData.currency && invData.currency !== 'TRY' && Number(invData.exchange_rate) > 0) {
                const invoiceRate = Number(invData.exchange_rate);
                const fxNote = `[Fatura Kuru: 1 ${invData.currency} = ${invoiceRate} TRY]`;
                if (!paymentDescription) {
                    paymentDescription = fxNote;
                } else if (!paymentDescription.includes('[Fatura Kuru:')) {
                    paymentDescription = `${paymentDescription} | ${fxNote}`;
                }
            }
        }

        const { error } = await supabase
            .from('payments')
            .upsert({
                id: obj.id || undefined,
                company_id: obj.companyId,
                invoice_id: obj.invoiceId || null,
                account_id: obj.accountId || null,
                payment_date: obj.paymentDate.toISOString().split('T')[0],
                amount: obj.amount,
                payment_method: obj.paymentMethod,
                description: paymentDescription,
                payment_type: obj.paymentType,
                cash_register_id: obj.cashRegisterId || null,
                document_number: obj.documentNumber ?? null,
                due_date: obj.dueDate ? obj.dueDate.toISOString().split('T')[0] : null,
                status: obj.status
            });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }


    async deletePayment(id: string): Promise<Result<void>> {
        const { error } = await supabase
            .from('payments')
            .update({ status: 'cancelled' })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    // Cheque & Note Repository Implementation
    async getChequeNotes(filters?: ChequeNoteFilters): Promise<Result<ChequeNote[]>> {
        let query = supabase
            .from('cheques_notes')
            .select('*, accounts(name), cash_registers(name)')
            .is('deleted_at', null);

        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.direction) query = query.eq('direction', filters.direction);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.accountId) query = query.eq('account_id', filters.accountId);

        const { data, error } = await query.order('due_date', { ascending: true });
        if (error) return err(new Error(error.message));
        return ok((data || []).map(rowToChequeNote));
    }

    async getChequeNoteById(id: string): Promise<Result<ChequeNote>> {
        const { data, error } = await supabase
            .from('cheques_notes')
            .select('*, accounts(name), cash_registers(name)')
            .eq('id', id)
            .single();
        if (error) return err(new Error(error.message));
        return ok(rowToChequeNote(data));
    }

    async saveChequeNote(item: ChequeNote): Promise<Result<void>> {
        const obj = item.toObject();
        const { error } = await supabase
            .from('cheques_notes')
            .upsert({
                id: obj.id || undefined,
                company_id: obj.companyId,
                type: obj.type,
                direction: obj.direction,
                serial_number: obj.serialNumber,
                bank_name: obj.bankName ?? null,
                bank_branch: obj.bankBranch ?? null,
                account_number: obj.accountNumber ?? null,
                drawer: obj.drawer ?? null,
                account_id: obj.accountId ?? null,
                issue_date: obj.issueDate instanceof Date ? obj.issueDate.toISOString().split('T')[0] : obj.issueDate,
                due_date: obj.dueDate instanceof Date ? obj.dueDate.toISOString().split('T')[0] : obj.dueDate,
                amount: obj.amount,
                currency: obj.currency,
                status: obj.status,
                cash_register_id: obj.cashRegisterId ?? null,
                notes: obj.notes ?? null,
                created_by: obj.createdBy ?? null
            });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async updateChequeNoteStatus(id: string, status: ChequeNoteStatus, cashRegisterId?: string): Promise<Result<void>> {
        const payload: any = { status, updated_at: new Date().toISOString() };
        if (cashRegisterId) payload.cash_register_id = cashRegisterId;

        const { error } = await supabase
            .from('cheques_notes')
            .update(payload)
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteChequeNote(id: string): Promise<Result<void>> {
        const { error } = await supabase
            .from('cheques_notes')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }


    /**
     * Sonraki fatura numarasını DB'den güvenli şekilde üretir.
     *
     * Yaklaşım:
     *  - `{serial}-` öneki ile başlayan son fatura numarasını DB'den MAX ile çeker (created_at DESC)
     *  - Sonuçtan sayısal kısmı parse edip +1 arttırır
     *  - Hiç önceki kayıt yoksa `startingNumber` baz alınır
     *
     * Bu yaklaşım store'dan sayı yapmaktan (çok daha riskli) çok daha güvenlidir.
     * Nihai atomik güvence DB'deki UNIQUE constraint'tir; çakışma durumunda
     * kullanıcı numeraı değiştirerek tekrar kaydedebilir.
     */
    async getNextInvoiceNumber(serial: string, startingNumber: number): Promise<Result<string>> {
        const year = new Date().getFullYear();
        const prefix = `${serial}-`;

        // En son eklenen, bu seri ile başlayan faturayı çek
        const { data, error } = await supabase
            .from('invoices')
            .select('invoice_number')
            .like('invoice_number', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return err(new Error(`Son fatura numarası sorgulanamadı: ${error.message}`));

        if (!data) {
            // Bu seri ile hiç fatura yok — startingNumber ile başla
            return ok(`${serial}-${year}-${String(startingNumber).padStart(6, '0')}`);
        }

        // Son numarayı parse et: "ABC-2026-000042" -> 42 -> nextNo = 43
        const lastNumber = data.invoice_number;
        const parts = lastNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        const nextSeq = isNaN(lastSeq) ? startingNumber : lastSeq + 1;

        return ok(`${serial}-${year}-${String(nextSeq).padStart(6, '0')}`);
    }

    async getAccountBalancesReport(currency?: string): Promise<Result<AccountBalanceReportItem[]>> {
        const useCurrencyView = currency && currency !== 'all';
        const tableOrView = useCurrencyView ? 'account_currency_balances' : 'account_balances';
        let query = supabase.from(tableOrView).select('*');
        if (useCurrencyView) {
            query = query.eq('currency', currency);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) return err(new Error(error.message));

        const mapped = (data || []).map((row: any) => {
            const rawBalance = Number(row.raw_balance);
            const balance = Math.abs(rawBalance);
            let balanceType = 'Bakiye Yok';
            if (rawBalance > 0) {
                balanceType = 'Borç';
            } else if (rawBalance < 0) {
                balanceType = 'Alacak';
            }
            return {
                id: row.id,
                code: row.code || '-',
                name: row.name,
                accountType: row.account_type,
                phone: row.phone || '-',
                authorizedPerson: row.authorized_person || '-',
                currency: row.currency || 'TRY',
                debit: Number(row.debit),
                credit: Number(row.credit),
                balance,
                rawBalance,
                balanceType
            };
        });

        return ok(mapped);
    }

    async getAccountStatementReport(
        accountId: string,
        startDate?: Date | null,
        endDate?: Date | null,
        currency?: string | null
    ): Promise<Result<AccountStatementReportData>> {
        const p_start_date = startDate ? startDate.toISOString().split('T')[0] : null;
        const p_end_date = endDate ? endDate.toISOString().split('T')[0] : null;
        const p_currency = currency && currency !== 'all' ? currency : null;

        const { data, error } = await supabase.rpc('get_account_statement', {
            p_account_id: accountId,
            p_start_date,
            p_end_date,
            p_currency
        });

        if (error) return err(new Error(error.message));

        const rows = ((data as any).rows || []).map((r: any) => ({
            id: r.id,
            date: new Date(r.date),
            invoiceNumber: r.invoiceNumber,
            invoiceType: r.invoiceType,
            currency: r.currency || 'TRY',
            exchangeRate: r.exchangeRate ? Number(r.exchangeRate) : 1,
            notes: r.notes,
            debit: Number(r.debit),
            credit: Number(r.credit),
            cumulativeBalance: Number(r.cumulativeBalance),
            cumulativeBalanceType: r.cumulativeBalanceType
        }));

        const periodDebitTotal = rows.reduce((sum: number, r: any) => sum + r.debit, 0);
        const periodCreditTotal = rows.reduce((sum: number, r: any) => sum + r.credit, 0);

        const initialBalance = Number((data as any).initialBalance);
        const initialBalanceType = (data as any).initialBalanceType;
        const rawInitialBalance = Number((data as any).rawInitialBalance);

        const finalBalance = rows.length > 0 ? rows[rows.length - 1].cumulativeBalance : initialBalance;
        const finalBalanceType = rows.length > 0 ? rows[rows.length - 1].cumulativeBalanceType : initialBalanceType;

        return ok({
            initialBalance,
            initialBalanceType,
            rawInitialBalance,
            rows,
            periodDebitTotal,
            periodCreditTotal,
            finalBalance,
            finalBalanceType
        });
    }

    async getFiscalYears(): Promise<Result<FiscalYear[]>> {
        const { data, error } = await supabase
            .from('fiscal_years')
            .select('*')
            .order('year', { ascending: false });
        if (error) return err(new Error(error.message));
        return ok((data || []).map(rowToFiscalYear));
    }

    async closeFiscalYear(year: number, closedByUserId?: string): Promise<Result<{ transferredAccountsCount: number; message: string }>> {
        const { data: member } = await supabase
            .from('users')
            .select('company_id')
            .limit(1)
            .maybeSingle();

        if (!member?.company_id) return err(new Error('Firma bilgisi bulunamadı.'));

        const { data, error } = await supabase.rpc('close_fiscal_year', {
            p_company_id: member.company_id,
            p_year: year,
            p_closed_by: closedByUserId || null
        });

        if (error) return err(new Error(`Mali yıl kapanışı başarısız: ${error.message}`));

        return ok({
            transferredAccountsCount: Number((data as any)?.transferredAccountsCount || 0),
            message: String((data as any)?.message || 'Mali yıl başarıyla kapatıldı.')
        });
    }

    async reopenFiscalYear(year: number): Promise<Result<void>> {
        const { data: member } = await supabase
            .from('users')
            .select('company_id')
            .limit(1)
            .maybeSingle();

        if (!member?.company_id) return err(new Error('Firma bilgisi bulunamadı.'));

        const { error } = await supabase.rpc('reopen_fiscal_year', {
            p_company_id: member.company_id,
            p_year: year
        });

        if (error) return err(new Error(`Mali yıl yeniden açılması başarısız: ${error.message}`));

        return ok(undefined);
    }

    async getAccountReconciliation(
        accountId: string,
        asOfDate: Date,
        currency?: string
    ): Promise<Result<AccountReconciliationData>> {
        const p_as_of_date = asOfDate.toISOString().split('T')[0];
        const p_currency = currency && currency !== 'all' ? currency : 'TRY';

        const { data, error } = await supabase.rpc('get_account_reconciliation_data', {
            p_account_id: accountId,
            p_as_of_date,
            p_currency
        });

        if (error) return err(new Error(`Mutabakat verileri alınamadı: ${error.message}`));

        const d = data as any;
        return ok({
            asOfDate: new Date(d.asOfDate),
            currency: d.currency,
            account: d.account,
            company: d.company,
            financials: {
                debitTotal: Number(d.financials.debitTotal),
                creditTotal: Number(d.financials.creditTotal),
                balance: Number(d.financials.balance),
                balanceType: d.financials.balanceType,
                baCount: Number(d.financials.baCount),
                baTotal: Number(d.financials.baTotal),
                bsCount: Number(d.financials.bsCount),
                bsTotal: Number(d.financials.bsTotal)
            }
        });
    }

}
