<script setup lang="ts">
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const invStore = useInventoryStore();
const productStore = useProductStore();
const router = useRouter();

onMounted(async () => {
    if (productStore.products.length === 0) await productStore.fetchProducts();
    await invStore.fetchBalances();
});

const criticalProducts = computed(() => {
    return productStore.products
        .filter(p => {
            if (p.inventoryStatus !== 'TRACKED') return false;
            const balance = invStore.getTotalBalance(p.id);
            return balance < (p.minStock || 0);
        })
        .map(p => ({
            ...p,
            currentStock: invStore.getTotalBalance(p.id)
        }))
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 5);
});

function goToProduct(id: string) {
    router.push(`/inventory/products/details/${id}`);
}
</script>

<template>
    <div class="col-span-12 xl:col-span-6">
        <div class="card">
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-2">
                    <i class="pi pi-exclamation-triangle text-orange-500 text-xl"></i>
                    <span class="text-xl font-semibold">Kritik Stok Uyarıları</span>
                </div>
                <Button label="Tümünü Gör" icon="pi pi-arrow-right" iconPos="right" text size="small" @click="router.push('/inventory/products')" />
            </div>
            
            <ul class="list-none p-0 m-0">
                <li v-for="product in criticalProducts" :key="product.id" 
                    class="flex flex-col md:flex-row md:items-center justify-between p-4 mb-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-orange-300 transition-colors cursor-pointer"
                    @click="goToProduct(product.id)"
                >
                    <div class="flex items-center gap-4">
                        <div class="flex flex-col">
                            <span class="font-bold text-surface-900 dark:text-surface-0">{{ product.name }}</span>
                            <span class="text-sm text-surface-600 dark:text-surface-400">{{ product.code }}</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-6 mt-4 md:mt-0">
                        <div class="flex flex-col items-center md:items-end">
                            <span class="text-xs text-surface-500 uppercase font-bold tracking-wider">Mevcut</span>
                            <span class="text-lg font-bold" :class="product.currentStock < 0 ? 'text-red-500' : 'text-orange-500'">
                                {{ product.currentStock }}
                            </span>
                        </div>
                        <div class="flex flex-col items-center md:items-end">
                            <span class="text-xs text-surface-500 uppercase font-bold tracking-wider">Minimum</span>
                            <span class="text-lg font-medium text-surface-700 dark:text-surface-300">
                                {{ product.minStock || 0 }}
                            </span>
                        </div>
                        <Button icon="pi pi-chevron-right" text rounded severity="secondary" />
                    </div>
                </li>
                
                <div v-if="criticalProducts.length === 0" class="flex flex-col items-center justify-center py-12 text-surface-400">
                    <i class="pi pi-check-circle text-4xl mb-4 text-green-500"></i>
                    <p>Tüm stoklar güvenli seviyede.</p>
                </div>
            </ul>
        </div>
    </div>
</template>
