<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useToast } from 'primevue/usetoast';
import { exportReportToPDF } from '@/shared/utils/pdf-generator';

const financeStore = useFinanceStore();
const toast = useToast();

// Filtreler
const searchQuery = ref('');
const selectedType = ref<string>('all');
const selectedBalanceStatus = ref<string>('all');

const typeOptions = [
    { label: 'Tümü', value: 'all' },
    { label: 'Müşteri', value: 'customer' },
    { label: 'Tedarikçi', value: 'supplier' },
    { label: 'Hem Müşteri Hem Tedarikçi', value: 'both' }
];

const balanceStatusOptions = [
    { label: 'Tümü', value: 'all' },
    { label: 'Sadece Bakiyeli', value: 'has_balance' },
    { label: 'Borç Bakiyesi Verenler', value: 'debit_balance' },
    { label: 'Alacak Bakiyesi Verenler', value: 'credit_balance' }
];

onMounted(async () => {
    // Cari hesapları, tüm faturaları ve ödeme/tahsilat kayıtlarını yükle
    await Promise.all([
        financeStore.fetchAccounts(),
        financeStore.fetchInvoices(),
        financeStore.fetchPayments()
    ]);
});

// Her Cari için Borç, Alacak ve Bakiye hesapla
const calculatedBalances = computed(() => {
    const accounts = financeStore.accounts || [];
    const invoices = financeStore.invoices || [];
    const payments = financeStore.payments || [];

    return accounts.map((account) => {
        // Bu cariye ait onaylı ve ödenmiş faturaları filtrele
        const accountInvoices = invoices.filter(
            (inv) => inv.accountId === account.id && inv.status !== 'draft' && inv.status !== 'cancelled'
        );

        // Bu cariye ait kasa fişleri (tahsilat/tediye/dekontlar)
        const accountPayments = payments.filter(
            (p) => p.accountId === account.id && p.status === 'completed'
        );

        let totalDebit = 0;   // Borç
        let totalCredit = 0;  // Alacak

        // Faturalardan gelen bakiyeler
        accountInvoices.forEach((inv) => {
            const invoiceTotal = inv.total || 0;
            if (inv.invoiceType === 'sale' || inv.invoiceType === 'return_purchase') {
                totalDebit += invoiceTotal;
            } else if (inv.invoiceType === 'purchase' || inv.invoiceType === 'return_sale') {
                totalCredit += invoiceTotal;
            }
        });

        // Fiş ve dekontlardan gelen bakiyeler
        accountPayments.forEach((p) => {
            const payAmount = p.amount || 0;
            if (p.paymentType === 'payment' || p.paymentType === 'debit_note') {
                totalDebit += payAmount;
            } else if (p.paymentType === 'collection' || p.paymentType === 'credit_note') {
                totalCredit += payAmount;
            }
        });

        const balance = totalDebit - totalCredit;
        let balanceType = 'Bakiye Yok';
        if (balance > 0) {
            balanceType = 'Borç';
        } else if (balance < 0) {
            balanceType = 'Alacak';
        }

        return {
            id: account.id,
            code: account.code || '-',
            name: account.name,
            accountType: account.accountType,
            phone: account.phone || '-',
            authorizedPerson: account.authorizedPerson || '-',
            debit: totalDebit,
            credit: totalCredit,
            balance: Math.abs(balance),
            rawBalance: balance, // yön bilgisiyle birlikte (Borç + / Alacak -)
            balanceType
        };
    });
});

// Filtrelenmiş Liste
const filteredRows = computed(() => {
    return calculatedBalances.value.filter((row) => {
        // Arama filtresi
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            if (!row.name.toLowerCase().includes(q) && !row.code.toLowerCase().includes(q)) {
                return false;
            }
        }

        // Cari Tipi filtresi
        if (selectedType.value !== 'all' && row.accountType !== selectedType.value) {
            return false;
        }

        // Bakiye Durumu filtresi
        if (selectedBalanceStatus.value === 'has_balance' && Math.round(row.rawBalance * 100) === 0) {
            return false;
        } else if (selectedBalanceStatus.value === 'debit_balance' && row.rawBalance <= 0.01) {
            return false;
        } else if (selectedBalanceStatus.value === 'credit_balance' && row.rawBalance >= -0.01) {
            return false;
        }

        return true;
    });
});

// Özet İstatistikler (Filtresiz)
const summaryStats = computed(() => {
    const rows = calculatedBalances.value;
    let totalDebit = 0;
    let totalCredit = 0;

    rows.forEach((r) => {
        totalDebit += r.debit;
        totalCredit += r.credit;
    });

    const netBalance = totalDebit - totalCredit;

    return {
        totalAccounts: rows.length,
        totalDebit,
        totalCredit,
        netBalance: Math.abs(netBalance),
        netBalanceType: netBalance >= 0 ? 'Borç' : 'Alacak'
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

function getAccountTypeSeverity(type: string) {
    switch (type) {
        case 'customer': return 'info';
        case 'supplier': return 'warn';
        case 'both': return 'success';
        default: return 'secondary';
    }
}

function clearFilters() {
    searchQuery.value = '';
    selectedType.value = 'all';
    selectedBalanceStatus.value = 'all';
}

function exportCSV() {
    const headers = [
        'Cari Kodu', 'Cari Adı', 'Cari Tipi', 'Yetkili Kişi',
        'Toplam Borç', 'Toplam Alacak', 'Bakiye', 'Bakiye Tipi'
    ];
    const rows = filteredRows.value.map((r) => [
        r.code, r.name, getAccountTypeLabel(r.accountType), r.authorizedPerson,
        r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2), r.balanceType
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cari-bakiye-raporu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

async function exportPDF() {
    try {
        toast.add({ severity: 'info', summary: 'Hazırlanıyor', detail: 'PDF raporu oluşturuluyor...', life: 2000 });

        const filtersList: { label: string, value: string }[] = [];
        if (searchQuery.value) {
            filtersList.push({ label: 'Arama', value: searchQuery.value });
        }
        if (selectedType.value !== 'all') {
            const label = typeOptions.find(o => o.value === selectedType.value)?.label || selectedType.value;
            filtersList.push({ label: 'Cari Tipi', value: label });
        }
        if (selectedBalanceStatus.value !== 'all') {
            const label = balanceStatusOptions.find(o => o.value === selectedBalanceStatus.value)?.label || selectedBalanceStatus.value;
            filtersList.push({ label: 'Bakiye Durumu', value: label });
        }

        const summaryCards = [
            { label: 'Toplam Borç', value: formatCurrency(summaryStats.value.totalDebit), color: 'info' as const },
            { label: 'Toplam Alacak', value: formatCurrency(summaryStats.value.totalCredit), color: 'warning' as const },
            { 
                label: `Net Bakiye (${summaryStats.value.netBalanceType})`, 
                value: formatCurrency(summaryStats.value.netBalance), 
                color: (summaryStats.value.netBalanceType === 'Borç' ? 'success' : 'danger') as 'success' | 'danger'
            },
            { label: 'Toplam Cari', value: summaryStats.value.totalAccounts, color: 'neutral' as const }
        ];

        const headers = ['Cari Kodu', 'Cari Adı', 'Tip', 'Yetkili Kişi', 'Toplam Borç', 'Toplam Alacak', 'Bakiye', 'Bakiye Yönü'];
        
        const rows = filteredRows.value.map(r => [
            r.code,
            r.name,
            getAccountTypeLabel(r.accountType),
            r.authorizedPerson,
            formatCurrency(r.debit),
            formatCurrency(r.credit),
            formatCurrency(r.balance),
            {
                isBadge: true,
                text: r.balanceType,
                severity: r.balanceType === 'Borç' ? 'success' : r.balanceType === 'Alacak' ? 'danger' : 'neutral'
            }
        ]);

        await exportReportToPDF({
            title: 'Cari Hesap Bakiye Raporu',
            headers,
            rows,
            alignments: ['left', 'left', 'center', 'left', 'right', 'right', 'right', 'center'],
            fileName: `cari-bakiye-raporu-${new Date().toISOString().slice(0, 10)}.pdf`,
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
                    <i class="pi pi-wallet text-primary"></i>
                    Cari Hesap Bakiye Raporu
                </div>
                <div class="text-surface-500 text-sm mt-1">Cari hesapların borç, alacak ve bakiye durumlarının genel dökümü</div>
            </div>
            <div class="flex gap-2">
                <Button label="CSV İndir" icon="pi pi-download" severity="secondary" outlined @click="exportCSV" />
                <Button label="PDF İndir" icon="pi pi-file-pdf" severity="danger" outlined @click="exportPDF" />
            </div>
        </div>

        <!-- Özet Kartlar -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="card p-4 flex items-center gap-3 border-l-4 border-blue-500">
                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <i class="pi pi-arrow-up-right text-blue-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ formatCurrency(summaryStats.totalDebit) }}</div>
                    <div class="text-xs text-surface-500">Toplam Borç (Alacaklarımız)</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-amber-500">
                <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <i class="pi pi-arrow-down-left text-amber-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-amber-600 dark:text-amber-400">{{ formatCurrency(summaryStats.totalCredit) }}</div>
                    <div class="text-xs text-surface-500">Toplam Alacak (Borçlarımız)</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4" :class="summaryStats.netBalanceType === 'Borç' ? 'border-green-500' : 'border-red-500'">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="summaryStats.netBalanceType === 'Borç' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
                    <i class="pi pi-calculator" :class="summaryStats.netBalanceType === 'Borç' ? 'text-green-500' : 'text-red-500'"></i>
                </div>
                <div>
                    <div class="text-xl font-bold" :class="summaryStats.netBalanceType === 'Borç' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        {{ formatCurrency(summaryStats.netBalance) }}
                    </div>
                    <div class="text-xs text-surface-500">Net Bakiye ({{ summaryStats.netBalanceType }})</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-surface-400">
                <div class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <i class="pi pi-users text-surface-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold">{{ summaryStats.totalAccounts }}</div>
                    <div class="text-xs text-surface-500">Toplam Cari Hesap</div>
                </div>
            </div>
        </div>

        <!-- Filtreler -->
        <div class="card p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label class="block text-sm font-semibold mb-2">Cari Hesap Ara</label>
                    <div class="p-input-icon-left w-full">
                        <i class="pi pi-search"></i>
                        <InputText v-model="searchQuery" placeholder="Cari ünvanı veya kodu..." fluid />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Cari Tipi</label>
                    <Select
                        v-model="selectedType"
                        :options="typeOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Bakiye Durumu</label>
                    <Select
                        v-model="selectedBalanceStatus"
                        :options="balanceStatusOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
            </div>
            <div class="flex justify-end mt-3">
                <Button label="Filtreleri Temizle" icon="pi pi-filter-slash" text size="small" @click="clearFilters" />
            </div>
        </div>

        <!-- Tablo -->
        <div class="card p-0">
            <DataTable
                :value="filteredRows"
                :loading="financeStore.loading"
                paginator
                :rows="25"
                :rowsPerPageOptions="[25, 50, 100]"
                size="small"
                stripedRows
                scrollable
                scrollHeight="60vh"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-inbox text-5xl mb-3 text-surface-300"></i>
                        <span>Cari hesap veya bakiye kaydı bulunamadı.</span>
                    </div>
                </template>
                <Column field="code" header="Kod" sortable style="width: 10%">
                    <template #body="{ data }">
                        <span class="font-mono text-xs font-semibold text-surface-500">{{ data.code }}</span>
                    </template>
                </Column>
                <Column field="name" header="Cari Adı / Ünvanı" sortable style="min-width: 200px">
                    <template #body="{ data }">
                        <span class="font-medium text-surface-900 dark:text-surface-0">{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="accountType" header="Tip" sortable style="width: 12%">
                    <template #body="{ data }">
                        <Tag :value="getAccountTypeLabel(data.accountType)" :severity="getAccountTypeSeverity(data.accountType)" />
                    </template>
                </Column>
                <Column field="authorizedPerson" header="Yetkili" sortable style="width: 15%" />
                <Column field="debit" header="Borç (Debit)" sortable style="width: 13%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block" :class="data.debit > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-surface-400'">
                            {{ formatCurrency(data.debit) }}
                        </span>
                    </template>
                </Column>
                <Column field="credit" header="Alacak (Credit)" sortable style="width: 13%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-right block" :class="data.credit > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-surface-400'">
                            {{ formatCurrency(data.credit) }}
                        </span>
                    </template>
                </Column>
                <Column field="balance" header="Bakiye" sortable style="width: 13%; text-align: right">
                    <template #body="{ data }">
                        <span class="font-bold text-right block" :class="data.balanceType === 'Borç' ? 'text-green-600 dark:text-green-400' : data.balanceType === 'Alacak' ? 'text-red-600 dark:text-red-400' : 'text-surface-400'">
                            {{ formatCurrency(data.balance) }}
                        </span>
                    </template>
                </Column>
                <Column field="balanceType" header="Bakiye Yönü" sortable style="width: 10%; text-align: center">
                    <template #body="{ data }">
                        <Tag
                            :value="data.balanceType"
                            :severity="data.balanceType === 'Borç' ? 'success' : data.balanceType === 'Alacak' ? 'danger' : 'secondary'"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<style scoped></style>
