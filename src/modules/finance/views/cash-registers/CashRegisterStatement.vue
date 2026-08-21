<script setup lang="ts">
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const financeStore = useFinanceStore();

const registerId = route.params.id as string;
const cashRegister = ref<any>(null);
const loading = ref(false);

onMounted(async () => {
    loading.value = true;
    try {
        // cash_registers listesinden bul
        if (financeStore.cashRegisters.length === 0) {
            await financeStore.fetchCashRegisters();
        }
        cashRegister.value = financeStore.cashRegisters.find(c => c.id === registerId);
        
        // İşlemleri çek
        await financeStore.fetchPayments({ cashRegisterId: registerId });
    } finally {
        loading.value = false;
    }
});

const sortedPayments = computed(() => {
    return [...financeStore.payments]
        .filter(p => p.cashRegisterId === registerId && p.status === 'completed')
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
});

const statementLines = computed(() => {
    let runningBalance = 0;
    const lines = sortedPayments.value.map(p => {
        const amount = p.amount;
        const type = p.paymentType;
        if (type === 'collection') {
            runningBalance += amount;
        } else if (type === 'payment') {
            runningBalance -= amount;
        }
        return {
            id: p.id,
            paymentDate: p.paymentDate,
            paymentType: p.paymentType,
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            documentNumber: p.documentNumber,
            description: p.description,
            accountName: p.accountName,
            income: type === 'collection' ? amount : 0,
            outcome: type === 'payment' ? amount : 0,
            balance: runningBalance
        };
    });
    return lines.reverse(); // En son işlem en üstte
});

const totalIncome = computed(() => {
    return sortedPayments.value
        .filter(p => p.paymentType === 'collection')
        .reduce((sum, p) => sum + p.amount, 0);
});

const totalOutcome = computed(() => {
    return sortedPayments.value
        .filter(p => p.paymentType === 'payment')
        .reduce((sum, p) => sum + p.amount, 0);
});

const currentBalance = computed(() => {
    return totalIncome.value - totalOutcome.value;
});

function goBack() {
    router.push('/finance/cash-registers');
}

function formatCurrency(val: number, curr?: string): string {
    const currencyCode = curr || cashRegister.value?.currency || 'TRY';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currencyCode }).format(val);
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('tr-TR');
}

function getMethodLabel(method: string): string {
    const map: Record<string, string> = {
        cash: 'Nakit',
        bank: 'Banka Transferi',
        check: 'Çek/Senet',
        credit_card: 'Kredi Kartı'
    };
    return map[method] || method;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Compact Header -->
        <div class="flex items-center justify-between bg-surface-0 dark:bg-surface-900 px-4 py-3 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
            <div class="flex items-center gap-3">
                <Button icon="pi pi-arrow-left" text rounded @click="goBack" class="!w-8 !h-8" />
                <div>
                    <h4 class="text-base font-bold m-0 leading-tight">{{ cashRegister?.name || 'Hesap Ekstresi' }}</h4>
                    <span class="text-xs text-surface-500">Kasa / Banka İşlem Ekstresi</span>
                </div>
            </div>
            <Button label="Geri Dön" icon="pi pi-times" severity="secondary" text rounded @click="goBack" class="!w-8 !h-8" />
        </div>

        <!-- Özet Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="card p-4 border-l-4 border-green-500">
                <div class="text-sm text-surface-500 font-semibold mb-2">Toplam Giriş (Tahsilat)</div>
                <div class="text-2xl font-bold text-green-600">{{ formatCurrency(totalIncome) }}</div>
            </div>
            <div class="card p-4 border-l-4 border-red-500">
                <div class="text-sm text-surface-500 font-semibold mb-2">Toplam Çıkış (Ödeme)</div>
                <div class="text-2xl font-bold text-red-600">{{ formatCurrency(totalOutcome) }}</div>
            </div>
            <div class="card p-4 border-l-4 border-blue-500">
                <div class="text-sm text-surface-500 font-semibold mb-2">Güncel Bakiye</div>
                <div class="text-2xl font-bold" :class="currentBalance >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(currentBalance) }}
                </div>
            </div>
        </div>

        <!-- Hareket Detayı Tablosu -->
        <div class="card dt-compact">
            <DataTable :value="statementLines" dataKey="id" :paginator="true" :rows="15" :loading="loading">
                <template #empty>
                    <div class="text-center py-6 text-surface-500">
                        <i class="pi pi-history text-4xl mb-3 text-surface-400 block" />
                        Bu hesapta henüz hiçbir işlem hareketi bulunmamaktadır.
                    </div>
                </template>
                <Column header="Tarih" sortable>
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.paymentDate) }}
                    </template>
                </Column>
                <Column field="documentNumber" header="Belge/Fiş No" sortable></Column>
                <Column field="accountName" header="İlgili Cari" sortable>
                    <template #body="slotProps">
                        {{ slotProps.data.accountName || '—' }}
                    </template>
                </Column>
                <Column field="paymentMethod" header="Ödeme Yöntemi">
                    <template #body="slotProps">
                        {{ getMethodLabel(slotProps.data.paymentMethod) }}
                    </template>
                </Column>
                <Column header="Giriş (Tahsilat)" class="text-right">
                    <template #body="slotProps">
                        <span v-if="slotProps.data.income > 0" class="text-green-600 font-medium">
                            +{{ formatCurrency(slotProps.data.income) }}
                        </span>
                        <span v-else class="text-surface-400">—</span>
                    </template>
                </Column>
                <Column header="Çıkış (Ödeme)" class="text-right">
                    <template #body="slotProps">
                        <span v-if="slotProps.data.outcome > 0" class="text-red-600 font-medium">
                            -{{ formatCurrency(slotProps.data.outcome) }}
                        </span>
                        <span v-else class="text-surface-400">—</span>
                    </template>
                </Column>
                <Column header="Bakiye" class="text-right">
                    <template #body="slotProps">
                        <span class="font-bold" :class="slotProps.data.balance >= 0 ? 'text-green-600' : 'text-red-600'">
                            {{ formatCurrency(slotProps.data.balance) }}
                        </span>
                    </template>
                </Column>
                <Column field="description" header="Açıklama"></Column>
            </DataTable>
        </div>
    </div>
</template>
