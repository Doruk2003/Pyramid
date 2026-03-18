import { supabase } from '@/lib/supabase';
import { Account, type AddressValue } from '@/modules/finance/domain/account.entity';
import { Invoice, type InvoiceStatus, type InvoiceType } from '@/modules/finance/domain/invoice.entity';
import type { AccountFilters, IFinanceRepository, InvoiceFilters } from '@/modules/finance/domain/finance.repository';
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
        accountType: row.account_type,
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

export class SupabaseFinanceRepository implements IFinanceRepository {
    async getAccounts(filters?: AccountFilters): Promise<Result<Account[]>> {
        let query = supabase.from('accounts').select('*').eq('is_active', true);
        if (filters?.accountType) query = query.eq('account_type', filters.accountType);

        const { data, error } = await query;
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
        const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async getInvoices(filters?: InvoiceFilters): Promise<Result<Invoice[]>> {
        let query = supabase.from('invoices').select('*, invoice_lines(*)');
        if (filters?.invoiceType) query = query.eq('invoice_type', filters.invoiceType);
        if (filters?.accountId) query = query.eq('account_id', filters.accountId);

        const { data, error } = await query.order('issue_date', { ascending: false });
        if (error) return err(new Error(error.message));

        return ok(
            ((data as DbInvoice[]) || []).map((row: DbInvoice) =>
                Invoice.create({
                    id: row.id,
                    companyId: row.company_id,
                    invoiceType: row.invoice_type as InvoiceType,
                    invoiceNumber: row.invoice_number,
                    accountId: row.account_id,
                    issueDate: new Date(row.issue_date),
                    dueDate: row.due_date ? new Date(row.due_date) : undefined,
                    status: row.status as InvoiceStatus,
                    subtotal: Number(row.subtotal),
                    vatTotal: Number(row.vat_total),
                    total: Number(row.total),
                    paidAmount: Number(row.paid_amount),
                    currency: row.currency,
                    exchangeRate: Number(row.exchange_rate),
                    notes: row.notes,
                    lines: (row.invoice_lines || []).map((l: DbInvoiceLine) => ({
                        id: l.id,
                        invoiceId: l.invoice_id,
                        productId: l.product_id,
                        description: l.description,
                        quantity: Number(l.quantity),
                        unitPrice: Number(l.unit_price),
                        vatRate: Number(l.vat_rate),
                        discountRate: Number(l.discount_rate),
                        lineTotal: Number(l.line_total)
                    })),
                    createdAt: new Date(row.created_at),
                    updatedAt: new Date(row.updated_at)
                })
            )
        );
    }

    async getInvoiceById(id: string): Promise<Result<Invoice>> {
        const { data, error } = await supabase.from('invoices').select('*, invoice_lines(*)').eq('id', id).single();
        if (error) return err(new Error(error.message));
        const row = data as DbInvoice;
        return ok(
            Invoice.create({
                id: row.id,
                companyId: row.company_id,
                invoiceType: row.invoice_type as InvoiceType,
                invoiceNumber: row.invoice_number,
                accountId: row.account_id,
                issueDate: new Date(row.issue_date),
                dueDate: row.due_date ? new Date(row.due_date) : undefined,
                status: row.status as InvoiceStatus,
                subtotal: Number(row.subtotal),
                vatTotal: Number(row.vat_total),
                total: Number(row.total),
                paidAmount: Number(row.paid_amount),
                currency: row.currency,
                exchangeRate: Number(row.exchange_rate),
                notes: row.notes,
                lines: (row.invoice_lines || []).map((l: DbInvoiceLine) => ({
                    id: l.id,
                    invoiceId: l.invoice_id,
                    productId: l.product_id,
                    description: l.description,
                    quantity: Number(l.quantity),
                    unitPrice: Number(l.unit_price),
                    vatRate: Number(l.vat_rate),
                    discountRate: Number(l.discount_rate),
                    lineTotal: Number(l.line_total)
                })),
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            })
        );
    }

    async saveInvoice(invoice: Invoice): Promise<Result<void>> {
        const obj = invoice.toObject();
        const { data, error } = await supabase
            .from('invoices')
            .upsert({
                id: obj.id || undefined,
                company_id: obj.companyId,
                invoice_type: obj.invoiceType,
                invoice_number: obj.invoiceNumber,
                account_id: obj.accountId,
                issue_date: obj.issueDate.toISOString().split('T')[0],
                due_date: obj.dueDate?.toISOString().split('T')[0],
                status: obj.status,
                subtotal: obj.subtotal,
                vat_total: obj.vatTotal,
                total: obj.total,
                paid_amount: obj.paidAmount,
                currency: obj.currency,
                exchange_rate: obj.exchangeRate,
                notes: obj.notes,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) return err(new Error(error.message));

        // Kalemleri sil ve tekrar ekle (basit sync)
        if (obj.id) {
            await supabase.from('invoice_lines').delete().eq('invoice_id', obj.id);
        }

        const linePayloads = obj.lines.map((l) => ({
            invoice_id: data.id,
            product_id: l.productId,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            vat_rate: l.vatRate,
            discount_rate: l.discountRate,
            line_total: l.lineTotal
        }));

        const { error: lineError } = await supabase.from('invoice_lines').insert(linePayloads);
        if (lineError) return err(new Error(lineError.message));

        return ok(undefined);
    }

    async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Result<void>> {
        const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }
}
