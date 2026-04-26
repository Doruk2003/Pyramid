<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';
import { Invoice, type DocumentCategory, type InvoiceStatus, type InvoiceType, type PaymentType } from '@/modules/finance/domain/invoice.entity';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const financeStore = useFinanceStore();
const projectStore = useProjectStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore(); // Yeni eklendi
const lookupStore = useLookupStore();
const exchangeRateStore = useExchangeRateStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const settingsStore = useSettingsStore();

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
    discountRate1: number;
    discountRate2: number;
    discountRate3: number;
    lineTotal: number;
}

interface InvoiceFormModel {
    invoiceType: InvoiceType;
    documentCategory: DocumentCategory;
    invoiceNumber: string;
    accountId: string;
    warehouseId: string;
    projectId: string;          // PRJ entegrasyonu
    paymentType: PaymentType;
    issueDate: Date;
    dueDate: Date | null;
    status: InvoiceStatus;
    currency: string;
    exchangeRate: number;
    discountRate: number;
    notes: string;
    lines: InvoiceLineForm[];
    paidAmount?: number;
    createdAt?: Date;
}

const invoice = ref<InvoiceFormModel>({
    invoiceType: 'sale',
    documentCategory: 'domestic',
    invoiceNumber: '',
    accountId: '',
    warehouseId: '',
    projectId: '',              // PRJ entegrasyonu
    paymentType: 'cash',
    issueDate: new Date(),
    dueDate: null,
    status: 'draft',
    currency: 'TRY',
    exchangeRate: 1,
    discountRate: 0,
    notes: '',
    lines: []
});

const invoiceTypes: Array<{ label: string; value: InvoiceType }> = [
    { label: 'Satış', value: 'sale' },
    { label: 'Alış', value: 'purchase' },
    { label: 'Satış İade', value: 'return_sale' },
    { label: 'Alış İade', value: 'return_purchase' }
];

const documentCategories: Array<{ label: string; value: DocumentCategory }> = [
    { label: 'Yurtiçi', value: 'domestic' },
    { label: 'İhracat', value: 'export' },
    { label: 'İhraç Kayıtlı', value: 'export_registered' }
];

const paymentTypes: Array<{ label: string; value: PaymentType }> = [
    { label: 'Peşin', value: 'cash' },
    { label: 'Çek', value: 'check' },
    { label: 'Senet', value: 'note' },
    { label: 'Açık Hesap', value: 'open_account' },
    { label: 'Kredi Kartı', value: 'credit_card' }
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
    if (inventoryStore.warehouses.length === 0) await inventoryStore.fetchWarehouses();
    if (lookupStore.currencies.length === 0) await lookupStore.fetchAll();
    await exchangeRateStore.fetchCurrentRates();
    await projectStore.fetchProjects();   // Proje dropdown için
    await settingsStore.fetchSettings();

    if (isEdit) {
        await financeStore.fetchInvoices();
        const found = financeStore.invoices.find((i) => i.id === invoiceId);
        if (found) {
            const obj = found.toObject();
            invoice.value = {
                ...obj,
                warehouseId: obj.warehouseId || '',
                projectId: obj.projectId || '',
                notes: obj.notes || '',
                issueDate: new Date(obj.issueDate),
                dueDate: obj.dueDate ? new Date(obj.dueDate) : null
            };
        }
    } else {
        addLine(false);
        // Otomatik Fatura No Oluştur
        if (settingsStore.settings) {
            const serial = settingsStore.settings.invoiceSerial || 'ABC';
            const startingNo = settingsStore.settings.invoiceStartingNumber || 1;
            
            await financeStore.fetchInvoices();
            // Aynı seri ile başlayan faturaları say
            const count = financeStore.invoices.filter(i => i.invoiceNumber.startsWith(serial)).length;
            const nextNo = startingNo + count;
            invoice.value.invoiceNumber = `${serial}-${new Date().getFullYear()}-${String(nextNo).padStart(6, '0')}`;
        }
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

const productSelectRefs = ref<any[]>([]);

function setProductSelectRef(el: any, index: number) {
    if (el) {
        productSelectRefs.value[index] = el;
    }
}

function focusAddLineButton() {
    const btn = document.getElementById('btnAddLine');
    if (btn) {
        btn.focus();
    }
}

function addLine(autoOpenSelect = false) {
    const shouldOpen = autoOpenSelect === true;
    invoice.value.lines.push({
        id: crypto.randomUUID(),
        productId: '',
        warehouseId: invoice.value.warehouseId, // Header'daki depoyu varsayılan yap
        description: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: 20,
        discountRate1: 0,
        discountRate2: 0,
        discountRate3: 0,
        lineTotal: 0
    });

    if (shouldOpen) {
        nextTick(() => {
            const lastIndex = invoice.value.lines.length - 1;
            const lastSelect = productSelectRefs.value[lastIndex];
            if (lastSelect) {
                if (lastSelect.show) {
                    lastSelect.show();
                } else if (lastSelect.$el) {
                    lastSelect.$el.click();
                }
            }
        });
    }
}

function removeLine(index: number) {
    invoice.value.lines.splice(index, 1);
}

function onProductChange(line: InvoiceLineForm) {
    const product = productStore.products.find((p) => p.id === line.productId);
    if (product) {
        line.unitPrice = product.price || 0;
        line.vatRate = product.taxRate || 20;

        // İskontoları sıfırla
        line.discountRate1 = 0;
        line.discountRate2 = 0;
        line.discountRate3 = 0;

        // Ürünün İskonto Tipine göre Cari'nin ilgili indirim oranını al
        const account = financeStore.accounts.find((a) => a.id === invoice.value.accountId);
        if (account) {
            let discountType = product.categoryDiscount || 0;

            // Eğer üründe açıkça iskonto tipi belirtilmemişse, kategori adı ile ayarları eşleştir
            if (!discountType && product.categoryId && settingsStore.settings) {
                const category = lookupStore.categories.find(c => c.id === product.categoryId);
                if (category && category.name) {
                    const matchCategory = (label: string, categoryName: string) => {
                        if (!label || label.toLocaleLowerCase('tr-TR').startsWith('bayi')) return false;
                        const l = label.toLocaleLowerCase('tr-TR').trim();
                        const c = categoryName.toLocaleLowerCase('tr-TR').trim();
                        if (l.includes(c) || c.includes(l)) return true;
                        const w = l.split(' ')[0];
                        if (w && w.length > 2 && c.includes(w)) return true;
                        return false;
                    };

                    const l1 = settingsStore.settings.discountLabel1 || '';
                    const l2 = settingsStore.settings.discountLabel2 || '';
                    const l3 = settingsStore.settings.discountLabel3 || '';

                    if (matchCategory(l1, category.name)) {
                        discountType = 1;
                    } else if (matchCategory(l2, category.name)) {
                        discountType = 2;
                    } else if (matchCategory(l3, category.name)) {
                        discountType = 3;
                    }
                }
            }

            if (discountType === 1) {
                line.discountRate1 = account.dealerDiscount1 || 0;
            } else if (discountType === 2) {
                line.discountRate2 = account.dealerDiscount2 || 0;
            } else if (discountType === 3) {
                line.discountRate3 = account.dealerDiscount3 || 0;
            }
        }
    }
}

function getProductCurrency(productId: string) {
    const product = productStore.products.find((p) => p.id === productId);
    if (!product || !product.currencyId) return '-';
    return lookupStore.currencies.find((c) => c.id === product.currencyId)?.code || '-';
}

const totals = computed(() => {
    let grossTotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;

    invoice.value.lines.forEach((line) => {
        const lineGross = line.quantity * (line.unitPrice || 0);
        
        // Bileşik İndirim Uygula (3 seviyeli)
        const d1 = 1 - (line.discountRate1 || 0) / 100;
        const d2 = 1 - (line.discountRate2 || 0) / 100;
        const d3 = 1 - (line.discountRate3 || 0) / 100;
        
        const lineSubtotal = lineGross * d1 * d2 * d3;
        const lineDiscount = lineGross - lineSubtotal;
        const lineVat = lineSubtotal * (line.vatRate / 100);
        
        line.lineTotal = lineSubtotal + lineVat;

        grossTotal += lineGross;
        discountTotal += lineDiscount;
        vatTotal += lineVat;
    });

    const linesSubtotal = grossTotal - discountTotal;
    
    // Fatura Geneli İndirim (Peşin ödeme vb.)
    const globalDiscountRate = invoice.value.discountRate || 0;
    const globalDiscountAmount = linesSubtotal * (globalDiscountRate / 100);
    const netSubtotal = linesSubtotal - globalDiscountAmount;
    
    // KDV orantılaması (Genel indirim sonrası KDV matrahı düştüğü için)
    const finalVatTotal = linesSubtotal > 0 ? (vatTotal * (netSubtotal / linesSubtotal)) : 0;

    return {
        grossTotal,
        discountTotal: discountTotal + globalDiscountAmount, // Satır + Genel İndirim toplamı
        linesDiscount: discountTotal,
        globalDiscount: globalDiscountAmount,
        subtotal: linesSubtotal,
        netSubtotal: netSubtotal,
        vatTotal: finalVatTotal,
        total: netSubtotal + finalVatTotal
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
        paymentType: invoice.value.paymentType,
        documentCategory: invoice.value.documentCategory,
        discountRate: invoice.value.discountRate || 0,
        projectId: invoice.value.projectId || undefined,  // PRJ entegrasyonu
        dueDate: invoice.value.dueDate || undefined,
        id: invoiceId || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        subtotal: t.subtotal,
        discountAmount: t.globalDiscount,
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
        <div class="card p-6 min-h-32 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Faturayı Düzenle' : 'Yeni Fatura' }}</div>
                
                <div class="flex items-center gap-3 mt-2">
                    <!-- Fatura Numarası -->
                    <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                        <i class="pi pi-hashtag text-primary text-sm"></i>
                        <span class="text-xl font-mono font-bold text-primary leading-none">{{ invoice.invoiceNumber || '---' }}</span>
                    </div>

                    <!-- Döviz Kuru (Yabancı döviz ise) -->
                    <div v-if="isForeignCurrency" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                        <i class="pi pi-money-bill text-surface-500 text-sm"></i>
                        <div class="text-base font-medium leading-none">
                            1 {{ invoice.currency }} = <span class="font-bold text-primary">{{ invoice.exchangeRate.toFixed(4) }}</span> ₺
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label for="date" class="block font-bold mb-3">Tarih</label>
                            <DatePicker id="date" v-model="invoice.issueDate" fluid />
                        </div>
                        <div>
                            <label for="type" class="block font-bold mb-3">Fatura Tipi</label>
                            <Select id="type" v-model="invoice.invoiceType" :options="invoiceTypes" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="category" class="block font-bold mb-3">Fatura Türü</label>
                            <Select id="category" v-model="invoice.documentCategory" :options="documentCategories" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="dueDate" class="block font-bold mb-3">Vade Tarihi</label>
                            <DatePicker id="dueDate" v-model="invoice.dueDate" fluid />
                        </div>
                        <div>
                            <label for="warehouse" class="block font-bold mb-3">Depo (Varsayılan)</label>
                            <Select id="warehouse" v-model="invoice.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                        </div>


                        <div>
                            <label for="account" class="block font-bold mb-3">Cari Hesap</label>
                            <Select id="account" v-model="invoice.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Hesap Seçin" filter fluid />
                        </div>
                        <div>
                            <label for="project" class="block font-bold mb-3">Proje
                                <span class="text-surface-400 font-normal ml-1">(opsiyonel)</span>
                            </label>
                            <Select
                                id="project"
                                v-model="invoice.projectId"
                                :options="projectStore.projects"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Proje seçin"
                                showClear
                                filter
                                fluid
                            >
                                <template #option="{ option }">
                                    <span class="font-mono text-xs text-surface-400 mr-2">{{ option.code }}</span>
                                    {{ option.name }}
                                </template>
                            </Select>
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
                            <label for="paymentType" class="block font-bold mb-3">Ödeme Tipi</label>
                            <Select id="paymentType" v-model="invoice.paymentType" :options="paymentTypes" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="discountRate" class="block font-bold mb-3">Genel İndirim %</label>
                            <InputNumber id="discountRate" v-model="invoice.discountRate" :min="0" :max="100" fluid />
                        </div>

                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-4">
                        <h6 class="font-normal m-0">Fatura Kalemleri</h6>
                        <Button id="btnAddLine" label="Kalem Ekle" icon="pi pi-plus" text size="small" @click="() => addLine(true)" />
                    </div>
                    <DataTable :value="invoice.lines" class="p-datatable-sm">
                        <Column header="Ürün" style="width: 25%">
                            <template #body="slotProps">
                                <Select :ref="(el) => setProductSelectRef(el, slotProps.index)" v-model="slotProps.data.productId" :options="productStore.products" optionLabel="name" optionValue="id" @change="onProductChange(slotProps.data)" fluid filter />
                            </template>
                        </Column>
                        <Column header="Depo" style="width: 8%">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo" fluid />
                            </template>
                        </Column>
                        <Column header="Miktar" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.quantity" :min="1" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="Birim Fiyat" style="width: 8%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.unitPrice" :minFractionDigits="2" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="Döviz" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputText :value="getProductCurrency(slotProps.data.productId)" readonly fluid class="text-right" />
                            </template>
                        </Column>
                        <Column header="KDV %" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.vatRate" :options="taxRates" optionLabel="label" optionValue="value" fluid />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel1 || 'İskonto 1'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate1" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel2 || 'İskonto 2'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate2" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel3 || 'İskonto 3'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate3" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="Toplam" style="width: 10%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputText :value="slotProps.data.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })" readonly fluid class="font-bold text-right" @keydown.tab.exact.prevent="focusAddLineButton" />
                            </template>
                        </Column>
                        <Column style="width: 1%">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" text rounded tabindex="-1" @click="removeLine(slotProps.index)" />
                            </template>
                        </Column>
                    </DataTable>
                </div>

                <div class="flex flex-col lg:flex-row justify-between gap-6">
                    <div class="w-full lg:w-6/12">
                        
                        <Textarea id="notes" v-model="invoice.notes" rows="6" placeholder="Fatura notu ekleyin..." fluid />
                    </div>

                    <div class="w-full lg:w-6/12">
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
                                <div v-if="invoice.discountRate > 0" class="flex justify-between text-red-500">
                                    <span>Genel İndirim (%{{ invoice.discountRate }}):</span>
                                    <span class="font-medium">- {{ totals.globalDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div v-if="invoice.discountRate > 0" class="flex justify-between font-bold border-t pt-2">
                                    <span>Net Ara Toplam:</span>
                                    <span class="font-medium">{{ totals.netSubtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
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



