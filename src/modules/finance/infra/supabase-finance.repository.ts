import { supabase } from '@/lib/supabase';
import { Account } from '@/modules/finance/domain/account.entity';
import { Invoice, type InvoiceLineProps } from '@/modules/finance/domain/invoice.entity';
import type { IFinanceRepository } from '@/modules/finance/domain/finance.repository';
import { ok, err, type Result } from '@/shared/types/result';
import type { DbAccount, DbInvoice, DbInvoiceLine } from '@/shared/infra/db-types';

export class SupabaseFinanceRepository implements IFinanceRepository {
  async getAccounts(filters?: any): Promise<Result<Account[]>> {
    let query = supabase.from('accounts').select('*').eq('is_active', true);
    if (filters?.accountType) query = query.eq('account_type', filters.accountType);
    
    const { data, error } = await query;
    if (error) return err(new Error(error.message));
    
    return ok((data as DbAccount[] || []).map((row: DbAccount) => Account.create({
      id: row.id,
      companyId: row.company_id,
      accountType: row.account_type,
      name: row.name,
      taxNumber: row.tax_number,
      email: row.email,
      phone: row.phone,
      address: row.address,
      creditLimit: Number(row.credit_limit),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    })));
  }

  async getAccountById(id: string): Promise<Result<Account>> {
    const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
    if (error) return err(new Error(error.message));
    const row = data as DbAccount;
    return ok(Account.create({
      id: row.id,
      companyId: row.company_id,
      accountType: row.account_type,
      name: row.name,
      taxNumber: row.tax_number,
      email: row.email,
      phone: row.phone,
      address: row.address,
      creditLimit: Number(row.credit_limit),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async saveAccount(account: Account): Promise<Result<void>> {
    const obj = account.toObject();
    const { error } = await supabase.from('accounts').upsert({
      id: obj.id || undefined,
      company_id: obj.companyId,
      account_type: obj.accountType,
      name: obj.name,
      tax_number: obj.taxNumber,
      email: obj.email,
      phone: obj.phone,
      address: obj.address,
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

  async getInvoices(filters?: any): Promise<Result<Invoice[]>> {
    let query = supabase.from('invoices').select('*, invoice_lines(*)');
    if (filters?.invoiceType) query = query.eq('invoice_type', filters.invoiceType);
    if (filters?.accountId) query = query.eq('account_id', filters.accountId);
    
    const { data, error } = await query.order('issue_date', { ascending: false });
    if (error) return err(new Error(error.message));
    
    return ok((data as DbInvoice[] || []).map((row: DbInvoice) => Invoice.create({
      id: row.id,
      companyId: row.company_id,
      invoiceType: row.invoice_type as any,
      invoiceNumber: row.invoice_number,
      accountId: row.account_id,
      issueDate: new Date(row.issue_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      status: row.status as any,
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
    })));
  }

  async getInvoiceById(id: string): Promise<Result<Invoice>> {
    const { data, error } = await supabase.from('invoices').select('*, invoice_lines(*)').eq('id', id).single();
    if (error) return err(new Error(error.message));
    return ok(Invoice.create({
      id: data.id,
      companyId: data.company_id,
      invoiceType: data.invoice_type,
      invoiceNumber: data.invoice_number,
      accountId: data.account_id,
      issueDate: new Date(data.issue_date),
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      status: data.status,
      subtotal: Number(data.subtotal),
      vatTotal: Number(data.vat_total),
      total: Number(data.total),
      paidAmount: Number(data.paid_amount),
      currency: data.currency,
      exchangeRate: Number(data.exchange_rate),
      notes: data.notes,
      lines: data.invoice_lines.map((l: any) => ({
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
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }));
  }

  async saveInvoice(invoice: Invoice): Promise<Result<void>> {
    const obj = invoice.toObject();
    const { data, error } = await supabase.from('invoices').upsert({
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
    }).select().single();

    if (error) return err(new Error(error.message));

    // Kalemleri sil ve tekrar ekle (basit sync)
    if (obj.id) {
       await supabase.from('invoice_lines').delete().eq('invoice_id', obj.id);
    }

    const linePayloads = obj.lines.map(l => ({
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

  async updateInvoiceStatus(id: string, status: string): Promise<Result<void>> {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) return err(new Error(error.message));
    return ok(undefined);
  }
}


