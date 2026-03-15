<script setup lang="ts">
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { computed, onMounted } from 'vue';

const invStore = useInventoryStore();
const productStore = useProductStore();

onMounted(async () => {
    if (productStore.products.length === 0) await productStore.fetchProducts();
    if (invStore.warehouses.length === 0) await invStore.fetchWarehouses();
    if (invStore.movements.length === 0) await invStore.fetchMovements();
});

const totalProducts = computed(() => productStore.products.length);
const totalWarehouses = computed(() => invStore.warehouses.length);
const totalMovements = computed(() => invStore.movements.length);

const lastMovementDate = computed(() => {
    if (invStore.movements.length === 0) return '-';
    const dates = invStore.movements.map((m) => new Date(m.createdAt).getTime());
    return new Date(Math.max(...dates)).toLocaleDateString();
});
</script>

<template>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0">
            <div class="flex justify-between mb-4">
                <div>
                    <span class="block text-muted-color font-medium mb-4">Toplam Ürün</span>
                    <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ totalProducts }}</div>
                </div>
                <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-box text-blue-500 text-xl!"></i>
                </div>
            </div>
            <span class="text-primary font-medium">{{ totalMovements }} </span>
            <span class="text-muted-color">hareket kaydı</span>
        </div>
    </div>
</template>
