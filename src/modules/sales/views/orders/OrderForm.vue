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
import { Order, type OrderStatus } from '@/modules/sales/domain/order.entity';
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

const orderId = route.params.id as string;
const isEdit = !!orderId;

const order = ref<any>({
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
        if (order.value.lines.length === 0) {
            // DocumentItemsTable will handle the empty state if needed
        }
    }
});

watch(() => order.value.currency, (newCode) => {
    if (!newCode || newCode === 'TRY') {
        order.value.exchangeRate = 1;
    } else {
        const rate = exchangeRateStore.getRateByCode(newCode || '');
        if (rate > 0) order.value.exchangeRate = rate;
    }
});

const totals = computed(() => {
    return DocumentCalculator.calculateTotals(order.value.lines, order.value.discountRate, order.value.currency);
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
        lines: order.value.lines.map((l: any) => ({
            ...l,
            orderId: orderId || ''
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
        <!-- Header -->
        <div class="card p-6 min-h-32 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Siparişi Düzenle' : 'Yeni Sipariş' }}</div>
                
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-hashtag text-primary text-sm"></i>
                            <span class="text-xl font-mono font-bold text-primary leading-none">{{ order.orderNumber || '---' }}</span>
                        </div>

                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-file text-surface-500 text-sm"></i>
                            <span class="text-base font-bold text-surface-700 dark:text-surface-300">
                                {{ order.type === 'sale' ? 'Satış Siparişi' : 'Alış Siparişi' }}
                            </span>
                        </div>

                        <div v-if="order.quoteId" class="flex items-center gap-2 px-3 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <i class="pi pi-link text-blue-500 text-sm"></i>
                            <span class="text-sm font-medium text-blue-700 dark:text-blue-300">Kaynak Teklif Bağlı</span>
                        </div>

                        <div v-if="order.currency !== 'TRY'" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
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
                <!-- Top Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label class="block font-bold mb-3">Tarih</label>
                        <DatePicker v-model="order.issueDate" dateFormat="dd.mm.yy" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Teslim Tarihi</label>
                        <DatePicker v-model="order.dueDate" dateFormat="dd.mm.yy" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Depo (Varsayılan)</label>
                        <Select v-model="order.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                    </div>
                    <div class="lg:col-span-2">
                        <label class="block font-bold mb-3">Cari Hesap</label>
                        <Select v-model="order.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Hesap Seçin" filter fluid />
                    </div>

                    <div>
                        <label class="block font-bold mb-3">Proje</label>
                        <Select v-model="order.projectId" :options="projectStore.projects" optionLabel="name" optionValue="id" placeholder="Proje Seçin" filter showClear fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Döviz</label>
                        <Select v-model="order.currency" :options="lookupStore.currencies" optionLabel="code" optionValue="code" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Kur</label>
                        <InputNumber v-model="order.exchangeRate" :minFractionDigits="4" :disabled="order.currency === 'TRY'" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Durum</label>
                        <Select v-model="order.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Genel İndirim %</label>
                        <InputNumber v-model="order.discountRate" :min="0" :max="100" fluid />
                    </div>
                </div>

                <!-- Lines Table -->
                <DocumentItemsTable 
                    :lines="order.lines" 
                    :currency="order.currency" 
                    :exchangeRate="order.exchangeRate" 
                    :accountId="order.accountId"
                    :warehouseId="order.warehouseId"
                    documentType="order"
                    @change="() => {}"
                >
                    <template #extra-columns>
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
                    </template>
                </DocumentItemsTable>

                <!-- Summary -->
                <DocumentSummary 
                    :totals="totals" 
                    :currency="order.currency" 
                    v-model:notes="order.notes" 
                />
            </div>

            <!-- Actions -->
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
