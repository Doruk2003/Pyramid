<script setup lang="ts">
import { onMounted } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useRouter } from 'vue-router';
import type { InvoiceStatus, InvoiceType } from '@/modules/finance/domain/invoice.entity';

const financeStore = useFinanceStore();
const router = useRouter();

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
</script>

<template>
    <div class="card">
        <Toolbar class="mb-6">
            <template #start>
                <Button label="Yeni Fatura" icon="pi pi-plus" severity="secondary" @click="openNew" />
            </template>
        </Toolbar>

        <h4 class="m-0 mb-4">Faturalar</h4>
        <DataTable :value="financeStore.invoices" dataKey="id" :paginator="true" :rows="10">
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
</template>
