import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Quote } from '../domain/quote.entity';
import { Order } from '../domain/order.entity';
import { SupabasePurchasesRepository } from '../infra/supabase-purchases.repository';
import type { Result } from '@/shared/types/result';

const purchasesRepo = new SupabasePurchasesRepository();

export const usePurchasesStore = defineStore('purchases', () => {
    const quotes = ref<Quote[]>([]);
    const orders = ref<Order[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // === QUOTES ===
    async function fetchQuotes() {
        loading.value = true;
        const result = await purchasesRepo.listQuotes();
        if (result.success) {
            quotes.value = result.data;
        } else {
            error.value = result.error.message;
        }
        loading.value = false;
    }

    async function saveQuote(quote: Quote): Promise<Result<Quote>> {
        loading.value = true;
        const result = await purchasesRepo.saveQuote(quote);
        if (result.success) {
            await fetchQuotes();
        }
        loading.value = false;
        return result;
    }

    // === ORDERS ===
    async function fetchOrders() {
        loading.value = true;
        const result = await purchasesRepo.listOrders();
        if (result.success) {
            orders.value = result.data;
        } else {
            error.value = result.error.message;
        }
        loading.value = false;
    }

    async function saveOrder(order: Order): Promise<Result<Order>> {
        loading.value = true;
        const result = await purchasesRepo.saveOrder(order);
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
            return purchasesRepo.getNextQuoteNumber();
        },
        async getNextOrderNumber(): Promise<string> {
            return purchasesRepo.getNextOrderNumber();
        },
        async updateSourceQuantities(sourceType: 'quote' | 'order', sourceIds: string[]) {
            return purchasesRepo.updateSourceQuantities(sourceType, sourceIds);
        }
    };
});
