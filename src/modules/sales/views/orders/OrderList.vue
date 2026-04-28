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

const menu = ref();
const actionTarget = ref<any | null>(null);
const selectedOrders = ref<any[]>([]); // Çoklu seçim için

const menuItems = computed(() => [
    {
        label: 'Düzenle',
        command: () => {
            if (actionTarget.value) viewOrder(actionTarget.value.id);
        }
    }
]);

const onActionClick = (event: any, row: any) => {
    actionTarget.value = row;
    menu.value.toggle(event);
};

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
    { label: 'Kısmi Faturalandı', value: 'partially_invoiced' },
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

function bulkInvoice() {
    if (selectedOrders.value.length === 0) return;

    // 1. Kontrol: Tüm siparişler aynı cari hesaba mı ait?
    const accountIds = new Set(selectedOrders.value.map(o => o.accountId));
    if (accountIds.size > 1) {
        // Burada bir toast mesajı iyi olurdu ama şimdilik konsol/basit uyarı
        alert('Farklı cari hesaplara ait siparişler toplu faturalandırılamaz.');
        return;
    }

    // 2. Kontrol: Tüm siparişler aynı döviz cinsinden mi?
    const currencies = new Set(selectedOrders.value.map(o => o.currency));
    if (currencies.size > 1) {
        alert('Farklı döviz cinsinden siparişler toplu faturalandırılamaz.');
        return;
    }

    const ids = selectedOrders.value.map(o => o.id).join(',');
    router.push({
        path: '/finance/invoices/create',
        query: { sourceIds: ids, sourceType: 'order' }
    });
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
        partially_invoiced: 'Kısmi Faturalandı',
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
        partially_invoiced: 'warn',
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
                    <div class="flex gap-2">
                        <Button label="Yeni Sipariş" icon="pi pi-plus" severity="secondary" @click="openNew" />
                        <Button 
                            v-if="selectedOrders.length > 0" 
                            label="Faturalandır" 
                            icon="pi pi-file-export" 
                            severity="success" 
                            @click="bulkInvoice" 
                        />
                    </div>
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
                    <DatePicker v-model="filterForm.startDate" placeholder="Başlangıç" dateFormat="dd.mm.yy" fluid />
                </div>
                <div class="col-span-1">
                    <DatePicker v-model="filterForm.endDate" placeholder="Bitiş" dateFormat="dd.mm.yy" fluid />
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
                v-model:selection="selectedOrders"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[10, 25, 50]"
                emptyMessage="Kayıtlı sipariş bulunamadı."
            >
                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
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
                <Column header="Sevk/Fatura" style="min-width: 120px">
                    <template #body="slotProps">
                        <div class="flex flex-col gap-1 w-full">
                            <ProgressBar 
                                :value="Math.round((slotProps.data.lines.reduce((sum: number, l: any) => sum + (l.invoicedQuantity || 0), 0) / slotProps.data.lines.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0)) * 100) || 0" 
                                :showValue="false" 
                                style="height: 4px"
                            />
                            <span class="text-[10px] text-surface-500">
                                {{ slotProps.data.lines.reduce((sum: number, l: any) => sum + (l.invoicedQuantity || 0), 0) }} / {{ slotProps.data.lines.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0) }}
                            </span>
                        </div>
                    </template>
                </Column>
                <Column field="total" header="Toplam" sortable style="min-width: 130px">
                    <template #body="slotProps">
                        <span class="font-semibold">{{ formatCurrency(slotProps.data.total, slotProps.data.currency) }}</span>
                    </template>
                </Column>
                <Column header="İşlemler" style="min-width: 50px; text-align: center">
                    <template #body="slotProps">
                        <Button icon="pi pi-ellipsis-v" text rounded @click="onActionClick($event, slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>
        <Menu ref="menu" :model="menuItems" :popup="true" />
    </div>
</template>
