import { supabase } from '@/lib/supabase';
import { Account, type AddressValue } from '@/modules/finance/domain/account.entity';
import { Invoice, type InvoiceLineProps, type InvoiceStatus, type InvoiceType, type PaymentType, type DocumentCategory } from '@/modules/finance/domain/invoice.entity';
import { CashRegister } from '@/modules/finance/domain/cash-register.entity';
import { Payment } from '@/modules/finance/domain/payment.entity';
import type { AccountFilters, IFinanceRepository, InvoiceFilters, PaymentFilters } from '@/modules/finance/domain/finance.repository';
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
function rowToInvoiceLine(l: DbInvoiceLine): InvoiceLineProps {
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
        lineTotal: Number(l.line_total),
        sourceLineId: l.source_line_id
    };
}

function rowToInvoice(row: DbInvoice): Invoice {
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
        total: Number(row.total),
        paidAmount: Number(row.paid_amount),
        currency: row.currency,
        exchangeRate: Number(row.exchange_rate),
        notes: row.notes,
        // K5 — `as any` kaldırıldı; geçerli değerler union type ile kısıtlandı
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
        cashRegisterName: row.cash_registers?.name || undefined,
        invoiceNumber: row.invoices?.invoice_number || undefined
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
            is_active: obj.isActive,
            updated_at: new Date().toISOString()
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
        const { error } = await supabase
            .from('invoices')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deleteInvoice(id: string): Promise<Result<void>> {
        // Soft delete: fatura fiziksel olarak silinmez — yasal zorunluluk.
        // Sadece taslak (draft) faturalar silinebilir; diğerleri iptal edilmeli.
        const { data, error } = await supabase
            .from('invoices')
            .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
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
            .from('cash_registers')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error) return err(new Error(error.message));
        return ok((data || []).map(rowToCashRegister));
    }

    async getCashRegisterById(id: string): Promise<Result<CashRegister>> {
        const { data, error } = await supabase
            .from('cash_registers')
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
                is_active: obj.isActive,
                updated_at: new Date().toISOString()
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
                description: obj.description ?? null,
                payment_type: obj.paymentType,
                cash_register_id: obj.cashRegisterId || null,
                document_number: obj.documentNumber ?? null,
                due_date: obj.dueDate ? obj.dueDate.toISOString().split('T')[0] : null,
                status: obj.status,
                updated_at: new Date().toISOString()
            });
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async deletePayment(id: string): Promise<Result<void>> {
        const { error } = await supabase
            .from('payments')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
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
}
