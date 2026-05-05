import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Quote } from '../domain/quote.entity';
import { Order } from '../domain/order.entity';
import { SupabaseSalesRepository } from '../infra/supabase-sales.repository';
import type { Result } from '@/shared/types/result';

const salesRepo = new SupabaseSalesRepository();

export const useSalesStore = defineStore('sales', () => {
    const quotes = ref<Quote[]>([]);
    const orders = ref<Order[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // === QUOTES ===
    async function fetchQuotes() {
        loading.value = true;
        const result = await salesRepo.listQuotes();
        if (result.success) {
            quotes.value = result.data;
        } else {
            error.value = result.error.message;
        }
        loading.value = false;
    }

    async function saveQuote(quote: Quote): Promise<Result<Quote>> {
        loading.value = true;
        const result = await salesRepo.saveQuote(quote);
        if (result.success) {
            await fetchQuotes();
        }
        loading.value = false;
        return result;
    }

    // === ORDERS ===
    async function fetchOrders() {
        loading.value = true;
        const result = await salesRepo.listOrders();
        if (result.success) {
            orders.value = result.data;
        } else {
            error.value = result.error.message;
        }
        loading.value = false;
    }

    async function saveOrder(order: Order): Promise<Result<Order>> {
        loading.value = true;
        const result = await salesRepo.saveOrder(order);
        if (result.success) {
            await fetchOrders();
        }
        loading.value = false;
        return result;
    }

    return {
        quotes,
        orders,
        loading,
        error,
        fetchQuotes,
        saveQuote,
        fetchOrders,
        saveOrder,
        async getNextQuoteNumber(): Promise<string> {
            return salesRepo.getNextQuoteNumber();
        },
        async getNextOrderNumber(): Promise<string> {
            return salesRepo.getNextOrderNumber();
        },
        async updateSourceQuantities(sourceType: 'quote' | 'order', sourceIds: string[]) {
            return salesRepo.updateSourceQuantities(sourceType, sourceIds);
        }
    };
});
