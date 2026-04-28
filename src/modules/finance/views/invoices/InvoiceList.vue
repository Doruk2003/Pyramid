<script setup lang="ts">
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import type { Invoice, InvoiceStatus, InvoiceType } from '@/modules/finance/domain/invoice.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const financeStore = useFinanceStore();
const router = useRouter();
const toast = useToast();
const showFilters = ref(false);
const deleteDialog = ref(false);
const invoiceToDelete = ref<any>(null);

const menu = ref();
const menuItems = computed(() => [
    {
        label: 'Düzenle',
        command: () => {
            if (invoiceToDelete.value) viewInvoice(invoiceToDelete.value.id);
        }
    },
    {
        label: 'Sil',
        disabled: invoiceToDelete.value?.status !== 'draft',
        command: () => {
            if (invoiceToDelete.value) confirmDeleteInvoice(invoiceToDelete.value);
        }
    }
]);

const onActionClick = (event: any, inv: Invoice) => {
    invoiceToDelete.value = inv;
    menu.value.toggle(event);
};

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
    financeStore.fetchAccounts(); // Filtre için cari hesaplar
});

function openNew() {
    router.push('/finance/invoices/create');
}

function viewInvoice(id: string) {
    router.push(`/finance/invoices/edit/${id}`);
}

function confirmDeleteInvoice(inv: Invoice) {
    if (inv.status !== 'draft') {
        toast.add({ severity: 'warn', summary: 'Uyarı', detail: 'Sadece Taslak statüsündeki faturalar silinebilir.', life: 4000 });
        return;
    }
    invoiceToDelete.value = inv;
    deleteDialog.value = true;
}

async function deleteInvoice() {
    if (!invoiceToDelete.value?.id) return;
    const result = await financeStore.deleteInvoice(invoiceToDelete.value.id);
    deleteDialog.value = false;
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Silindi', detail: 'Fatura silindi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
    invoiceToDelete.value = null;
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
                <div class="m-0 text-2xl font-medium">Faturalar</div>
            </div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Fatura Girişi" icon="pi pi-plus" severity="primary" @click="openNew" />
                </template>
                <template #end>
                    <Button icon="pi pi-filter" severity="secondary" v-tooltip.bottom="'Filtreleri Aç/Kapa'" @click="toggleFilters" />
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
                <div class="col-span-1 flex items-end gap-1">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <div class="card">
            <DataTable
                :value="filteredInvoices"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[10, 25, 50]"
                emptyMessage="Kayıtlı fatura bulunamadı."
            >
                <Column field="invoiceNumber" header="Fatura No" sortable style="min-width: 130px" />
                <Column field="invoiceType" header="Tip" sortable style="min-width: 110px">
                    <template #body="slotProps">
                        {{ getInvoiceTypeLabel(slotProps.data.invoiceType) }}
                    </template>
                </Column>
                <Column field="issueDate" header="Tarih" sortable style="min-width: 110px">
                    <template #body="slotProps">
                        {{ new Date(slotProps.data.issueDate).toLocaleDateString('tr-TR') }}
                    </template>
                </Column>
                <Column field="status" header="Durum" sortable style="min-width: 110px">
                    <template #body="slotProps">
                        <Tag :severity="getStatusSeverity(slotProps.data.status)" :value="getStatusLabel(slotProps.data.status)" />
                    </template>
                </Column>
                <Column field="total" header="Toplam" sortable style="min-width: 130px">
                    <template #body="slotProps">
                        <span class="font-semibold">{{ formatCurrency(slotProps.data.total, slotProps.data.currency) }}</span>
                    </template>
                </Column>
                <Column header="İşlemler" style="min-width: 50px">
                    <template #body="slotProps">
                        <Button icon="pi pi-ellipsis-v" text rounded @click="onActionClick($event, slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Silme Onay Dialogu -->
        <Dialog
            v-model:visible="deleteDialog"
            :style="{ width: '420px' }"
            header="Fatura Silme Onayı"
            :modal="true"
        >
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-4xl text-orange-500" />
                <div>
                    <p class="font-semibold mb-1">Bu faturayı silmek istediğinizden emin misiniz?</p>
                    <p class="text-surface-600 dark:text-surface-400 text-sm">
                        Fatura No: <strong>{{ invoiceToDelete?.invoiceNumber }}</strong> soft-delete ile işaretlenecek.
                        Fatura geçmişi ve audit kaydı korunacaktır.
                    </p>
                </div>
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="deleteDialog = false" />
                <Button label="Evet, Sil" icon="pi pi-trash" severity="danger" @click="deleteInvoice" />
            </template>
        </Dialog>

        <Menu ref="menu" :model="menuItems" :popup="true" />
    </div>
</template>
