<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { Invoice, type InvoiceStatus, type InvoiceType } from '@/modules/finance/domain/invoice.entity';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const financeStore = useFinanceStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore(); // Yeni eklendi
const lookupStore = useLookupStore();
const exchangeRateStore = useExchangeRateStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const invoiceId = route.params.id as string;
const isEdit = !!invoiceId;

interface InvoiceLineForm {
    id: string;
    productId: string;
    warehouseId?: string; // Yeni eklendi
    description?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discountRate: number;
    lineTotal: number;
}

interface InvoiceFormModel {
    invoiceType: InvoiceType;
    invoiceNumber: string;
    accountId: string;
    warehouseId: string; // Yeni eklendi (Header default)
    issueDate: Date;
    dueDate: Date | null;
    status: InvoiceStatus;
    currency: string;
    exchangeRate: number;
    notes: string;
    lines: InvoiceLineForm[];
    paidAmount?: number;
    createdAt?: Date;
}

const invoice = ref<InvoiceFormModel>({
    invoiceType: 'sale',
    invoiceNumber: '',
    accountId: '',
    warehouseId: '', // Yeni eklendi
    issueDate: new Date(),
    dueDate: null,
    status: 'draft',
    currency: 'TRY',
    exchangeRate: 1,
    notes: '',
    lines: []
});

const invoiceTypes: Array<{ label: string; value: InvoiceType }> = [
    { label: 'Satış', value: 'sale' },
    { label: 'Alış', value: 'purchase' },
    { label: 'Satış İade', value: 'return_sale' },
    { label: 'Alış İade', value: 'return_purchase' }
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
    if (inventoryStore.warehouses.length === 0) await inventoryStore.fetchWarehouses(); // Yeni eklendi
    if (lookupStore.currencies.length === 0) await lookupStore.fetchAll();
    await exchangeRateStore.fetchCurrentRates();

    if (isEdit) {
        await financeStore.fetchInvoices(); // Basitlik için tümünü çekip içinden bulalım
        const found = financeStore.invoices.find((i) => i.id === invoiceId);
        if (found) {
            const obj = found.toObject();
            invoice.value = { 
                ...obj, 
                warehouseId: obj.warehouseId || '',
                notes: obj.notes || '',
                issueDate: new Date(obj.issueDate), 
                dueDate: obj.dueDate ? new Date(obj.dueDate) : null 
            };
        }
    } else {
        // Yeni fatura için otomatik bir satır ekle
        addLine();
    }
});

// Döviz değiştiğinde güncel kuru otomatik doldur
watch(
    () => invoice.value.currency,
    (newCode) => {
        if (!newCode || newCode === 'TRY') {
            invoice.value.exchangeRate = 1;
            return;
        }
        const rate = exchangeRateStore.getRateByCode(newCode);
        if (rate > 0) invoice.value.exchangeRate = rate;
    }
);

// TRY karşılığı toplamlar (yabancı dövizli faturalar için)
const isForeignCurrency = computed(() => invoice.value.currency && invoice.value.currency !== 'TRY');

const totalsTRY = computed(() => {
    if (!isForeignCurrency.value) return null;
    const rate = invoice.value.exchangeRate || 1;
    return {
        grossTotal: CurrencyConversionService.toTRY(totals.value.grossTotal, rate),
        discountTotal: CurrencyConversionService.toTRY(totals.value.discountTotal, rate),
        subtotal: CurrencyConversionService.toTRY(totals.value.subtotal, rate),
        vatTotal: CurrencyConversionService.toTRY(totals.value.vatTotal, rate),
        total: CurrencyConversionService.toTRY(totals.value.total, rate)
    };
});

function addLine() {
    invoice.value.lines.push({
        id: crypto.randomUUID(),
        productId: '',
        warehouseId: invoice.value.warehouseId, // Header'daki depoyu varsayılan yap
        description: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: 20,
        discountRate: 0,
        lineTotal: 0
    });
}

function removeLine(index: number) {
    invoice.value.lines.splice(index, 1);
}

function onProductChange(line: InvoiceLineForm) {
    const product = productStore.products.find((p) => p.id === line.productId);
    if (product) {
        line.unitPrice = product.price || 0;
        line.vatRate = product.taxRate || 20;
    }
}

const totals = computed(() => {
    let grossTotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;

    invoice.value.lines.forEach((line) => {
        const lineGross = line.quantity * (line.unitPrice || 0);
        const lineDiscount = lineGross * (line.discountRate / 100);
        const lineSubtotal = lineGross - lineDiscount;
        const lineVat = lineSubtotal * (line.vatRate / 100);
        
        line.lineTotal = lineSubtotal + lineVat;

        grossTotal += lineGross;
        discountTotal += lineDiscount;
        vatTotal += lineVat;
    });

    const subtotal = grossTotal - discountTotal;

    return {
        grossTotal,
        discountTotal,
        subtotal,
        vatTotal,
        total: subtotal + vatTotal
    };
});

async function saveInvoice() {
    if (!invoice.value.accountId || !invoice.value.invoiceNumber || !invoice.value.warehouseId || invoice.value.lines.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları (Cari, Fatura No, Depo ve Kalemler) doldurun', life: 3000 });
        return;
    }

    const t = totals.value;
    const inv = Invoice.create({
        ...invoice.value,
        dueDate: invoice.value.dueDate || undefined,
        id: invoiceId || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        subtotal: t.subtotal,
        vatTotal: t.vatTotal,
        total: t.total,
        paidAmount: invoice.value.paidAmount || 0,
        createdAt: invoice.value.createdAt || new Date(),
        updatedAt: new Date(),
        lines: invoice.value.lines.map((l) => ({
            ...l,
            invoiceId: invoiceId || ''
        }))
    });

    const result = await financeStore.saveInvoice(inv);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Fatura kaydedildi', life: 3000 });
        router.push('/finance/invoices');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/finance/invoices');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-6 min-h-32 flex flex-col gap-0">
            <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Faturayı Düzenle' : 'Yeni Fatura' }}</div>
            <div class="text-surface-600 dark:text-surface-400">
                <p>Fatura bilgilerini ve kalemlerini buradan yönetebilirsiniz.</p>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="type" class="block font-bold mb-3">Fatura Tipi</label>
                            <Select id="type" v-model="invoice.invoiceType" :options="invoiceTypes" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="number" class="block font-bold mb-3">Fatura No</label>
                            <InputText id="number" v-model="invoice.invoiceNumber" fluid />
                        </div>
                        <div class="md:col-span-2 lg:col-span-2">
                            <label for="account" class="block font-bold mb-3">Cari Hesap</label>
                            <Select id="account" v-model="invoice.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Hesap Seçin" filter fluid />
                        </div>
                        <div>
                            <label for="warehouse" class="block font-bold mb-3">Depo (Varsayılan)</label>
                            <Select id="warehouse" v-model="invoice.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                        </div>
                        <div>
                            <label for="date" class="block font-bold mb-3">Tarih</label>
                            <DatePicker id="date" v-model="invoice.issueDate" fluid />
                        </div>
                        <div>
                            <label for="dueDate" class="block font-bold mb-3">Vade Tarihi</label>
                            <DatePicker id="dueDate" v-model="invoice.dueDate" fluid />
                        </div>
                        <div>
                            <label for="currency" class="block font-bold mb-3">Döviz</label>
                            <Select
                                id="currency"
                                v-model="invoice.currency"
                                :options="lookupStore.currencies"
                                optionLabel="code"
                                optionValue="code"
                                fluid
                            >
                                <template #option="slotProps">
                                    <span>
                                        <Tag severity="info" :value="slotProps.option.code" class="mr-2" />
                                        {{ slotProps.option.name }}
                                    </span>
                                </template>
                            </Select>
                        </div>
                        <div>
                            <label for="rate" class="block font-bold mb-3">
                                Kur
                                <span v-if="isForeignCurrency" class="font-normal text-surface-500 text-sm ml-1">
                                    (1 {{ invoice.currency }} = ? ₺)
                                </span>
                            </label>
                            <InputNumber
                                id="rate"
                                v-model="invoice.exchangeRate"
                                :minFractionDigits="4"
                                :maxFractionDigits="6"
                                :disabled="!isForeignCurrency"
                                fluid
                            />
                        </div>
                        <div class="md:col-span-2 lg:col-span-3">
                            <label for="notes" class="block font-bold mb-3">Notlar</label>
                            <InputText id="notes" v-model="invoice.notes" placeholder="Fatura notu ekleyin..." fluid />
                        </div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-4">
                        <h5 class="font-bold m-0">Fatura Kalemleri</h5>
                        <Button label="Kalem Ekle" icon="pi pi-plus" text size="small" @click="addLine" />
                    </div>
                    <DataTable :value="invoice.lines" class="p-datatable-sm">
                        <Column header="Ürün" style="width: 25%">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.productId" :options="productStore.products" optionLabel="name" optionValue="id" @change="onProductChange(slotProps.data)" fluid filter />
                            </template>
                        </Column>
                        <Column header="Depo" style="width: 15%">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo" fluid />
                            </template>
                        </Column>
                        <Column header="Miktar" style="width: 10%">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.quantity" :min="1" fluid />
                            </template>
                        </Column>
                        <Column header="Birim Fiyat" style="width: 15%">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.unitPrice" :minFractionDigits="2" fluid />
                            </template>
                        </Column>
                        <Column header="KDV %" style="width: 10%">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.vatRate" :options="taxRates" optionLabel="label" optionValue="value" fluid />
                            </template>
                        </Column>
                        <Column header="İndirim %" style="width: 10%">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate" :min="0" :max="100" fluid />
                            </template>
                        </Column>
                        <Column header="Toplam" style="width: 15%">
                            <template #body="slotProps">
                                <span class="font-bold">{{ slotProps.data.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</span>
                            </template>
                        </Column>
                        <Column style="width: 10%">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" text rounded @click="removeLine(slotProps.index)" />
                            </template>
                        </Column>
                    </DataTable>
                </div>

                <div>
                    <div class="flex justify-end">
                        <div class="w-full lg:w-1/2">
                            <div class="flex flex-col gap-4 p-4 bg-surface-50 dark:bg-surface-900 rounded">
                                <div class="flex justify-between">
                                    <span>Brüt Toplam:</span>
                                    <span class="font-medium">{{ totals.grossTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between text-red-500">
                                    <span>İskonto Toplamı:</span>
                                    <span class="font-medium">- {{ totals.discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between border-t pt-2 mt-1">
                                    <span>Ara Toplam:</span>
                                    <span class="font-medium">{{ totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>KDV Toplam:</span>
                                    <span class="font-medium">{{ totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between text-xl font-bold border-t pt-4">
                                    <span>Genel Toplam:</span>
                                    <span>{{ totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <!-- TRY karşılığı (yabancı döviz ise göster) -->
                                <div v-if="isForeignCurrency && totalsTRY" class="border-t pt-3 mt-1">
                                    <div class="text-surface-500 text-sm mb-1">TRY Karşılığı (Kur: {{ invoice.exchangeRate }})</div>
                                    <div class="flex justify-between font-bold text-primary">
                                        <span>≈ TRY Toplam:</span>
                                        <span>{{ totalsTRY.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Butonlar -->
            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Kaydet" icon="pi pi-check" class="w-full" @click="saveInvoice" />
                </div>
            </div>
        </div>
    </div>
</template>



