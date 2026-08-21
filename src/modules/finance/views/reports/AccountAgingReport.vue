<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useToast } from 'primevue/usetoast';
import { exportReportToPDF } from '@/shared/utils/pdf-generator';

const financeStore = useFinanceStore();
const toast = useToast();

const searchQuery = ref('');
const agingType = ref<'receivables' | 'payables'>('receivables');

const agingTypeOptions = [
    { label: 'Müşteri Alacak Yaşlandırma (Bize Olan Borçlar)', value: 'receivables' },
    { label: 'Tedarikçi Borç Yaşlandırma (Bizim Borçlarımız)', value: 'payables' }
];

onMounted(async () => {
    await Promise.all([
        financeStore.fetchAccounts(),
        financeStore.fetchInvoices()
    ]);
});

// Yaşlandırma Hesaplamaları
const calculatedAging = computed(() => {
    const accounts = financeStore.accounts || [];
    const invoices = financeStore.invoices || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtre tipi belirleniyor
    const isReceivable = agingType.value === 'receivables';

    // Sadece ilgili cari hesapları seç (örneğin müşteri alacakları için customer ve both)
    const targetAccounts = accounts.filter((acc) => {
        if (isReceivable) {
            return acc.accountType === 'customer' || acc.accountType === 'both';
        } else {
            return acc.accountType === 'supplier' || acc.accountType === 'both';
        }
    });

    return targetAccounts.map((account) => {
        // Cari genel net bakiyesi (Tüm faturalardan)
        const allInvoices = invoices.filter(
            (inv) => inv.accountId === account.id && inv.status !== 'draft' && inv.status !== 'cancelled'
        );
        let totalDebit = 0;
        let totalCredit = 0;
        allInvoices.forEach((inv) => {
            const invoiceTotalTRY = (inv.total || 0) * (inv.exchangeRate || 1);
            if (inv.invoiceType === 'sale' || inv.invoiceType === 'return_purchase') {
                totalDebit += invoiceTotalTRY;
            } else {
                totalCredit += invoiceTotalTRY;
            }
        });
        const netBalance = totalDebit - totalCredit;

        // Yaşlandırma için onaylı (issued) faturaları filtrele
        const openInvoices = invoices.filter((inv) => {
            const isCorrectType = isReceivable
                ? (inv.invoiceType === 'sale' || inv.invoiceType === 'return_purchase')
                : (inv.invoiceType === 'purchase' || inv.invoiceType === 'return_sale');
            
            return inv.accountId === account.id && inv.status === 'issued' && isCorrectType;
        });

        let totalOverdue = 0;
        let totalNotOverdue = 0;
        let days1to30 = 0;
        let days31to60 = 0;
        let days61to90 = 0;
        let days90Plus = 0;
        let maxOverdueDays = 0;

        openInvoices.forEach((inv) => {
            const invoiceTotalTRY = (inv.total || 0) * (inv.exchangeRate || 1);
            const invoicePaidAmountTRY = (inv.paidAmount || 0) * (inv.exchangeRate || 1);
            const outstanding = invoiceTotalTRY - invoicePaidAmountTRY;
            if (outstanding <= 0.01) return;

            const dueDateStr = inv.dueDate || inv.issueDate;
            const dueDate = new Date(dueDateStr);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate.getTime() < today.getTime()) {
                // Vadesi Geçmiş
                const diffTime = today.getTime() - dueDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 0) {
                    totalOverdue += outstanding;
                    maxOverdueDays = Math.max(maxOverdueDays, diffDays);

                    if (diffDays <= 30) {
                        days1to30 += outstanding;
                    } else if (diffDays <= 60) {
                        days31to60 += outstanding;
                    } else if (diffDays <= 90) {
                        days61to90 += outstanding;
                    } else {
                        days90Plus += outstanding;
                    }
                } else {
                    totalNotOverdue += outstanding;
                }
            } else {
                // Vadesi Gelmemiş
                totalNotOverdue += outstanding;
            }
        });

        return {
            id: account.id,
            code: account.code || '-',
            name: account.name,
            accountType: account.accountType,
            creditLimit: account.creditLimit || 0,
            netBalance,
            totalOutstanding: totalOverdue + totalNotOverdue,
            totalOverdue,
            totalNotOverdue,
            days1to30,
            days31to60,
            days61to90,
            days90Plus,
            maxOverdueDays
        };
    });
});

// Filtrelenmiş Yaşlandırma Verisi
const filteredRows = computed(() => {
    return calculatedAging.value.filter((row) => {
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            if (!row.name.toLowerCase().includes(q) && !row.code.toLowerCase().includes(q)) {
                return false;
            }
        }
        // Sadece açık bakiyesi veya yaşlandırılmış faturası olanları göster (Raporu sadeleştirmek için)
        return row.totalOutstanding > 0.01 || Math.abs(row.netBalance) > 0.01;
    });
});

// Yaşlandırma Toplam İstatistikleri
const summaryStats = computed(() => {
    const rows = filteredRows.value;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalNotOverdue = 0;
    let days1to30 = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let days90Plus = 0;
    let maxOverdue = 0;

    rows.forEach((r) => {
        totalOutstanding += r.totalOutstanding;
        totalOverdue += r.totalOverdue;
        totalNotOverdue += r.totalNotOverdue;
        days1to30 += r.days1to30;
        days31to60 += r.days31to60;
        days61to90 += r.days61to90;
        days90Plus += r.days90Plus;
        maxOverdue = Math.max(maxOverdue, r.maxOverdueDays);
    });

    return {
        totalAccounts: rows.length,
        totalOutstanding,
        totalOverdue,
        totalNotOverdue,
        days1to30,
        days31to60,
        days61to90,
        days90Plus,
        maxOverdue
    };
});

function formatCurrency(value: number) {
    return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

function getAccountTypeLabel(type: string) {
    switch (type) {
        case 'customer': return 'Müşteri';
        case 'supplier': return 'Tedarikçi';
        case 'both': return 'Müşteri + Tedarikçi';
        default: return type;
    }
}



function exportCSV() {

    const headers = [
        'Cari Kodu', 'Cari Adı', 'Cari Tipi', 'Kredi Limiti', 'Net Bakiye',
        'Toplam Açık Fatura', 'Vadesi Geçen', 'Vadesi Gelmemiş',
        '1-30 Gün', '31-60 Gün', '61-90 Gün', '90+ Gün', 'Maks Gecikme (Gün)'
    ];

    const rows = filteredRows.value.map((r) => [
        r.code, r.name, getAccountTypeLabel(r.accountType), r.creditLimit.toFixed(2), r.netBalance.toFixed(2),
        r.totalOutstanding.toFixed(2), r.totalOverdue.toFixed(2), r.totalNotOverdue.toFixed(2),
        r.days1to30.toFixed(2), r.days31to60.toFixed(2), r.days61to90.toFixed(2), r.days90Plus.toFixed(2),
        r.maxOverdueDays
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cari-yaslandirma-raporu-${agingType.value}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

async function exportPDF() {
    try {
        const isReceivable = agingType.value === 'receivables';
        const typeTitle = isReceivable ? 'Cari Alacak Yaşlandırma Raporu' : 'Cari Borç Yaşlandırma Raporu';

        toast.add({ severity: 'info', summary: 'Hazırlanıyor', detail: 'PDF raporu oluşturuluyor...', life: 2000 });

        const filtersList: { label: string, value: string }[] = [
            { label: 'Rapor Türü', value: isReceivable ? 'Alacak Yaşlandırma (Müşteriler)' : 'Borç Yaşlandırma (Tedarikçiler)' }
        ];
        if (searchQuery.value) {
            filtersList.push({ label: 'Arama', value: searchQuery.value });
        }

        const summaryCards = [
            { label: 'Toplam Açık Tutar', value: formatCurrency(summaryStats.value.totalOutstanding), color: 'info' as const },
            { label: 'Vadesi Geçen (Risk)', value: formatCurrency(summaryStats.value.totalOverdue), color: 'danger' as const },
            { label: 'Vadesi Gelmemiş', value: formatCurrency(summaryStats.value.totalNotOverdue), color: 'success' as const },
            { label: 'Maks. Gecikme', value: `${summaryStats.value.maxOverdue} Gün`, color: 'warning' as const }
        ];

        const headers = ['Kod', 'Cari Adı', 'Net Bakiye', 'Toplam Açık', 'Vadesi Geçen', 'Vadesi Gelmemiş', '1-30 G', '31-60 G', '61-90 G', '90+ G'];
        
        const rows = filteredRows.value.map(r => [
            r.code,
            r.name,
            formatCurrency(r.netBalance),
            formatCurrency(r.totalOutstanding),
            formatCurrency(r.totalOverdue),
            formatCurrency(r.totalNotOverdue),
            formatCurrency(r.days1to30),
            formatCurrency(r.days31to60),
            formatCurrency(r.days61to90),
            formatCurrency(r.days90Plus)
        ]);

        await exportReportToPDF({
            title: typeTitle,
            headers,
            rows,
            alignments: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
            fileName: `cari-yaslandirma-${agingType.value}-${new Date().toISOString().slice(0, 10)}.pdf`,
            summaryCards,
            filters: filtersList
        });

        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'PDF başarıyla indirildi', life: 3000 });
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
                    <i class="pi pi-chart-line text-primary"></i>
                    Cari Borç/Alacak Yaşlandırma Raporu
                </div>
                <div class="text-surface-500 text-sm mt-1">Cari hesapların ödenmemiş faturalarının vade aşım süreleri ve gecikme dağılımları</div>
            </div>
            <div class="flex gap-2">
                <Button label="CSV İndir" icon="pi pi-download" severity="secondary" outlined @click="exportCSV" />
                <Button label="PDF İndir" icon="pi pi-file-pdf" severity="danger" outlined @click="exportPDF" />
            </div>
        </div>

        <!-- Seçici ve Filtreler -->
        <div class="card p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <div>
                    <label class="block text-sm font-semibold mb-2">Yaşlandırma Tipi</label>
                    <Select
                        v-model="agingType"
                        :options="agingTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Cari Hesap Ara</label>
                    <div class="p-input-icon-left w-full">
                        <i class="pi pi-search"></i>
                        <InputText v-model="searchQuery" placeholder="Cari adı veya kodu..." fluid />
                    </div>
                </div>
            </div>
        </div>

        <!-- Özet Kartlar -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="card p-4 flex items-center gap-3 border-l-4 border-blue-500">
                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <i class="pi pi-calculator text-blue-500"></i>
                </div>
                <div>
                    <div class="text-lg font-bold text-blue-600 dark:text-blue-400">{{ formatCurrency(summaryStats.totalOutstanding) }}</div>
                    <div class="text-xs text-surface-500">Toplam Açık Fatura</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-red-500">
                <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <i class="pi pi-exclamation-triangle text-red-500"></i>
                </div>
                <div>
                    <div class="text-lg font-bold text-red-600 dark:text-red-400">{{ formatCurrency(summaryStats.totalOverdue) }}</div>
                    <div class="text-xs text-surface-500">Toplam Vadesi Geçen (Gecikmiş)</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-green-500">
                <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <i class="pi pi-calendar text-green-500"></i>
                </div>
                <div>
                    <div class="text-lg font-bold text-green-600 dark:text-green-400">{{ formatCurrency(summaryStats.totalNotOverdue) }}</div>
                    <div class="text-xs text-surface-500">Vadesi Gelmemiş Tutar</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-amber-500">
                <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <i class="pi pi-clock text-amber-500"></i>
                </div>
                <div>
                    <div class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ summaryStats.maxOverdue }} Gün</div>
                    <div class="text-xs text-surface-500">Maksimum Gecikme Süresi</div>
                </div>
            </div>
        </div>

        <!-- Tablo -->
        <div class="card p-0 dt-compact">
            <DataTable
                :value="filteredRows"
                :loading="financeStore.loading"
                paginator
                :rows="25"
                :rowsPerPageOptions="[25, 50, 100]"
                size="small"
                stripedRows
                scrollable
                scrollHeight="55vh"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-check-circle text-5xl mb-3 text-green-300"></i>
                        <span>Açık ve vadesi geçen bakiye bulunamadı. Tüm işlemler kapalıdır.</span>
                    </div>
                </template>

                <Column field="code" header="Kod" sortable style="width: 8%">
                    <template #body="{ data }">
                        <span class="font-mono text-xs font-semibold text-surface-500">{{ data.code }}</span>
                    </template>
                </Column>
                <Column field="name" header="Cari Adı" sortable style="min-width: 150px">
                    <template #body="{ data }">
                        <span class="font-medium text-surface-900 dark:text-surface-0">{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="netBalance" header="Net Bakiye" sortable style="width: 10%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block font-medium" :class="data.netBalance > 0 ? 'text-green-600 dark:text-green-400' : data.netBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-surface-400'">
                            {{ formatCurrency(data.netBalance) }}
                        </span>
                    </template>
                </Column>
                <Column field="totalOutstanding" header="Toplam Açık" sortable style="width: 10%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block font-semibold text-surface-700 dark:text-surface-200">
                            {{ formatCurrency(data.totalOutstanding) }}
                        </span>
                    </template>
                </Column>
                <Column field="totalOverdue" header="Vadesi Geçen" sortable style="width: 10%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block font-bold text-red-600 dark:text-red-400" v-if="data.totalOverdue > 0">
                            {{ formatCurrency(data.totalOverdue) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="totalNotOverdue" header="Vadesi Gelmemiş" sortable style="width: 10%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block text-green-600 dark:text-green-400 font-medium" v-if="data.totalNotOverdue > 0">
                            {{ formatCurrency(data.totalNotOverdue) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="days1to30" header="1-30 Gün" sortable style="width: 9%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block text-surface-600 dark:text-surface-300" v-if="data.days1to30 > 0">
                            {{ formatCurrency(data.days1to30) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="days31to60" header="31-60 Gün" sortable style="width: 9%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block text-surface-800 dark:text-surface-200 font-medium" v-if="data.days31to60 > 0">
                            {{ formatCurrency(data.days31to60) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="days61to90" header="61-90 Gün" sortable style="width: 9%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block text-orange-600 dark:text-orange-400 font-semibold" v-if="data.days61to90 > 0">
                            {{ formatCurrency(data.days61to90) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="days90Plus" header="90+ Gün" sortable style="width: 9%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block text-red-700 dark:text-red-300 font-bold" v-if="data.days90Plus > 0">
                            {{ formatCurrency(data.days90Plus) }}
                        </span>
                        <span class="text-surface-300 text-right block v-else">—</span>
                    </template>
                </Column>
                <Column field="maxOverdueDays" header="Gecikme" sortable style="width: 8%; text-align: right">
                    <template #body="{ data }">
                        <span class="font-bold text-right block" :class="data.maxOverdueDays > 60 ? 'text-red-600' : data.maxOverdueDays > 0 ? 'text-amber-500' : 'text-surface-300'">
                            {{ data.maxOverdueDays > 0 ? `${data.maxOverdueDays} G` : '—' }}
                        </span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<style scoped></style>
