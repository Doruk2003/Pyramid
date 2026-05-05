<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSalesStore } from '@/modules/sales/application/sales.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';
import { Order, type OrderStatus } from '@/modules/sales/domain/order.entity';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { getErrorMessage } from '@/shared/utils/error';
import { numberToWords } from '@/shared/utils/number-to-words';
import { useToast } from 'primevue/usetoast';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
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

const orderId = route.params.id as string;
const isEdit = !!orderId;

interface OrderLineForm {
    id: string;
    orderId: string;
    productId: string;
    warehouseId?: string;
    description?: string;
    quantity: number;
    invoicedQuantity: number;
    shippedQuantity: number;
    unitPrice: number;
    originalPrice?: number;
    originalCurrency?: string;
    vatRate: number;
    discountRate1: number;
    discountRate2: number;
    discountRate3: number;
    lineTotal: number;
    sortOrder: number;
}

interface OrderFormModel {
    orderNumber: string;
    accountId: string;
    quoteId: string | null;
    warehouseId: string;
    projectId: string | null;
    issueDate: Date;
    dueDate: Date | null;
    status: OrderStatus;
    type: 'sale' | 'purchase';
    currency: string;
    exchangeRate: number;
    discountRate: number;
    notes: string;
    lines: OrderLineForm[];
    createdAt?: Date;
}

const order = ref<OrderFormModel>({
    orderNumber: '',
    accountId: '',
    quoteId: null,
    warehouseId: '',
    projectId: null,
    issueDate: new Date(),
    dueDate: null,
    status: 'draft',
    type: 'sale',
    currency: 'TRY',
    exchangeRate: 1,
    discountRate: 0,
    notes: '',
    lines: []
});

const statusOptions: Array<{ label: string; value: OrderStatus }> = [
    { label: 'Taslak', value: 'draft' },
    { label: 'Onaylandı', value: 'confirmed' },
    { label: 'Hazırlanıyor', value: 'processing' },
    { label: 'Sevk Edildi', value: 'shipped' },
    { label: 'Teslim Edildi', value: 'delivered' },
    { label: 'Kısmi Faturalandı', value: 'partially_invoiced' },
    { label: 'İptal', value: 'cancelled' },
    { label: 'Tamamlandı', value: 'completed' }
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
    await projectStore.fetchProjects();
    await settingsStore.fetchSettings();
    await inventoryStore.fetchBalances();

    if (isEdit) {
        await salesStore.fetchOrders();
        const found = salesStore.orders.find((o) => o.id === orderId);
        if (found) {
            const obj = found.toObject();
            order.value = { 
                ...obj, 
                warehouseId: obj.lines[0]?.warehouseId || '',
                notes: obj.notes || '',
                quoteId: obj.quoteId || null,
                projectId: obj.projectId || null,
                discountRate: (obj as any).discountRate || 0,
                issueDate: new Date(obj.issueDate), 
                dueDate: obj.dueDate ? new Date(obj.dueDate) : null
            };
        }
    } else {
        order.value.orderNumber = await salesStore.getNextOrderNumber();
        addLine(false);
    }
});

watch(
    () => order.value.currency,
    (newCode) => {
        if (!newCode || newCode === 'TRY') {
            order.value.exchangeRate = 1;
        } else {
            const rate = exchangeRateStore.getRateByCode(newCode);
            if (rate > 0) order.value.exchangeRate = rate;
        }
        order.value.lines.forEach(line => convertLinePrice(line));
    }
);

watch(
    () => order.value.exchangeRate,
    () => {
        order.value.lines.forEach(line => convertLinePrice(line));
    }
);

const isForeignCurrency = computed(() => order.value.currency && order.value.currency !== 'TRY');

const productSelectRefs = ref<any[]>([]);
function setProductSelectRef(el: any, index: number) {
    if (el) productSelectRefs.value[index] = el;
}

function focusAddLineButton() {
    const btn = document.getElementById('btnAddLine');
    if (btn) btn.focus();
}

function addLine(autoOpenSelect = false) {
    const shouldOpen = autoOpenSelect === true;
    order.value.lines.push({
        id: crypto.randomUUID(),
        orderId: orderId || '',
        productId: '',
        warehouseId: order.value.warehouseId,
        description: '',
        quantity: 1,
        invoicedQuantity: 0,
        shippedQuantity: 0,
        unitPrice: 0,
        originalPrice: 0,
        originalCurrency: '',
        vatRate: 20,
        discountRate1: 0,
        discountRate2: 0,
        discountRate3: 0,
        lineTotal: 0,
        sortOrder: order.value.lines.length
    });

    if (shouldOpen) {
        nextTick(() => {
            const lastIndex = order.value.lines.length - 1;
            const lastSelect = productSelectRefs.value[lastIndex];
            if (lastSelect) {
                if (lastSelect.show) lastSelect.show();
                else if (lastSelect.$el) lastSelect.$el.click();
            }
        });
    }
}

function removeLine(index: number) {
    order.value.lines.splice(index, 1);
}

function getStock(productId: string, warehouseId?: string) {
    if (!productId) return 0;
    const targetWarehouse = warehouseId || order.value.warehouseId;
    if (!targetWarehouse) return 0;
    
    const balance = inventoryStore.balances.find(
        (b) => b.productId === productId && b.warehouseId === targetWarehouse
    );
    return balance ? balance.balance : 0;
}

function convertLinePrice(line: OrderLineForm) {
    if (!line.originalPrice || !line.originalCurrency) return;
    const orderCurrency = order.value.currency || 'TRY';
    const orderRate = order.value.exchangeRate || 1;
    const productRate = exchangeRateStore.getRateByCode(line.originalCurrency);
    
    if (line.originalCurrency === orderCurrency) {
        line.unitPrice = line.originalPrice;
    } else {
        line.unitPrice = CurrencyConversionService.crossConvert(line.originalPrice, productRate, orderRate);
    }
}

function onProductChange(line: OrderLineForm) {
    const product = productStore.products.find((p) => p.id === line.productId);
    if (product) {
        line.originalPrice = product.price || 0;
        line.originalCurrency = lookupStore.currencies.find(c => c.id === product.currencyId)?.code || 'TRY';
        convertLinePrice(line);
        line.vatRate = product.taxRate || 20;
        line.description = product.name;
    }
}

const totals = computed(() => {
    let grossTotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;

    order.value.lines.forEach((line) => {
        const lineGross = line.quantity * (line.unitPrice || 0);
        const d1 = 1 - (line.discountRate1 || 0) / 100;
        const d2 = 1 - (line.discountRate2 || 0) / 100;
        const d3 = 1 - (line.discountRate3 || 0) / 100;
        
        const lineSubtotal = lineGross * d1 * d2 * d3;
        const lineDiscount = lineGross - lineSubtotal;
        const lineVat = lineSubtotal * ((line.vatRate || 0) / 100);
        
        line.lineTotal = Math.round((lineSubtotal + lineVat) * 100) / 100;

        grossTotal += lineGross;
        discountTotal += lineDiscount;
        vatTotal += lineVat;
    });

    const linesSubtotal = Math.round((grossTotal - discountTotal) * 100) / 100;
    const globalDiscountRate = order.value.discountRate || 0;
    const globalDiscountAmount = Math.round((linesSubtotal * (globalDiscountRate / 100)) * 100) / 100;
    const netSubtotal = Math.round((linesSubtotal - globalDiscountAmount) * 100) / 100;
    const finalVatTotal = linesSubtotal > 0 ? Math.round((vatTotal * (netSubtotal / linesSubtotal)) * 100) / 100 : 0;

    return {
        grossTotal: Math.round(grossTotal * 100) / 100,
        discountTotal: Math.round((discountTotal + globalDiscountAmount) * 100) / 100,
        subtotal: linesSubtotal,
        netSubtotal: netSubtotal,
        vatTotal: finalVatTotal,
        total: Math.round((netSubtotal + finalVatTotal) * 100) / 100
    };
});

const totalAsWords = computed(() => {
    return numberToWords(totals.value.total, order.value.currency);
});

async function saveOrder() {
    if (!order.value.accountId || !order.value.orderNumber || order.value.lines.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları doldurun', life: 3000 });
        return;
    }

    const t = totals.value;
    const o = Order.create({
        ...order.value,
        quoteId: order.value.quoteId || undefined,
        dueDate: order.value.dueDate || undefined,
        projectId: order.value.projectId || undefined,
        id: orderId || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        subtotal: t.subtotal,
        vatTotal: t.vatTotal,
        total: t.total,
        type: order.value.type,
        createdAt: order.value.createdAt || new Date(),
        updatedAt: new Date(),
        lines: order.value.lines.map((l) => ({
            id: l.id,
            orderId: orderId || '',
            productId: l.productId,
            warehouseId: (l as any).warehouseId || undefined,
            description: l.description,
            quantity: l.quantity,
            invoicedQuantity: l.invoicedQuantity || 0,
            shippedQuantity: l.shippedQuantity || 0,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate,
            discountRate1: l.discountRate1,
            discountRate2: l.discountRate2,
            discountRate3: l.discountRate3,
            lineTotal: l.lineTotal,
            sortOrder: l.sortOrder
        }))
    });

    const result = await salesStore.saveOrder(o);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Sipariş kaydedildi', life: 3000 });
        router.push('/sales/orders');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/sales/orders');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-6 min-h-32 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Siparişi Düzenle' : 'Yeni Sipariş' }}</div>
                
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-3">
                        <!-- Sipariş Numarası -->
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-hashtag text-primary text-sm"></i>
                            <span class="text-xl font-mono font-bold text-primary leading-none">{{ order.orderNumber || '---' }}</span>
                        </div>

                        <!-- Tip Badge -->
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-file text-surface-500 text-sm"></i>
                            <span class="text-base font-bold text-surface-700 dark:text-surface-300">
                                {{ order.type === 'sale' ? 'Satış Siparişi' : 'Alış Siparişi' }}
                            </span>
                        </div>

                        <!-- Kaynak Belge Badge -->
                        <div v-if="order.quoteId" class="flex items-center gap-2 px-3 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <i class="pi pi-link text-blue-500 text-sm"></i>
                            <span class="text-sm font-medium text-blue-700 dark:text-blue-300">Kaynak Teklif Bağlı</span>
                        </div>

                        <!-- Döviz Kuru -->
                        <div v-if="isForeignCurrency" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-money-bill text-surface-500 text-sm"></i>
                            <div class="text-base font-medium leading-none">
                                1 {{ order.currency }} = <span class="font-bold text-primary">{{ order.exchangeRate.toFixed(4) }}</span> ₺
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

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label for="date" class="block font-bold mb-3">Tarih</label>
                            <DatePicker id="date" v-model="order.issueDate" dateFormat="dd.mm.yy" fluid />
                        </div>
                        <div>
                            <label for="dueDate" class="block font-bold mb-3">Teslim Tarihi</label>
                            <DatePicker id="dueDate" v-model="order.dueDate" dateFormat="dd.mm.yy" fluid />
                        </div>
                        <div>
                            <label for="warehouse" class="block font-bold mb-3">Depo (Varsayılan)</label>
                            <Select id="warehouse" v-model="order.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                        </div>
                        <div class="lg:col-span-2">
                            <label for="account" class="block font-bold mb-3">Cari Hesap</label>
                            <Select id="account" v-model="order.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Hesap Seçin" filter fluid />
                        </div>

                        <div>
                            <label for="project" class="block font-bold mb-3">Proje</label>
                            <Select id="project" v-model="order.projectId" :options="projectStore.projects" optionLabel="name" optionValue="id" placeholder="Proje Seçin" filter showClear fluid />
                        </div>
                        <div>
                            <label for="currency" class="block font-bold mb-3">Döviz</label>
                            <Select id="currency" v-model="order.currency" :options="lookupStore.currencies" optionLabel="code" optionValue="code" fluid />
                        </div>
                        <div>
                            <label for="rate" class="block font-bold mb-3">Kur</label>
                            <InputNumber v-model="order.exchangeRate" :minFractionDigits="4" :disabled="!isForeignCurrency" fluid />
                        </div>
                        <div>
                            <label for="status" class="block font-bold mb-3">Durum</label>
                            <Select id="status" v-model="order.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="discountRate" class="block font-bold mb-3">Genel İndirim %</label>
                            <InputNumber id="discountRate" v-model="order.discountRate" :min="0" :max="100" fluid />
                        </div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-4">
                        <h6 class="font-normal m-0">Sipariş Kalemleri</h6>
                        <Button id="btnAddLine" label="Kalem Ekle" icon="pi pi-plus" text size="small" @click="() => addLine(true)" />
                    </div>
                    <DataTable :value="order.lines" class="p-datatable-sm">
                        <Column header="Ürün" style="width: 25%">
                            <template #body="slotProps">
                                <div class="flex flex-col gap-1">
                                    <Select :ref="(el) => setProductSelectRef(el, slotProps.index)" v-model="slotProps.data.productId" :options="productStore.products" optionLabel="name" optionValue="id" @change="onProductChange(slotProps.data)" fluid filter />
                                    <div v-if="slotProps.data.productId" class="flex items-center gap-1.5 px-1">
                                        <i class="pi pi-box text-[10px]" :class="getStock(slotProps.data.productId, slotProps.data.warehouseId) > 0 ? 'text-green-500' : 'text-red-500'"></i>
                                        <span class="text-[10px] font-medium" :class="getStock(slotProps.data.productId, slotProps.data.warehouseId) > 0 ? 'text-green-600' : 'text-red-600'">
                                            Mevcut Stok: {{ getStock(slotProps.data.productId, slotProps.data.warehouseId) }} Adet
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </Column>
                        <Column header="Miktar" style="width: 7%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.quantity" :min="1" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column v-if="isEdit" header="Fatura/Sevk" style="width: 10%">
                            <template #body="slotProps">
                                <div class="flex flex-col gap-1">
                                    <ProgressBar 
                                        :value="Math.min(100, Math.round((slotProps.data.invoicedQuantity / slotProps.data.quantity) * 100))" 
                                        :showValue="false" 
                                        style="height: 6px"
                                        :severity="slotProps.data.invoicedQuantity >= slotProps.data.quantity ? 'success' : (slotProps.data.invoicedQuantity > 0 ? 'warn' : 'secondary')"
                                    />
                                    <span class="text-[10px] text-surface-500 font-medium text-center">
                                        {{ slotProps.data.invoicedQuantity || 0 }} / {{ slotProps.data.quantity }}
                                    </span>
                                </div>
                            </template>
                        </Column>
                        <Column header="Birim Fiyat" style="width: 10%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.unitPrice" :minFractionDigits="2" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="KDV %" style="width: 7%">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.vatRate" :options="taxRates" optionLabel="label" optionValue="value" fluid />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel1 || 'İnd.1'" style="width: 5%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate1" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel2 || 'İnd.2'" style="width: 5%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate2" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel3 || 'İnd.3'" style="width: 5%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate3" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="Toplam" style="width: 12%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputText :value="slotProps.data.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })" readonly fluid class="font-bold text-right" @keydown.tab.exact.prevent="focusAddLineButton" />
                            </template>
                        </Column>
                        <Column style="width: 3%">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" text rounded @click="removeLine(slotProps.index)" />
                            </template>
                        </Column>
                    </DataTable>
                </div>

                <div class="flex flex-col lg:flex-row justify-between gap-6">
                    <div class="w-full lg:w-7/12">
                        <label for="notes" class="block font-bold mb-3">Notlar</label>
                        <Textarea id="notes" v-model="order.notes" rows="6" placeholder="Sipariş notu ekleyin..." fluid />
                        <div class="mt-4 p-4 bg-surface-50 dark:bg-surface-900 rounded border border-surface-200 dark:border-surface-700 italic text-surface-600 dark:text-surface-400">
                            {{ totalAsWords }}
                        </div>
                    </div>
                    <div class="w-full lg:w-4/12">
                        <div class="flex flex-col gap-3 p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
                            <div class="flex justify-between items-center">
                                <span class="text-surface-600 dark:text-surface-400">Brüt Toplam</span>
                                <span class="font-medium">{{ totals.grossTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ order.currency }}</span>
                            </div>
                            <div class="flex justify-between items-center text-red-500">
                                <span>Toplam İndirim</span>
                                <span>-{{ totals.discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ order.currency }}</span>
                            </div>
                            <div class="flex justify-between items-center font-bold border-t border-surface-200 dark:border-surface-700 pt-3">
                                <span>Ara Toplam</span>
                                <span>{{ totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ order.currency }}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>KDV Toplam</span>
                                <span>{{ totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ order.currency }}</span>
                            </div>
                            <div class="flex justify-between items-center text-2xl font-bold text-primary border-t-2 border-primary pt-3 mt-2">
                                <span>Genel Toplam</span>
                                <span>{{ totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ order.currency }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" outlined @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Siparişi Kaydet" icon="pi pi-check" class="w-full" @click="saveOrder" />
                </div>
            </div>
        </div>
    </div>
</template>
