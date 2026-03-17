<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useRouter } from 'vue-router';
import type { InvoiceStatus, InvoiceType } from '@/modules/finance/domain/invoice.entity';

const financeStore = useFinanceStore();
const router = useRouter();
const showFilters = ref(false);

interface InvoiceFilterForm {
    invoiceNumber: string;
    invoiceType: InvoiceType | null;
    status: InvoiceStatus | null;
    startDate: Date | null;
    endDate: Date | null;
    accountId: string | null;
    currency: string;
}

const filterForm = ref<InvoiceFilterForm>({
    invoiceNumber: '',
    invoiceType: null,
    status: null,
    startDate: null,
    endDate: null,
    accountId: null,
    currency: ''
});

const activeFilters = ref<InvoiceFilterForm>({ ...filterForm.value });

const invoiceTypeOptions: Array<{ label: string; value: InvoiceType }> = [
    { label: 'Satış', value: 'sale' },
    { label: 'Alış', value: 'purchase' },
    { label: 'Satış İade', value: 'return_sale' },
    { label: 'Alış İade', value: 'return_purchase' }
];

const statusOptions: Array<{ label: string; value: InvoiceStatus }> = [
    { label: 'Taslak', value: 'draft' },
    { label: 'Onaylı', value: 'issued' },
    { label: 'Ödendi', value: 'paid' },
    { label: 'İptal', value: 'cancelled' }
];

onMounted(() => {
    financeStore.fetchInvoices();
});

function openNew() {
    router.push('/finance/invoices/create');
}

function viewInvoice(id: string) {
    router.push(`/finance/invoices/edit/${id}`);
}

function getInvoiceTypeLabel(type: InvoiceType) {
    const map: Record<InvoiceType, string> = {
        sale: 'Satış',
        purchase: 'Alış',
        return_sale: 'Satış İade',
        return_purchase: 'Alış İade'
    };
    return map[type] || type;
}

function getStatusLabel(status: InvoiceStatus) {
    const map: Record<InvoiceStatus, string> = {
        draft: 'Taslak',
        issued: 'Onaylı',
        paid: 'Ödendi',
        cancelled: 'İptal'
    };
    return map[status] || status;
}

function getStatusSeverity(status: InvoiceStatus) {
    const map: Record<InvoiceStatus, 'secondary' | 'info' | 'success' | 'danger'> = {
        draft: 'secondary',
        issued: 'info',
        paid: 'success',
        cancelled: 'danger'
    };
    return map[status] || 'secondary';
}

function formatCurrency(value: number, currency: string) {
    return value.toLocaleString('tr-TR', { style: 'currency', currency: currency || 'TRY' });
}

const filteredInvoices = computed(() => {
    let list = financeStore.invoices ?? [];
    const filters = activeFilters.value;

    if (filters.invoiceNumber) {
        const query = filters.invoiceNumber.toLowerCase();
        list = list.filter((item) => (item.invoiceNumber || '').toLowerCase().includes(query));
    }
    if (filters.invoiceType) {
        list = list.filter((item) => item.invoiceType === filters.invoiceType);
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
        invoiceNumber: '',
        invoiceType: null,
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
                <h4 class="m-0 text-xl font-semibold">Faturalar</h4>
            </div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Fatura" icon="pi pi-plus" severity="secondary" @click="openNew" />
                </template>
                <template #end>
                    <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.invoiceNumber" placeholder="Fatura No" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.invoiceType" :options="invoiceTypeOptions" optionLabel="label" optionValue="value" placeholder="Tip" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Durum" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Cari Hesap" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.currency" placeholder="Döviz" fluid />
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
            <DataTable :value="filteredInvoices" dataKey="id" :paginator="true" :rows="10">
                <Column field="invoiceNumber" header="Fatura No" sortable></Column>
                <Column field="invoiceType" header="Tip" sortable>
                    <template #body="slotProps">
                        {{ getInvoiceTypeLabel(slotProps.data.invoiceType) }}
                    </template>
                </Column>
                <Column field="issueDate" header="Tarih" sortable>
                    <template #body="slotProps">
                        {{ new Date(slotProps.data.issueDate).toLocaleDateString() }}
                    </template>
                </Column>
                <Column field="status" header="Durum" sortable>
                    <template #body="slotProps">
                        <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="getStatusLabel(slotProps.data.status)" />
                    </template>
                </Column>
                <Column field="total" header="Toplam" sortable>
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.total, slotProps.data.currency) }}
                    </template>
                </Column>
                <Column header="İşlemler">
                    <template #body="slotProps">
                        <Button icon="pi pi-search" outlined rounded class="mr-2" @click="viewInvoice(slotProps.data.id)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
