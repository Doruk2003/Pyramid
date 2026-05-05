<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useSalesStore } from '@/modules/sales/application/sales.store';
import { Quote, type QuoteStatus } from '@/modules/sales/domain/quote.entity';
import DocumentItemsTable from '@/shared/components/DocumentItemsTable.vue';
import DocumentSummary from '@/shared/components/DocumentSummary.vue';
import { DocumentCalculator } from '@/shared/utils/document-calculator';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const salesStore = useSalesStore();
const financeStore = useFinanceStore();
const projectStore = useProjectStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const lookupStore = useLookupStore();
const exchangeRateStore = useExchangeRateStore();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const quoteId = route.params.id as string;
const isEdit = !!quoteId;

const quote = ref<any>({
    quoteNumber: '',
    accountId: '',
    warehouseId: '',
    projectId: null,
    issueDate: new Date(),
    validUntil: null,
    status: 'draft',
    type: 'sale',
    currency: 'TRY',
    exchangeRate: 1,
    discountRate: 0,
    notes: '',
    lines: []
});

const statusOptions: Array<{ label: string; value: QuoteStatus }> = [
    { label: 'Taslak', value: 'draft' },
    { label: 'Gönderildi', value: 'sent' },
    { label: 'Onaylandı', value: 'accepted' },
    { label: 'Reddedildi', value: 'rejected' },
    { label: 'İptal', value: 'cancelled' },
    { label: 'Siparişe Dönüştü', value: 'converted' },
    { label: 'Kısmi Sipariş', value: 'partially_converted' }
];

onMounted(async () => {
    await Promise.all([
        financeStore.fetchAccounts(),
        productStore.fetchProducts(),
        inventoryStore.fetchWarehouses(),
        lookupStore.fetchAll(),
        exchangeRateStore.fetchCurrentRates(),
        projectStore.fetchProjects(),
        settingsStore.fetchSettings(),
        inventoryStore.fetchBalances()
    ]);

    if (isEdit) {
        await salesStore.fetchQuotes();
        const found = salesStore.quotes.find((q) => q.id === quoteId);
        if (found) {
            const obj = found.toObject();
            quote.value = { 
                ...obj, 
                warehouseId: obj.lines[0]?.warehouseId || '',
                notes: obj.notes || '',
                projectId: obj.projectId || null,
                discountRate: (obj as any).discountRate || 0,
                issueDate: new Date(obj.issueDate), 
                validUntil: obj.validUntil ? new Date(obj.validUntil) : null 
            };
        }
    } else {
        quote.value.quoteNumber = await salesStore.getNextQuoteNumber();
        if (quote.value.lines.length === 0) {
            // Initial line will be added by the component if we don't have any
        }
    }
});

watch(() => quote.value.currency, (newCode) => {
    if (!newCode || newCode === 'TRY') {
        quote.value.exchangeRate = 1;
    } else {
        const rate = exchangeRateStore.getRateByCode(newCode || '');
        if (rate > 0) quote.value.exchangeRate = rate;
    }
});

const totals = computed(() => {
    return DocumentCalculator.calculateTotals(quote.value.lines, quote.value.discountRate, quote.value.currency);
});

async function saveQuote() {
    if (!quote.value.accountId || !quote.value.quoteNumber || quote.value.lines.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları doldurun', life: 3000 });
        return;
    }

    const t = totals.value;
    const q = Quote.create({
        ...quote.value,
        validUntil: quote.value.validUntil || undefined,
        id: quoteId || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        subtotal: t.subtotal,
        vatTotal: t.vatTotal,
        total: t.total,
        type: quote.value.type,
        projectId: quote.value.projectId || undefined,
        createdAt: quote.value.createdAt || new Date(),
        updatedAt: new Date(),
        lines: quote.value.lines.map((l: any) => ({
            ...l,
            quoteId: quoteId || ''
        }))
    });

    const result = await salesStore.saveQuote(q);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Teklif kaydedildi', life: 3000 });
        router.push('/sales/quotes');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/sales/quotes');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <!-- Header -->
        <div class="card p-6 min-h-32 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Teklifi Düzenle' : 'Yeni Teklif' }}</div>
                
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-hashtag text-primary text-sm"></i>
                            <span class="text-xl font-mono font-bold text-primary leading-none">{{ quote.quoteNumber || '---' }}</span>
                        </div>

                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-file text-surface-500 text-sm"></i>
                            <span class="text-base font-bold text-surface-700 dark:text-surface-300">
                                {{ quote.type === 'sale' ? 'Satış Teklifi' : 'Alış Teklifi' }}
                            </span>
                        </div>

                        <div v-if="quote.currency !== 'TRY'" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-money-bill text-surface-500 text-sm"></i>
                            <div class="text-base font-medium leading-none">
                                1 {{ quote.currency }} = <span class="font-bold text-primary">{{ quote.exchangeRate.toFixed(4) }}</span> ₺
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <Button icon="pi pi-file-pdf" label="PDF" severity="secondary" outlined size="small" />
                        <Button icon="pi pi-print" label="YAZDIR" severity="secondary" outlined size="small" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Form Content -->
        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <!-- Top Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label class="block font-bold mb-3">Tarih</label>
                        <DatePicker v-model="quote.issueDate" dateFormat="dd.mm.yy" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Geçerlilik Tarihi</label>
                        <DatePicker v-model="quote.validUntil" dateFormat="dd.mm.yy" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Depo (Varsayılan)</label>
                        <Select v-model="quote.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                    </div>
                    <div class="lg:col-span-2">
                        <label class="block font-bold mb-3">Cari Hesap</label>
                        <Select v-model="quote.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Hesap Seçin" filter fluid />
                    </div>

                    <div>
                        <label class="block font-bold mb-3">Proje</label>
                        <Select v-model="quote.projectId" :options="projectStore.projects" optionLabel="name" optionValue="id" placeholder="Proje Seçin" filter showClear fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Döviz</label>
                        <Select v-model="quote.currency" :options="lookupStore.currencies" optionLabel="code" optionValue="code" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Kur</label>
                        <InputNumber v-model="quote.exchangeRate" :minFractionDigits="4" :disabled="quote.currency === 'TRY'" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Durum</label>
                        <Select v-model="quote.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Genel İndirim %</label>
                        <InputNumber v-model="quote.discountRate" :min="0" :max="100" fluid />
                    </div>
                </div>

                <!-- Lines Table -->
                <DocumentItemsTable 
                    :lines="quote.lines" 
                    :currency="quote.currency" 
                    :exchangeRate="quote.exchangeRate" 
                    :accountId="quote.accountId"
                    :warehouseId="quote.warehouseId"
                    documentType="quote"
                    @change="() => {}"
                >
                    <template #extra-columns>
                        <Column v-if="isEdit" header="Siparişleşme" style="width: 10%">
                            <template #body="slotProps">
                                <div class="flex flex-col gap-1">
                                    <ProgressBar 
                                        :value="Math.min(100, Math.round((slotProps.data.orderedQuantity / slotProps.data.quantity) * 100))" 
                                        :showValue="false" 
                                        style="height: 6px"
                                        :severity="slotProps.data.orderedQuantity >= slotProps.data.quantity ? 'success' : (slotProps.data.orderedQuantity > 0 ? 'warn' : 'secondary')"
                                    />
                                    <span class="text-[10px] text-surface-500 font-medium text-center">
                                        {{ slotProps.data.orderedQuantity || 0 }} / {{ slotProps.data.quantity }}
                                    </span>
                                </div>
                            </template>
                        </Column>
                    </template>
                </DocumentItemsTable>

                <!-- Summary -->
                <DocumentSummary 
                    :totals="totals" 
                    :currency="quote.currency" 
                    v-model:notes="quote.notes" 
                />
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" outlined @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Teklifi Kaydet" icon="pi pi-check" class="w-full" @click="saveQuote" />
                </div>
            </div>
        </div>
    </div>
</template>
