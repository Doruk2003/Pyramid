<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useSalesStore } from '@/modules/sales/application/sales.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { Quote, type QuoteStatus } from '@/modules/sales/domain/quote.entity';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const salesStore = useSalesStore();
const financeStore = useFinanceStore();
const productStore = useProductStore();
const lookupStore = useLookupStore();
const exchangeRateStore = useExchangeRateStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const quoteId = route.params.id as string;
const isEdit = !!quoteId;

interface QuoteLineForm {
    id: string;
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discountRate: number;
    lineTotal: number;
    sortOrder: number;
}

interface QuoteFormModel {
    quoteNumber: string;
    accountId: string;
    issueDate: Date;
    validUntil: Date | null;
    status: QuoteStatus;
    currency: string;
    exchangeRate: number;
    notes: string;
    lines: QuoteLineForm[];
    createdAt?: Date;
}

const quote = ref<QuoteFormModel>({
    quoteNumber: '',
    accountId: '',
    issueDate: new Date(),
    validUntil: null,
    status: 'draft',
    currency: 'TRY',
    exchangeRate: 1,
    notes: '',
    lines: []
});

const statusOptions: Array<{ label: string; value: QuoteStatus }> = [
    { label: 'Taslak', value: 'draft' },
    { label: 'Gönderildi', value: 'sent' },
    { label: 'Kabul Edildi', value: 'accepted' },
    { label: 'Reddedildi', value: 'rejected' },
    { label: 'Süresi Doldu', value: 'expired' }
];

const taxRates = [
    { label: '%0', value: 0 },
    { label: '%1', value: 1 },
    { label: '%8', value: 8 },
    { label: '%10', value: 10 },
    { label: '%20', value: 20 }
];

onMounted(async () => {
    await financeStore.fetchAccounts();
    if (productStore.products.length === 0) await productStore.fetchProducts();
    if (lookupStore.currencies.length === 0) await lookupStore.fetchAll();
    await exchangeRateStore.fetchCurrentRates();

    if (isEdit) {
        await salesStore.fetchQuotes();
        const found = salesStore.quotes.find((q) => q.id === quoteId);
        if (found) {
            const obj = found.toObject();
            quote.value = { 
                ...obj, 
                notes: obj.notes || '',
                issueDate: new Date(obj.issueDate), 
                validUntil: obj.validUntil ? new Date(obj.validUntil) : null 
            };
        }
    } else {
        // Veritabanındaki kayıt sayısına göre benzersiz teklif numarası üret
        quote.value.quoteNumber = await salesStore.getNextQuoteNumber();
    }
});

watch(
    () => quote.value.currency,
    (newCode) => {
        if (!newCode || newCode === 'TRY') {
            quote.value.exchangeRate = 1;
            return;
        }
        const rate = exchangeRateStore.getRateByCode(newCode);
        if (rate > 0) quote.value.exchangeRate = rate;
    }
);

function addLine() {
    quote.value.lines.push({
        id: crypto.randomUUID(),
        productId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: 20,
        discountRate: 0,
        lineTotal: 0,
        sortOrder: quote.value.lines.length
    });
}

function removeLine(index: number) {
    quote.value.lines.splice(index, 1);
}

function onProductChange(line: QuoteLineForm) {
    const product = productStore.products.find((p) => p.id === line.productId);
    if (product) {
        line.unitPrice = product.price || 0;
        line.vatRate = product.taxRate || 20;
        line.description = product.name;
    }
}

const totals = computed(() => {
    let subtotal = 0;
    let vatTotal = 0;

    quote.value.lines.forEach((line) => {
        const lineSubtotal = line.quantity * (line.unitPrice || 0) * (1 - (line.discountRate || 0) / 100);
        const lineVat = lineSubtotal * ((line.vatRate || 0) / 100);
        line.lineTotal = lineSubtotal + lineVat;

        subtotal += lineSubtotal;
        vatTotal += lineVat;
    });

    return {
        subtotal,
        vatTotal,
        total: subtotal + vatTotal
    };
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
        createdAt: quote.value.createdAt || new Date(),
        updatedAt: new Date(),
        lines: quote.value.lines.map((l) => ({
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
        <div class="card p-6 min-h-32 flex flex-col gap-0">
            <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Teklifi Düzenle' : 'Yeni Teklif' }}</div>
            <div class="text-surface-600 dark:text-surface-400">
                <p>Müşteri tekliflerini buradan oluşturabilir ve yönetebilirsiniz.</p>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label for="number" class="block font-bold mb-3">Teklif No</label>
                        <InputText id="number" v-model="quote.quoteNumber" fluid />
                    </div>
                    <div class="md:col-span-2 lg:col-span-2">
                        <label for="account" class="block font-bold mb-3">Müşteri (Cari)</label>
                        <Select id="account" v-model="quote.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Müşteri Seçin" filter fluid />
                    </div>
                    <div>
                        <label for="status" class="block font-bold mb-3">Durum</label>
                        <Select id="status" v-model="quote.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                    </div>
                    <div>
                        <label for="date" class="block font-bold mb-3">Teklif Tarihi</label>
                        <DatePicker id="date" v-model="quote.issueDate" fluid />
                    </div>
                    <div>
                        <label for="validUntil" class="block font-bold mb-3">Geçerlilik Tarihi</label>
                        <DatePicker id="validUntil" v-model="quote.validUntil" fluid />
                    </div>
                    <div>
                        <label for="currency" class="block font-bold mb-3">Döviz</label>
                        <Select id="currency" v-model="quote.currency" :options="lookupStore.currencies" optionLabel="code" optionValue="code" fluid />
                    </div>
                    <div>
                        <label for="rate" class="block font-bold mb-3">Kur (₺ Karşılığı)</label>
                        <InputNumber id="rate" v-model="quote.exchangeRate" :minFractionDigits="4" :disabled="quote.currency === 'TRY'" fluid />
                    </div>
                </div>

                <div>
                    <h5 class="font-bold mb-4">Teklif Kalemleri</h5>
                    <DataTable :value="quote.lines" class="p-datatable-sm">
                        <Column header="Ürün" style="width: 22%">
                            <template #body="slotProps">
                                <Select
                                    v-model="slotProps.data.productId"
                                    :options="productStore.products"
                                    optionLabel="name"
                                    optionValue="id"
                                    @change="onProductChange(slotProps.data)"
                                    fluid filter
                                    placeholder="Ürün Seçin"
                                />
                            </template>
                        </Column>
                        <Column header="Açıklama" style="width: 18%">
                            <template #body="slotProps">
                                <InputText v-model="slotProps.data.description" fluid />
                            </template>
                        </Column>
                        <Column header="Miktar" style="width: 8%">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.quantity" :min="1" fluid />
                            </template>
                        </Column>
                        <Column header="Birim Fiyat" style="width: 12%">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.unitPrice" :minFractionDigits="2" fluid />
                            </template>
                        </Column>
                        <Column header="KDV %" style="width: 9%">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.vatRate" :options="taxRates" optionLabel="label" optionValue="value" fluid />
                            </template>
                        </Column>
                        <Column header="İndirim %" style="width: 9%">
                            <template #body="slotProps">
                                <InputNumber
                                    v-model="slotProps.data.discountRate"
                                    :min="0"
                                    :max="100"
                                    :minFractionDigits="0"
                                    :maxFractionDigits="2"
                                    fluid
                                />
                            </template>
                        </Column>
                        <Column header="Satır Toplam" style="width: 12%">
                            <template #body="slotProps">
                                <span class="font-bold text-right block">
                                    {{ slotProps.data.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}
                                </span>
                            </template>
                        </Column>
                        <Column style="width: 5%">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" text rounded @click="removeLine(slotProps.index)" />
                            </template>
                        </Column>
                    </DataTable>
                    <Button label="Kalem Ekle" icon="pi pi-plus" text class="mt-4" @click="addLine" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="notes" class="block font-bold mb-3">Notlar</label>
                        <Textarea id="notes" v-model="quote.notes" rows="5" fluid />
                    </div>
                    <div>
                        <div class="flex flex-col gap-4 p-4 bg-surface-50 dark:bg-surface-900 rounded">
                            <div class="flex justify-between">
                                <span>Ara Toplam:</span>
                                <span class="font-medium">{{ totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ quote.currency }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>KDV Toplam:</span>
                                <span class="font-medium">{{ totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ quote.currency }}</span>
                            </div>
                            <div class="flex justify-between text-xl font-bold border-t pt-4">
                                <span>Genel Toplam:</span>
                                <span>{{ totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ quote.currency }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Kaydet" icon="pi pi-check" class="w-full" @click="saveQuote" />
                </div>
            </div>
        </div>
    </div>
</template>
