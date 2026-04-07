<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useSalesStore } from '@/modules/sales/application/sales.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useRouter } from 'vue-router';
import type { OrderStatus } from '@/modules/sales/domain/order.entity';

const salesStore = useSalesStore();
const financeStore = useFinanceStore();
const router = useRouter();
const showFilters = ref(false);

interface OrderFilterForm {
    orderNumber: string;
    status: OrderStatus | null;
    startDate: Date | null;
    endDate: Date | null;
    accountId: string | null;
    currency: string;
}

const filterForm = ref<OrderFilterForm>({
    orderNumber: '',
    status: null,
    startDate: null,
    endDate: null,
    accountId: null,
    currency: ''
});

const activeFilters = ref<OrderFilterForm>({ ...filterForm.value });

const statusOptions: Array<{ label: string; value: OrderStatus }> = [
    { label: 'Taslak', value: 'draft' },
    { label: 'Onaylandı', value: 'confirmed' },
    { label: 'Hazırlanıyor', value: 'processing' },
    { label: 'Sevk Edildi', value: 'shipped' },
    { label: 'Teslim Edildi', value: 'delivered' },
    { label: 'İptal', value: 'cancelled' },
    { label: 'Tamamlandı', value: 'completed' }
];

onMounted(() => {
    salesStore.fetchOrders();
    financeStore.fetchAccounts(); // Cari hesaplar listesi için
});

function openNew() {
    router.push('/sales/orders/create');
}

function viewOrder(id: string) {
    router.push(`/sales/orders/edit/${id}`);
}

function getStatusLabel(status: OrderStatus) {
    const map: Record<OrderStatus, string> = {
        draft: 'Taslak',
        confirmed: 'Onaylandı',
        processing: 'Hazırlanıyor',
        shipped: 'Sevk Edildi',
        delivered: 'Teslim Edildi',
        cancelled: 'İptal',
        completed: 'Tamamlandı'
    };
    return map[status] || status;
}

function getStatusSeverity(status: OrderStatus) {
    const map: Record<OrderStatus, 'secondary' | 'info' | 'warn' | 'success' | 'danger'> = {
        draft: 'secondary',
        confirmed: 'info',
        processing: 'warn',
        shipped: 'info',
        delivered: 'success',
        cancelled: 'danger',
        completed: 'success'
    };
    return map[status] || 'secondary';
}

function formatCurrency(value: number, currency: string) {
    return value.toLocaleString('tr-TR', { style: 'currency', currency: currency || 'TRY' });
}

const filteredOrders = computed(() => {
    let list = salesStore.orders ?? [];
    const filters = activeFilters.value;

    if (filters.orderNumber) {
        const query = filters.orderNumber.toLowerCase();
        list = list.filter((item) => (item.orderNumber || '').toLowerCase().includes(query));
    }
    if (filters.status) {
        list = list.filter((item) => item.status === filters.status);
    }
    if (filters.startDate || filters.endDate) {
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;
        list = list.filter((item) => {
            const value = item.issueDate ? new Date(item.issueDate) : null;
            if (!value || Number.isNaN(value.getTime())) return false;
            if (start && value < start) return false;
            if (end && value > end) return false;
            return true;
        });
    }
    if (filters.accountId) {
        list = list.filter((item) => item.accountId === filters.accountId);
    }
    if (filters.currency) {
        const query = filters.currency.toLowerCase();
        list = list.filter((item) => (item.currency || '').toLowerCase().includes(query));
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
        orderNumber: '',
        status: null,
        startDate: null,
        endDate: null,
        accountId: null,
        currency: ''
    };
    activeFilters.value = { ...filterForm.value };
}
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Siparişler</div>
            </div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Sipariş" icon="pi pi-plus" severity="secondary" @click="openNew" />
                </template>
                <template #end>
                    <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.orderNumber" placeholder="Sipariş No" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Durum" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Cari Hesap" fluid />
                </div>
                <div class="col-span-1">
                    <DatePicker v-model="filterForm.startDate" placeholder="Başlangıç" fluid />
                </div>
                <div class="col-span-1">
                    <DatePicker v-model="filterForm.endDate" placeholder="Bitiş" fluid />
                </div>
                <div class="col-span-1 flex gap-2">
                    <Button label="Filtrele" icon="pi pi-search" class="w-full" @click="applyFilters" />
                    <Button label="Temizle" icon="pi pi-filter-slash" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <div class="card">
            <DataTable
                :value="filteredOrders"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[10, 25, 50]"
                emptyMessage="Kayıtlı sipariş bulunamadı."
            >
                <Column field="orderNumber" header="Sipariş No" sortable style="min-width: 130px" />
                <Column header="Müşteri (Cari)" sortable style="min-width: 180px">
                    <template #body="slotProps">
                        <span class="font-medium">{{ slotProps.data.accountName ?? '—' }}</span>
                    </template>
                </Column>
                <Column field="issueDate" header="Tarih" sortable style="min-width: 110px">
                    <template #body="slotProps">
                        {{ new Date(slotProps.data.issueDate).toLocaleDateString('tr-TR') }}
                    </template>
                </Column>
                <Column field="status" header="Durum" sortable style="min-width: 140px">
                    <template #body="slotProps">
                        <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="getStatusLabel(slotProps.data.status)" />
                    </template>
                </Column>
                <Column field="total" header="Toplam" sortable style="min-width: 130px">
                    <template #body="slotProps">
                        <span class="font-semibold">{{ formatCurrency(slotProps.data.total, slotProps.data.currency) }}</span>
                    </template>
                </Column>
                <Column header="İşlemler" style="min-width: 80px; text-align: center">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded @click="viewOrder(slotProps.data.id)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
