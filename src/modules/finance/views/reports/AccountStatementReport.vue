<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useToast } from 'primevue/usetoast';
import { exportReportToPDF } from '@/shared/utils/pdf-generator';

import type { AccountStatementReportData } from '@/modules/finance/domain/finance.repository';

const financeStore = useFinanceStore();
const toast = useToast();

const selectedAccountId = ref<string | null>(null);
const startDate = ref<Date | null>(null);
const endDate = ref<Date | null>(null);

const statementData = ref<AccountStatementReportData>({
    initialBalance: 0,
    initialBalanceType: 'Bakiye Yok',
    rawInitialBalance: 0,
    rows: [],
    periodDebitTotal: 0,
    periodCreditTotal: 0,
    finalBalance: 0,
    finalBalanceType: 'Bakiye Yok'
});

const loading = ref(false);

function resetStatementData() {
    statementData.value = {
        initialBalance: 0,
        initialBalanceType: 'Bakiye Yok',
        rawInitialBalance: 0,
        rows: [],
        periodDebitTotal: 0,
        periodCreditTotal: 0,
        finalBalance: 0,
        finalBalanceType: 'Bakiye Yok'
    };
}

async function fetchStatement() {
    if (!selectedAccountId.value) {
        resetStatementData();
        return;
    }
    loading.value = true;
    try {
        const result = await financeStore.fetchAccountStatementReport(
            selectedAccountId.value,
            startDate.value,
            endDate.value
        );
        if (result.success) {
            statementData.value = result.data;
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: 'Ekstre yüklenirken hata oluştu.', life: 4000 });
        }
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Ekstre çekilirken beklenmedik bir hata oluştu.', life: 4000 });
    } finally {
        loading.value = false;
    }
}

watch([selectedAccountId, startDate, endDate], () => {
    fetchStatement();
});

onMounted(async () => {
    loading.value = true;
    try {
        await financeStore.fetchAccounts();
        if (financeStore.accounts && financeStore.accounts.length > 0) {
            selectedAccountId.value = financeStore.accounts[0].id;
        }
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
});

// Seçilen Cari Hesap Detay Bilgisi
const selectedAccountDetails = computed(() => {
    if (!selectedAccountId.value) return null;
    return financeStore.accounts.find((a) => a.id === selectedAccountId.value) || null;
});

function formatCurrency(value: number) {
    return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

function getInvoiceTypeLabel(type: string) {
    switch (type) {
        case 'sale': return 'Satış Faturası';
        case 'purchase': return 'Alış Faturası';
        case 'return_sale': return 'Satış İade Faturası';
        case 'return_purchase': return 'Alış İade Faturası';
        case 'collection': return 'Tahsilat';
        case 'payment': return 'Tediye (Ödeme)';
        case 'debit_note': return 'Borç Dekontu';
        case 'credit_note': return 'Alacak Dekontu';
        default: return type;
    }
}

function getInvoiceTypeSeverity(type: string) {
    switch (type) {
        case 'sale': return 'info';
        case 'purchase': return 'warn';
        case 'return_sale': return 'danger';
        case 'return_purchase': return 'success';
        case 'collection': return 'success';
        case 'payment': return 'danger';
        case 'debit_note': return 'info';
        case 'credit_note': return 'warn';
        default: return 'secondary';
    }
}

function clearFilters() {
    startDate.value = null;
    endDate.value = null;
}

function exportCSV() {
    if (!selectedAccountDetails.value) {
        toast.add({ severity: 'warn', summary: 'Uyarı', detail: 'Öncelikle bir cari hesap seçmelisiniz.', life: 3000 });
        return;
    }

    const headers = [
        'Tarih', 'Evrak No', 'İşlem Türü', 'Açıklama',
        'Borç', 'Alacak', 'Bakiye', 'Bakiye Yönü'
    ];
    
    // Devreden bakiye satırı ekle
    const devredenRow = [
        '-', '-', 'Devreden Bakiye', 'Dönem Öncesinden Kalan',
        '-', '-', statementData.value.initialBalance.toFixed(2), statementData.value.initialBalanceType
    ];

    const rows = statementData.value.rows.map((r) => [
        r.date.toLocaleDateString('tr-TR'), r.invoiceNumber, getInvoiceTypeLabel(r.invoiceType), r.notes,
        r.debit > 0 ? r.debit.toFixed(2) : '0.00',
        r.credit > 0 ? r.credit.toFixed(2) : '0.00',
        r.cumulativeBalance.toFixed(2), r.cumulativeBalanceType
    ]);

    const csv = [headers, devredenRow, ...rows].map((r) => r.map((v: any) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAccountDetails.value.name.replace(/\s+/g, '_')}-ekstresi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

async function exportPDF() {
    if (!selectedAccountDetails.value) {
        toast.add({ severity: 'warn', summary: 'Uyarı', detail: 'Öncelikle bir cari hesap seçmelisiniz.', life: 3000 });
        return;
    }

    try {
        toast.add({ severity: 'info', summary: 'Hazırlanıyor', detail: 'PDF ekstresi oluşturuluyor...', life: 2000 });

        const filtersList: { label: string, value: string }[] = [
            { label: 'Cari Hesap', value: selectedAccountDetails.value.name }
        ];
        if (startDate.value) {
            filtersList.push({ label: 'Başlangıç', value: startDate.value.toLocaleDateString('tr-TR') });
        }
        if (endDate.value) {
            filtersList.push({ label: 'Bitiş', value: endDate.value.toLocaleDateString('tr-TR') });
        }

        const summaryCards = [
            { 
                label: `Devreden Bakiye (${statementData.value.initialBalanceType})`, 
                value: formatCurrency(statementData.value.initialBalance), 
                color: (statementData.value.initialBalanceType === 'Borç' ? 'success' : 'danger') as 'success' | 'danger'
            },
            { label: 'Dönem İçi Borç', value: formatCurrency(statementData.value.periodDebitTotal), color: 'info' as const },
            { label: 'Dönem İçi Alacak', value: formatCurrency(statementData.value.periodCreditTotal), color: 'warning' as const },
            { 
                label: `Net Kalan Bakiye (${statementData.value.finalBalanceType})`, 
                value: formatCurrency(statementData.value.finalBalance), 
                color: (statementData.value.finalBalanceType === 'Borç' ? 'success' : 'danger') as 'success' | 'danger'
            }
        ];

        const headers = ['Tarih', 'Evrak No', 'İşlem Türü', 'Açıklama', 'Borç', 'Alacak', 'Kalan Bakiye', 'Yön'];
        
        // Devreden bakiye satırı ilk satır olarak eklenecek
        const devRow = [
            '-',
            '-',
            'DEVREDEN BAKİYE',
            'Dönem Başlangıcı Öncesi',
            '-',
            '-',
            formatCurrency(statementData.value.initialBalance),
            {
                isBadge: true,
                text: statementData.value.initialBalanceType,
                severity: statementData.value.initialBalanceType === 'Borç' ? 'success' : statementData.value.initialBalanceType === 'Alacak' ? 'danger' : 'neutral'
            }
        ];

        const rows = [
            devRow,
            ...statementData.value.rows.map(r => [
                r.date.toLocaleDateString('tr-TR'),
                r.invoiceNumber,
                getInvoiceTypeLabel(r.invoiceType),
                r.notes,
                r.debit > 0 ? formatCurrency(r.debit) : '-',
                r.credit > 0 ? formatCurrency(r.credit) : '-',
                formatCurrency(r.cumulativeBalance),
                {
                    isBadge: true,
                    text: r.cumulativeBalanceType,
                    severity: r.cumulativeBalanceType === 'Borç' ? 'success' : r.cumulativeBalanceType === 'Alacak' ? 'danger' : 'neutral'
                }
            ])
        ];

        await exportReportToPDF({
            title: 'Cari Hesap Ekstre Raporu',
            headers,
            rows,
            alignments: ['left', 'left', 'center', 'left', 'right', 'right', 'right', 'center'],
            fileName: `${selectedAccountDetails.value.name.replace(/\s+/g, '_')}-ekstresi-${new Date().toISOString().slice(0, 10)}.pdf`,
            summaryCards,
            filters: filtersList
        });

        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'PDF ekstresi başarıyla indirildi', life: 3000 });
    } catch (err: any) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Hata', detail: 'PDF oluşturulurken bir hata oluştu.', life: 4000 });
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Başlık -->
        <div class="card p-4 flex items-center justify-between">
            <div>
                <div class="text-2xl font-bold flex items-center gap-2">
                    <i class="pi pi-file-pdf text-primary"></i>
                    Cari Hesap Ekstre Raporu
                </div>
                <div class="text-surface-500 text-sm mt-1">Seçilen cari hesabın belirlenen tarih aralığındaki borç, alacak ve kümülatif ekstre detayları</div>
            </div>
            <div class="flex gap-2">
                <Button label="CSV İndir" icon="pi pi-download" severity="secondary" outlined :disabled="!selectedAccountId" @click="exportCSV" />
                <Button label="PDF İndir" icon="pi pi-file-pdf" severity="danger" outlined :disabled="!selectedAccountId" @click="exportPDF" />
            </div>
        </div>

        <!-- Seçici ve Filtreler -->
        <div class="card p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                    <label class="block text-sm font-semibold mb-2">Cari Hesap Seçin</label>
                    <Select
                        v-model="selectedAccountId"
                        :options="financeStore.accounts"
                        optionLabel="name"
                        optionValue="id"
                        filter
                        placeholder="Ekstre çekmek istediğiniz cari hesabı seçin"
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Başlangıç Tarihi</label>
                    <DatePicker v-model="startDate" placeholder="Başlangıç Tarihi" dateFormat="dd.mm.yy" fluid />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Bitiş Tarihi</label>
                    <DatePicker v-model="endDate" placeholder="Bitiş Tarihi" dateFormat="dd.mm.yy" fluid />
                </div>
            </div>
            <div class="flex justify-between items-center mt-3">
                <div v-if="selectedAccountDetails" class="text-sm text-surface-600 dark:text-surface-400">
                    Seçili Cari: <strong class="text-surface-900 dark:text-surface-100">{{ selectedAccountDetails.name }}</strong> 
                    <span class="mx-2">|</span> Kod: <strong>{{ selectedAccountDetails.code || '-' }}</strong>
                    <span class="mx-2">|</span> Limit: <strong>{{ formatCurrency(selectedAccountDetails.creditLimit) }}</strong>
                </div>
                <div v-else></div>
                <Button label="Tarihleri Temizle" icon="pi pi-filter-slash" text size="small" @click="clearFilters" />
            </div>
        </div>

        <!-- Özet Kartlar -->
        <div v-if="selectedAccountId" class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="card p-4 flex items-center gap-3 border-l-4" :class="statementData.initialBalanceType === 'Borç' ? 'border-green-500' : 'border-red-500'">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="statementData.initialBalanceType === 'Borç' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
                    <i class="pi pi-clock" :class="statementData.initialBalanceType === 'Borç' ? 'text-green-500' : 'text-red-500'"></i>
                </div>
                <div>
                    <div class="text-lg font-bold" :class="statementData.initialBalanceType === 'Borç' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ formatCurrency(statementData.initialBalance) }}
                    </div>
                    <div class="text-xs text-surface-500">Devreden Bakiye ({{ statementData.initialBalanceType }})</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-blue-500">
                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <i class="pi pi-plus" text-blue-500></i>
                </div>
                <div>
                    <div class="text-lg font-bold text-blue-600 dark:text-blue-400">{{ formatCurrency(statementData.periodDebitTotal) }}</div>
                    <div class="text-xs text-surface-500">Dönem İçi Toplam Borç</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-amber-500">
                <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <i class="pi pi-minus" text-amber-500></i>
                </div>
                <div>
                    <div class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ formatCurrency(statementData.periodCreditTotal) }}</div>
                    <div class="text-xs text-surface-500">Dönem İçi Toplam Alacak</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4" :class="statementData.finalBalanceType === 'Borç' ? 'border-green-500' : 'border-red-500'">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="statementData.finalBalanceType === 'Borç' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
                    <i class="pi pi-wallet" :class="statementData.finalBalanceType === 'Borç' ? 'text-green-500' : 'text-red-500'"></i>
                </div>
                <div>
                    <div class="text-lg font-bold" :class="statementData.finalBalanceType === 'Borç' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ formatCurrency(statementData.finalBalance) }}
                    </div>
                    <div class="text-xs text-surface-500">Kalan Bakiye ({{ statementData.finalBalanceType }})</div>
                </div>
            </div>
        </div>

        <!-- Tablo -->
        <div v-if="selectedAccountId" class="card p-0 dt-compact">
            <DataTable
                :value="statementData.rows"
                :loading="loading || financeStore.loading"
                size="small"
                stripedRows
                scrollable
                scrollHeight="55vh"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-calendar-times text-5xl mb-3 text-surface-300"></i>
                        <span>Belirlenen dönem içerisinde herhangi bir cari hareket bulunamadı.</span>
                    </div>
                </template>

                <!-- Devreden Bakiye Satırı için Tablo Header Altı Custom Satır veya Gösterim -->
                <template #header>
                    <div class="flex justify-between items-center px-3 py-2 bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                        <span class="text-sm font-semibold text-surface-700 dark:text-surface-300">DÖNEM BAŞI DEVREDEN BAKİYE:</span>
                        <span class="font-bold text-sm" :class="statementData.initialBalanceType === 'Borç' ? 'text-green-600' : 'text-red-600'">
                            {{ formatCurrency(statementData.initialBalance) }} ({{ statementData.initialBalanceType }})
                        </span>
                    </div>
                </template>

                <Column field="date" header="Tarih" sortable style="width: 10%">
                    <template #body="{ data }">
                        <span>{{ data.date.toLocaleDateString('tr-TR') }}</span>
                    </template>
                </Column>
                <Column field="invoiceNumber" header="Evrak / Fatura No" sortable style="width: 12%">
                    <template #body="{ data }">
                        <span class="font-semibold text-surface-800 dark:text-surface-100">{{ data.invoiceNumber }}</span>
                    </template>
                </Column>
                <Column field="invoiceType" header="İşlem Türü" sortable style="width: 15%">
                    <template #body="{ data }">
                        <Tag :value="getInvoiceTypeLabel(data.invoiceType)" :severity="getInvoiceTypeSeverity(data.invoiceType)" />
                    </template>
                </Column>
                <Column field="notes" header="Açıklama" style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="text-surface-500 text-xs">{{ data.notes }}</span>
                    </template>
                </Column>
                <Column field="debit" header="Borç (Debit)" sortable style="width: 12%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block text-blue-600 dark:text-blue-400 font-medium" v-if="data.debit > 0">
                            {{ formatCurrency(data.debit) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="credit" header="Alacak (Credit)" sortable style="width: 12%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block text-amber-600 dark:text-amber-400 font-medium" v-if="data.credit > 0">
                            {{ formatCurrency(data.credit) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="cumulativeBalance" header="Bakiye" style="width: 14%; text-align: right">
                    <template #body="{ data }">
                        <span class="font-bold text-right block" :class="data.cumulativeBalanceType === 'Borç' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                            {{ formatCurrency(data.cumulativeBalance) }}
                        </span>
                    </template>
                </Column>
                <Column field="cumulativeBalanceType" header="Yön" style="width: 8%; text-align: center">
                    <template #body="{ data }">
                        <Tag
                            :value="data.cumulativeBalanceType"
                            :severity="data.cumulativeBalanceType === 'Borç' ? 'success' : 'danger'"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>

        <div v-else class="card p-8 text-center text-surface-400 flex flex-col items-center justify-center">
            <i class="pi pi-address-book text-6xl text-primary/30 mb-3"></i>
            <div class="text-lg font-semibold text-surface-700 dark:text-surface-200">Ekstre Hazırlamak İçin Cari Hesap Seçin</div>
            <div class="text-sm mt-1 max-w-md">Lütfen yukarıdaki filtre panelinden işlem ekstrelerini görmek istediğiniz cari hesabı seçiniz.</div>
        </div>
    </div>
</template>

<style scoped></style>
