import { supabase } from '@/lib/supabase';
import { Quote, type QuoteStatus } from '@/modules/sales/domain/quote.entity';
import { Order, type OrderStatus } from '@/modules/sales/domain/order.entity';
import type { ISalesRepository } from '@/modules/sales/domain/sales.repository';
import { ok, err, type Result } from '@/shared/types/result';
import type { DbQuote, DbQuoteLine, DbOrder, DbOrderLine } from '@/shared/infra/db-types';

export class SupabaseSalesRepository implements ISalesRepository {
    // === QUOTES ===
    async listQuotes(): Promise<Result<Quote[]>> {
        // accounts tablosu join ile cari hesap adı çekiliyor; deleted_at IS NULL filtresi
        const { data, error } = await supabase
            .from('quotes')
            .select('*, quote_lines(*), accounts(id, name)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) return err(new Error(error.message));

        const quotes = (data as DbQuote[]).map(row => Quote.create({
            id: row.id,
            companyId: row.company_id,
            accountId: row.account_id,
            accountName: (row as unknown as { accounts?: { name: string } }).accounts?.name,
            quoteNumber: row.quote_number,
            issueDate: new Date(row.issue_date),
            validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
            status: row.status as QuoteStatus,
            subtotal: Number(row.subtotal),
            vatTotal: Number(row.vat_total),
            total: Number(row.total),
            currency: row.currency,
            exchangeRate: Number(row.exchange_rate),
            notes: row.notes,
            lines: (row.quote_lines || []).map(l => ({
                id: l.id,
                quoteId: l.quote_id,
                productId: l.product_id,
                description: l.description,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unit_price),
                vatRate: Number(l.vat_rate),
                discountRate: Number(l.discount_rate),
                lineTotal: Number(l.line_total),
                sortOrder: l.sort_order
            })),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));

        return ok(quotes);
    }

    async getQuoteById(id: string): Promise<Result<Quote>> {
        const { data, error } = await supabase
            .from('quotes')
            .select('*, quote_lines(*)')
            .eq('id', id)
            .single();

        if (error) return err(new Error(error.message));
        const row = data as DbQuote;

        return ok(Quote.create({
            id: row.id,
            companyId: row.company_id,
            accountId: row.account_id,
            quoteNumber: row.quote_number,
            issueDate: new Date(row.issue_date),
            validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
            status: row.status as QuoteStatus,
            subtotal: Number(row.subtotal),
            vatTotal: Number(row.vat_total),
            total: Number(row.total),
            currency: row.currency,
            exchangeRate: Number(row.exchange_rate),
            notes: row.notes,
            lines: (row.quote_lines || []).map(l => ({
                id: l.id,
                quoteId: l.quote_id,
                productId: l.product_id,
                description: l.description,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unit_price),
                vatRate: Number(l.vat_rate),
                discountRate: Number(l.discount_rate),
                lineTotal: Number(l.line_total),
                sortOrder: l.sort_order
            })),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    async saveQuote(quote: Quote): Promise<Result<Quote>> {
        const obj = quote.toObject();
        const { data, error } = await supabase
            .from('quotes')
            .upsert({
                id: obj.id || undefined,
                company_id: obj.companyId,
                account_id: obj.accountId,
                quote_number: obj.quoteNumber,
                issue_date: obj.issueDate.toISOString().split('T')[0],
                valid_until: obj.validUntil?.toISOString().split('T')[0],
                status: obj.status,
                subtotal: obj.subtotal,
                vat_total: obj.vatTotal,
                total: obj.total,
                currency: obj.currency,
                exchange_rate: obj.exchangeRate,
                notes: obj.notes,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) return err(new Error(error.message));

        if (obj.id) {
            await supabase.from('quote_lines').delete().eq('quote_id', obj.id);
        }

        const linePayloads = obj.lines.map((l) => ({
            quote_id: data.id,
            product_id: l.productId,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            vat_rate: l.vatRate,
            discount_rate: l.discountRate,
            line_total: l.lineTotal,
            sort_order: l.sortOrder
        }));

        const { error: lineError } = await supabase.from('quote_lines').insert(linePayloads);
        if (lineError) return err(new Error(lineError.message));

        return this.getQuoteById(data.id);
    }

    async deleteQuote(id: string): Promise<Result<void>> {
        // Soft delete: teklif fiziksel olarak silinmez, deleted_at damgalanır
        const { error } = await supabase
            .from('quotes')
            .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'draft'); // Sadece taslak teklifler silinebilir
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async getNextQuoteNumber(): Promise<string> {
        // PostgreSQL sequence üzerinden atomik numara üret (race condition yok)
        const { data, error } = await supabase.rpc('get_next_quote_number');
        if (error || !data) {
            // Fallback: RPC yoksa count-based
            const year = new Date().getFullYear();
            const { count } = await supabase.from('quotes').select('id', { count: 'exact', head: true });
            return `TK-${year}-${String((count ?? 0) + 1).padStart(5, '0')}`;
        }
        return data as string;
    }

    // === ORDERS ===
    async listOrders(): Promise<Result<Order[]>> {
        // accounts tablosu join ile cari hesap adı çekiliyor; deleted_at IS NULL filtresi
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_lines(*), accounts(id, name)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) return err(new Error(error.message));

        const orders = (data as DbOrder[]).map(row => Order.create({
            id: row.id,
            companyId: row.company_id,
            accountId: row.account_id,
            accountName: (row as unknown as { accounts?: { name: string } }).accounts?.name,
            quoteId: row.quote_id,
            orderNumber: row.order_number,
            issueDate: new Date(row.issue_date),
            dueDate: row.due_date ? new Date(row.due_date) : undefined,
            status: row.status as OrderStatus,
            subtotal: Number(row.subtotal),
            vatTotal: Number(row.vat_total),
            total: Number(row.total),
            currency: row.currency,
            exchangeRate: Number(row.exchange_rate),
            notes: row.notes,
            lines: (row.order_lines || []).map(l => ({
                id: l.id,
                orderId: l.order_id,
                productId: l.product_id,
                description: l.description,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unit_price),
                vatRate: Number(l.vat_rate),
                discountRate: Number(l.discount_rate),
                lineTotal: Number(l.line_total),
                sortOrder: l.sort_order
            })),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));

        return ok(orders);
    }

    async getOrderById(id: string): Promise<Result<Order>> {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_lines(*)')
            .eq('id', id)
            .single();

        if (error) return err(new Error(error.message));
        const row = data as DbOrder;

        return ok(Order.create({
            id: row.id,
            companyId: row.company_id,
            accountId: row.account_id,
            quoteId: row.quote_id,
            orderNumber: row.order_number,
            issueDate: new Date(row.issue_date),
            dueDate: row.due_date ? new Date(row.due_date) : undefined,
            status: row.status as OrderStatus,
            subtotal: Number(row.subtotal),
            vatTotal: Number(row.vat_total),
            total: Number(row.total),
            currency: row.currency,
            exchangeRate: Number(row.exchange_rate),
            notes: row.notes,
            lines: (row.order_lines || []).map(l => ({
                id: l.id,
                orderId: l.order_id,
                productId: l.product_id,
                description: l.description,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unit_price),
                vatRate: Number(l.vat_rate),
                discountRate: Number(l.discount_rate),
                lineTotal: Number(l.line_total),
                sortOrder: l.sort_order
            })),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    async saveOrder(order: Order): Promise<Result<Order>> {
        const obj = order.toObject();
        const { data, error } = await supabase
            .from('orders')
            .upsert({
                id: obj.id || undefined,
                company_id: obj.companyId,
                account_id: obj.accountId,
                quote_id: obj.quoteId,
                order_number: obj.orderNumber,
                issue_date: obj.issueDate.toISOString().split('T')[0],
                due_date: obj.dueDate?.toISOString().split('T')[0],
                status: obj.status,
                subtotal: obj.subtotal,
                vat_total: obj.vatTotal,
                total: obj.total,
                currency: obj.currency,
                exchange_rate: obj.exchangeRate,
                notes: obj.notes,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) return err(new Error(error.message));

        if (obj.id) {
            await supabase.from('order_lines').delete().eq('order_id', obj.id);
        }

        const linePayloads = obj.lines.map((l) => ({
            order_id: data.id,
            product_id: l.productId,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            vat_rate: l.vatRate,
            discount_rate: l.discountRate,
            line_total: l.lineTotal,
            sort_order: l.sortOrder
        }));

        const { error: lineError } = await supabase.from('order_lines').insert(linePayloads);
        if (lineError) return err(new Error(lineError.message));

        return this.getOrderById(data.id);
    }

    async deleteOrder(id: string): Promise<Result<void>> {
        // Soft delete: sipariş fiziksel olarak silinmez, deleted_at damgalanır
        const { error } = await supabase
            .from('orders')
            .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'draft'); // Sadece taslak siparisler silinebilir
        if (error) return err(new Error(error.message));
        return ok(undefined);
    }

    async getNextOrderNumber(): Promise<string> {
        // PostgreSQL sequence üzerinden atomik numara üret (race condition yok)
        const { data, error } = await supabase.rpc('get_next_order_number');
        if (error || !data) {
            // Fallback: RPC yoksa count-based
            const year = new Date().getFullYear();
            const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true });
            return `SP-${year}-${String((count ?? 0) + 1).padStart(5, '0')}`;
        }
        return data as string;
    }
}
