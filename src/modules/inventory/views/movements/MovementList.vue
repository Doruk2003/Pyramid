<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import type { MovementType } from '@/modules/inventory/domain/stock-movement.entity';

import { useRouter } from 'vue-router';

const router = useRouter();
const invStore = useInventoryStore();
const productStore = useProductStore();
const showFilters = ref(false);

interface MovementFilterForm {
    productId: string | null;
    warehouseId: string | null;
    movementType: MovementType | null;
    note: string;
    startDate: Date | null;
    endDate: Date | null;
}

const filterForm = ref<MovementFilterForm>({
    productId: null,
    warehouseId: null,
    movementType: null,
    note: '',
    startDate: null,
    endDate: null
});

const activeFilters = ref<MovementFilterForm>({ ...filterForm.value });

const movementTypeOptions: Array<{ label: string; value: MovementType }> = [
    { label: 'Giriş', value: 'in' },
    { label: 'Çıkış', value: 'out' },
    { label: 'Transfer', value: 'transfer' },
    { label: 'Düzeltme', value: 'adjustment' }
];

onMounted(() => {
    invStore.fetchMovements();
    if (invStore.warehouses.length === 0) invStore.fetchWarehouses();
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

const filteredMovements = computed(() => {
    let list = invStore.movements ?? [];
    const filters = activeFilters.value;

    if (filters.productId) {
        list = list.filter((item) => item.productId === filters.productId);
    }
    if (filters.warehouseId) {
        list = list.filter((item) => item.warehouseId === filters.warehouseId);
    }
    if (filters.movementType) {
        list = list.filter((item) => item.movementType === filters.movementType);
    }
    if (filters.note) {
        const query = filters.note.toLowerCase();
        list = list.filter((item) => (item.note || '').toLowerCase().includes(query));
    }
    if (filters.startDate || filters.endDate) {
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;
        list = list.filter((item) => {
            const value = item.createdAt ? new Date(item.createdAt) : null;
            if (!value || Number.isNaN(value.getTime())) return false;
            if (start && value < start) return false;
            if (end && value > end) return false;
            return true;
        });
    }

    return list;
});

function toggleFilters() {
    showFilters.value = !showFilters.value;
}

function applyFilters() {
    activeFilters.value = { ...filterForm.value };
}

function clearFilters() {
    filterForm.value = {
        productId: null,
        warehouseId: null,
        movementType: null,
        note: '',
        startDate: null,
        endDate: null
    };
    activeFilters.value = { ...filterForm.value };
}
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <h4 class="m-0 text-xl font-semibold">Stok Hareketleri</h4>
            </div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Hareket" icon="pi pi-plus" severity="secondary" @click="openNew" />
                </template>
                <template #end>
                    <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div class="col-span-1">
                    <Select v-model="filterForm.productId" :options="productStore.products" optionLabel="name" optionValue="id" placeholder="Ürün" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.warehouseId" :options="invStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.movementType" :options="movementTypeOptions" optionLabel="label" optionValue="value" placeholder="Tip" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.note" placeholder="Not" fluid />
                </div>
                <div class="col-span-1">
                    <DatePicker v-model="filterForm.startDate" placeholder="Başlangıç" fluid />
                </div>
                <div class="col-span-1">
                    <DatePicker v-model="filterForm.endDate" placeholder="Bitiş" fluid />
                </div>
                <div class="col-span-1 flex items-end">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                </div>
                <div class="col-span-1 flex items-end">
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <div class="card">
            <DataTable :value="filteredMovements" dataKey="id" :paginator="true" :rows="10">
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
    </div>
</template>
