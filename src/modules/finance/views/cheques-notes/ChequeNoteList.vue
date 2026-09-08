<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import type { ChequeNote, ChequeNoteDirection, ChequeNoteStatus, ChequeNoteType } from '@/modules/finance/domain/cheque-note.entity';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const router = useRouter();
const financeStore = useFinanceStore();
const toast = useToast();
const confirm = useConfirm();

const searchQuery = ref('');
const selectedDirection = ref<string>('all');
const selectedType = ref<string>('all');
const selectedStatus = ref<string>('all');

// Status Güncelleme Dialog
const statusDialogVisible = ref(false);
const selectedCheque = ref<ChequeNote | null>(null);
const targetStatus = ref<ChequeNoteStatus>('portfolio');
const targetCashRegisterId = ref<string>('');

const directionOptions = [
    { label: 'Tümü', value: 'all' },
    { label: 'Alınan Çek / Senetler (Müşteri)', value: 'received' },
    { label: 'Verilen Çek / Senetler (Borç)', value: 'issued' }
];

const typeOptions = [
    { label: 'Tümü', value: 'all' },
    { label: 'Çek', value: 'cheque' },
    { label: 'Senet', value: 'note' }
];

const statusOptions = [
    { label: 'Tümü', value: 'all' },
    { label: 'Portföyde', value: 'portfolio' },
    { label: 'Ciro Edildi', value: 'endorsed' },
    { label: 'Bankaya Takasa Verildi', value: 'bank_clearing' },
    { label: 'Bankaya Teminata Verildi', value: 'bank_collateral' },
    { label: 'Tahsil Edildi', value: 'collected' },
    { label: 'Ödendi', value: 'paid' },
    { label: 'Karşılıksız / Protestolu', value: 'unpaid' },
    { label: 'İade Edildi', value: 'returned' }
];

async function loadData() {
    await financeStore.fetchChequeNotes();
    await financeStore.fetchCashRegisters();
}

onMounted(loadData);

const filteredChequeNotes = computed(() => {
    return (financeStore.chequeNotes || []).filter((item) => {
        if (selectedDirection.value !== 'all' && item.direction !== selectedDirection.value) return false;
        if (selectedType.value !== 'all' && item.type !== selectedType.value) return false;
        if (selectedStatus.value !== 'all' && item.status !== selectedStatus.value) return false;
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            const serialMatch = item.serialNumber.toLowerCase().includes(q);
            const bankMatch = (item.bankName || '').toLowerCase().includes(q);
            const accountMatch = (item.accountName || '').toLowerCase().includes(q);
            const drawerMatch = (item.drawer || '').toLowerCase().includes(q);
            if (!serialMatch && !bankMatch && !accountMatch && !drawerMatch) return false;
        }
        return true;
    });
});

// KPI İstatistikleri
const summaryStats = computed(() => {
    const items = financeStore.chequeNotes || [];
    let portfolioTotal = 0;
    let collectedTotal = 0;
    let unpaidCount = 0;

    items.forEach((item) => {
        if (item.status === 'portfolio') portfolioTotal += item.amount;
        if (item.status === 'collected' || item.status === 'paid') collectedTotal += item.amount;
        if (item.status === 'unpaid') unpaidCount += 1;
    });

    return {
        totalCount: items.length,
        portfolioTotal,
        collectedTotal,
        unpaidCount
    };
});

function formatCurrency(val: number, currency = 'TRY') {
    return val.toLocaleString('tr-TR', { style: 'currency', currency });
}

function formatDate(date?: Date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
}

function getStatusLabel(status: ChequeNoteStatus): string {
    switch (status) {
        case 'portfolio': return 'Portföyde';
        case 'endorsed': return 'Ciro Edildi';
        case 'bank_clearing': return 'Takasta';
        case 'bank_collateral': return 'Teminatta';
        case 'collected': return 'Tahsil Edildi';
        case 'paid': return 'Ödendi';
        case 'unpaid': return 'Karşılıksız/Protestolu';
        case 'returned': return 'İade Edildi';
        default: return status;
    }
}

function getStatusSeverity(status: ChequeNoteStatus) {
    switch (status) {
        case 'portfolio': return 'info';
        case 'endorsed': return 'warn';
        case 'bank_clearing': return 'secondary';
        case 'bank_collateral': return 'secondary';
        case 'collected': return 'success';
        case 'paid': return 'success';
        case 'unpaid': return 'danger';
        case 'returned': return 'contrast';
        default: return 'secondary';
    }
}

function openStatusDialog(item: ChequeNote) {
    selectedCheque.value = item;
    targetStatus.value = item.status;
    targetCashRegisterId.value = item.cashRegisterId || '';
    statusDialogVisible.value = true;
}

async function saveStatusChange() {
    if (!selectedCheque.value) return;
    
    // Tahsil edildiyse veya ödendiyse kasa seçimi opsiyonel uyarısı
    const res = await financeStore.updateChequeNoteStatus(
        selectedCheque.value.id,
        targetStatus.value,
        targetCashRegisterId.value || undefined
    );

    if (res.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Çek/Senet durumu güncellendi.', life: 3000 });
        statusDialogVisible.value = false;
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: res.error.message, life: 4000 });
    }
}

function confirmDelete(item: ChequeNote) {
    confirm.require({
        message: `${item.serialNumber} seri numaralı evrakı silmek istediğinize emin misiniz?`,
        header: 'Evrak Silme Onayı',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            const res = await financeStore.deleteChequeNote(item.id);
            if (res.success) {
                toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Evrak silindi.', life: 3000 });
            } else {
                toast.add({ severity: 'error', summary: 'Hata', detail: res.error.message, life: 4000 });
            }
        }
    });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="card p-4 flex items-center justify-between">
            <div>
                <div class="text-2xl font-bold flex items-center gap-2">
                    <i class="pi pi-ticket text-primary"></i>
                    Çek & Senet Portföy Yönetimi
                </div>
                <div class="text-surface-500 text-sm mt-1">Alınan ve verilen çek/senetlerin vade, bordro ve yaşam döngüsü takibi</div>
            </div>
            <div class="flex gap-2">
                <Button label="Yeni Çek/Senet Girişi" icon="pi pi-plus" @click="router.push('/finance/cheques-notes/create')" />
            </div>
        </div>

        <!-- KPI Özet Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="card p-4 flex items-center gap-3 border-l-4 border-blue-500">
                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <i class="pi pi-wallet text-blue-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ formatCurrency(summaryStats.portfolioTotal) }}</div>
                    <div class="text-xs text-surface-500">Portföydeki Toplam Tutar</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-green-500">
                <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <i class="pi pi-check-circle text-green-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-green-600 dark:text-green-400">{{ formatCurrency(summaryStats.collectedTotal) }}</div>
                    <div class="text-xs text-surface-500">Tahsil Edilen / Ödenen</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-red-500">
                <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <i class="pi pi-exclamation-triangle text-red-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-red-600 dark:text-red-400">{{ summaryStats.unpaidCount }} Adet</div>
                    <div class="text-xs text-surface-500">Karşılıksız / Protestolu</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-surface-400">
                <div class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <i class="pi pi-list text-surface-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold">{{ summaryStats.totalCount }} Adet</div>
                    <div class="text-xs text-surface-500">Toplam Evrak Sayısı</div>
                </div>
            </div>
        </div>

        <!-- Filtreler -->
        <div class="card p-4">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                    <label class="block text-sm font-semibold mb-2">Evrak / Cari Ara</label>
                    <div class="p-input-icon-left w-full">
                        <i class="pi pi-search"></i>
                        <InputText v-model="searchQuery" placeholder="Seri no, banka veya cari..." fluid />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Yön (Alınan / Verilen)</label>
                    <Select v-model="selectedDirection" :options="directionOptions" optionLabel="label" optionValue="value" fluid />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Evrak Türü</label>
                    <Select v-model="selectedType" :options="typeOptions" optionLabel="label" optionValue="value" fluid />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Portföy Durumu</label>
                    <Select v-model="selectedStatus" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                </div>
            </div>
        </div>

        <!-- Tablo -->
        <div class="card p-0 dt-compact">
            <DataTable
                :value="filteredChequeNotes"
                :loading="financeStore.loadingChequeNotes"
                paginator
                :rows="15"
                size="small"
                stripedRows
                scrollable
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-inbox text-5xl mb-3 text-surface-300"></i>
                        <span>Herhangi bir çek veya senet kaydı bulunamadı.</span>
                    </div>
                </template>

                <Column field="serialNumber" header="Seri No / Evrak No" sortable style="width: 12%">
                    <template #body="{ data }">
                        <span class="font-mono font-bold text-surface-900 dark:text-surface-0">{{ data.serialNumber }}</span>
                    </template>
                </Column>

                <Column field="type" header="Tür" sortable style="width: 8%">
                    <template #body="{ data }">
                        <Tag :value="data.type === 'cheque' ? 'ÇEK' : 'SENET'" :severity="data.type === 'cheque' ? 'info' : 'warn'" />
                    </template>
                </Column>

                <Column field="direction" header="Yön" sortable style="width: 10%">
                    <template #body="{ data }">
                        <span class="text-xs font-semibold" :class="data.direction === 'received' ? 'text-green-600' : 'text-orange-600'">
                            {{ data.direction === 'received' ? '⬇ Alınan (Müşteri)' : '⬆ Verilen (Kendi)' }}
                        </span>
                    </template>
                </Column>

                <Column field="accountName" header="Cari Hesap / İlgili" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <div>
                            <div class="font-medium">{{ data.accountName || '-' }}</div>
                            <div v-if="data.drawer" class="text-xs text-surface-400">Keşideci: {{ data.drawer }}</div>
                        </div>
                    </template>
                </Column>

                <Column field="bankName" header="Banka / Şube" style="width: 14%">
                    <template #body="{ data }">
                        <span class="text-xs">{{ data.bankName || '-' }} {{ data.bankBranch ? `/ ${data.bankBranch}` : '' }}</span>
                    </template>
                </Column>

                <Column field="dueDate" header="Vade Tarihi" sortable style="width: 10%">
                    <template #body="{ data }">
                        <span class="font-semibold text-surface-800 dark:text-surface-100">{{ formatDate(data.dueDate) }}</span>
                    </template>
                </Column>

                <Column field="amount" header="Tutar" sortable style="width: 12%; text-align: right">
                    <template #body="{ data }">
                        <span class="font-bold text-right block text-blue-600 dark:text-blue-400">
                            {{ formatCurrency(data.amount, data.currency) }}
                        </span>
                    </template>
                </Column>

                <Column field="status" header="Durum" sortable style="width: 12%; text-align: center">
                    <template #body="{ data }">
                        <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                    </template>
                </Column>

                <Column header="İşlemler" style="width: 10%; text-align: center">
                    <template #body="{ data }">
                        <div class="flex items-center justify-center gap-1">
                            <Button icon="pi pi-sync" severity="secondary" text rounded tooltip="Durum Değiştir" @click="openStatusDialog(data)" />
                            <Button icon="pi pi-pencil" severity="info" text rounded tooltip="Düzenle" @click="router.push(`/finance/cheques-notes/edit/${data.id}`)" />
                            <Button icon="pi pi-trash" severity="danger" text rounded tooltip="Sil" @click="confirmDelete(data)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Durum Değiştirme Modal Dialog -->
        <Dialog v-model:visible="statusDialogVisible" header="Çek / Senet Durumu Güncelle" modal style="width: 450px">
            <div class="flex flex-col gap-4 py-2" v-if="selectedCheque">
                <div class="bg-surface-50 dark:bg-surface-800 p-3 rounded border border-surface-200 dark:border-surface-700">
                    <div><strong>Evrak:</strong> {{ selectedCheque.serialNumber }} ({{ selectedCheque.type === 'cheque' ? 'ÇEK' : 'SENET' }})</div>
                    <div><strong>Tutar:</strong> {{ formatCurrency(selectedCheque.amount, selectedCheque.currency) }}</div>
                    <div><strong>Mevcut Durum:</strong> {{ getStatusLabel(selectedCheque.status) }}</div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-semibold">Yeni Durum Seçin</label>
                    <Select v-model="targetStatus" :options="statusOptions.filter(o => o.value !== 'all')" optionLabel="label" optionValue="value" fluid />
                </div>

                <div v-if="targetStatus === 'collected' || targetStatus === 'paid'" class="flex flex-col gap-2">
                    <label class="font-semibold">Tahsilat / Ödeme Yapılan Kasa/Banka</label>
                    <Select v-model="targetCashRegisterId" :options="financeStore.cashRegisters" optionLabel="name" optionValue="id" placeholder="Kasa/Banka Seçin" fluid />
                </div>
            </div>
            <template #footer>
                <Button label="İptal" severity="secondary" outlined @click="statusDialogVisible = false" />
                <Button label="Durumu Güncelle" icon="pi pi-check" @click="saveStatusChange" />
            </template>
        </Dialog>
    </div>
</template>
