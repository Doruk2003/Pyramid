<script setup lang="ts">
import { onMounted } from 'vue';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import type { MovementType } from '@/modules/inventory/domain/stock-movement.entity';

import { useRouter } from 'vue-router';

const router = useRouter();
const invStore = useInventoryStore();
const productStore = useProductStore();

onMounted(() => {
    invStore.fetchMovements();
    if (productStore.products.length === 0) productStore.fetchProducts();
});

function openNew() {
    router.push('/inventory/movements/create');
}

function getProductName(id: string) {
    return productStore.products.find((p) => p.id === id)?.name || '-';
}

function getMovementTypeLabel(type: MovementType) {
    const map: Record<MovementType, string> = {
        in: 'Giriş',
        out: 'Çıkış',
        transfer: 'Transfer',
        adjustment: 'Düzeltme'
    };
    return map[type] || type;
}

function getMovementSeverity(type: MovementType) {
    const map: Record<MovementType, 'success' | 'danger' | 'info' | 'warn'> = {
        in: 'success',
        out: 'danger',
        transfer: 'info',
        adjustment: 'warn'
    };
    return map[type] || 'secondary';
}
</script>

<template>
    <div class="card">
        <Toolbar class="mb-6">
            <template #start>
                <Button label="Yeni Hareket" icon="pi pi-plus" severity="secondary" @click="openNew" />
            </template>
        </Toolbar>
        <h4 class="m-0 mb-4">Stok Hareketleri</h4>
        <DataTable :value="invStore.movements" dataKey="id" :paginator="true" :rows="10">
            <Column field="createdAt" header="Tarih" sortable>
                <template #body="slotProps">
                    {{ new Date(slotProps.data.createdAt).toLocaleString() }}
                </template>
            </Column>
            <Column field="productId" header="Ürün" sortable>
                <template #body="slotProps">
                    {{ getProductName(slotProps.data.productId) }}
                </template>
            </Column>
            <Column field="movementType" header="Tip" sortable>
                <template #body="slotProps">
                    <Tag :severity="getMovementSeverity(slotProps.data.movementType)" :value="getMovementTypeLabel(slotProps.data.movementType)" />
                </template>
            </Column>
            <Column field="quantity" header="Miktar" sortable></Column>
            <Column field="note" header="Not"></Column>
        </DataTable>
    </div>
</template>
