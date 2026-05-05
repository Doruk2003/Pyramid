import type { Result } from '@/shared/types/result';
import type { Order } from './order.entity';
import type { Quote } from './quote.entity';

export interface ISalesRepository {
    // Quotes
    getQuoteById(id: string): Promise<Result<Quote>>;
    listQuotes(): Promise<Result<Quote[]>>;
    saveQuote(quote: Quote): Promise<Result<Quote>>;
    deleteQuote(id: string): Promise<Result<void>>;
    getNextQuoteNumber(): Promise<string>;

    // Orders
    getOrderById(id: string): Promise<Result<Order>>;
    listOrders(): Promise<Result<Order[]>>;
    saveOrder(order: Order): Promise<Result<Order>>;
    deleteOrder(id: string): Promise<Result<void>>;
    getNextOrderNumber(): Promise<string>;
    updateSourceQuantities(sourceType: 'quote' | 'order', sourceIds: string[]): Promise<Result<void>>;
}
