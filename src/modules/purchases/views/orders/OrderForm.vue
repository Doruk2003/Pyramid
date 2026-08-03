<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { usePurchasesStore } from '@/modules/purchases/application/purchases.store';
import { Order, type OrderStatus } from '@/modules/purchases/domain/order.entity';
import DocumentItemsTable from '@/shared/components/DocumentItemsTable.vue';
import DocumentSummary from '@/shared/components/DocumentSummary.vue';
import { DocumentCalculator } from '@/shared/utils/document-calculator';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const purchasesStore = usePurchasesStore();
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

const stockWarning = ref({ visible: false, title: '', message: '', severity: 'warn' as 'warn' | 'error' });

function checkStock(line: any) {
    if (!line.productId) return;
    const product = productStore.products.find(p => p.id === line.productId);
    if (!product) return;
    const warehouseId = line.warehouseId || order.value.warehouseId;
    const currentStock = inventoryStore.balances.find(b => b.productId === line.productId && b.warehouseId === warehouseId)?.balance || 0;
    const afterStock = currentStock + line.quantity;
    const maxStock = product.maxStock || 0;
    if (maxStock > 0 && afterStock > maxStock) {
        stockWarning.value = { visible: true, title: 'Maksimum Stok Uyarısı',
            message: `${product.name}: Mevcut ${currentStock} + Eklenecek ${line.quantity} = ${afterStock} (Max: ${maxStock})`, severity: 'warn' };
    }
}

const orderId = route.params.id as string;
const isEdit = !!orderId;

const order = ref<any>({
    orderNumber: '', accountId: '', quoteId: null, warehouseId: '', projectId: null,
    issueDate: new Date(), dueDate: null, status: 'draft', type: 'purchase',
    currency: 'TRY', exchangeRate: 1, discountRate: 0, notes: '', lines: []
});

const statusOptions: Array<{ label: string; value: OrderStatus }> = [
    { label: 'Taslak', value: 'draft' }, { label: 'Onaylandı', value: 'confirmed' },
    { label: 'Hazırlanıyor', value: 'processing' }, { label: 'Sevk Edildi', value: 'shipped' },
    { label: 'Teslim Edildi', value: 'delivered' }, { label: 'Kısmi Faturalandı', value: 'partially_invoiced' },
    { label: 'İptal', value: 'cancelled' }, { label: 'Tamamlandı', value: 'completed' }
];

onMounted(async () => {
    await Promise.all([
        financeStore.fetchAccounts(), productStore.fetchProducts(),
        inventoryStore.fetchWarehouses(), lookupStore.fetchAll(),
        exchangeRateStore.fetchCurrentRates(), projectStore.fetchProjects(),
        settingsStore.fetchSettings(), inventoryStore.fetchBalances()
    ]);

    if (isEdit) {
        await purchasesStore.fetchOrders();
        const found = purchasesStore.orders.find(o => o.id === orderId);
        if (found) {
            const obj = found.toObject();
            order.value = { ...obj, warehouseId: obj.lines[0]?.warehouseId || '', notes: obj.notes || '',
                quoteId: obj.quoteId || null, projectId: obj.projectId || null,
                discountRate: (obj as any).discountRate || 0,
                issueDate: new Date(obj.issueDate), dueDate: obj.dueDate ? new Date(obj.dueDate) : null };
        }
    } else {
        order.value.orderNumber = await purchasesStore.getNextOrderNumber();

        // Ayarlardan varsayılan alış deposunu uygula
        if (!order.value.warehouseId && settingsStore.settings?.defaultPurchaseWarehouseId) {
            order.value.warehouseId = settingsStore.settings.defaultPurchaseWarehouseId;
        }

        // Teklif kaynaklı aktarım
        const sourceIdsQuery = route.query.sourceIds as string;
        const sourceTypeQuery = route.query.sourceType as string;
        if (sourceIdsQuery && sourceTypeQuery === 'quote') {
            await purchasesStore.fetchQuotes();
            const sourceIds = sourceIdsQuery.split(',');
            const selectedQuotes = purchasesStore.quotes.filter(q => sourceIds.includes(q.id));
            if (selectedQuotes.length > 0) {
                const first = selectedQuotes[0];
                order.value.accountId = first.accountId;
                order.value.currency = first.currency;
                order.value.exchangeRate = first.exchangeRate;
                order.value.projectId = first.projectId || null;
                order.value.lines = [];
                selectedQuotes.forEach(quote => {
                    quote.lines.forEach((line: any) => {
                        const pending = line.quantity - (line.orderedQuantity || 0);
                        if (pending > 0) {
                            order.value.lines.push({
                                id: crypto.randomUUID(), productId: line.productId,
                                warehouseId: line.warehouseId || '', description: line.description || '',
                                quantity: pending, unitPrice: line.unitPrice, vatRate: line.vatRate,
                                discountRate1: line.discountRate1 || 0, discountRate2: line.discountRate2 || 0,
                                discountRate3: line.discountRate3 || 0, lineTotal: 0,
                                invoicedQuantity: 0, shippedQuantity: 0, sortOrder: 0,
                                sourceLineId: line.id
                            });
                        }
                    });
                });
            }
        }
    }
});

watch(() => order.value.currency, (newCode) => {
    if (!newCode || newCode === 'TRY') { order.value.exchangeRate = 1; }
    else { const rate = exchangeRateStore.getRateByCode(newCode); if (rate > 0) order.value.exchangeRate = rate; }
});

const totals = computed(() => DocumentCalculator.calculateTotals(order.value.lines, order.value.discountRate, order.value.currency));

async function saveOrder() {
    if (!order.value.accountId || !order.value.orderNumber || order.value.lines.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları doldurun', life: 3000 }); return;
    }
    const t = totals.value;
    const o = Order.create({ ...order.value,
        quoteId: order.value.quoteId || undefined, dueDate: order.value.dueDate || undefined,
        projectId: order.value.projectId || undefined, id: orderId || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '', subtotal: t.subtotal, vatTotal: t.vatTotal,
        total: t.total, type: 'purchase', createdAt: order.value.createdAt || new Date(), updatedAt: new Date(),
        lines: order.value.lines.map((l: any) => ({ ...l, orderId: orderId || '' }))
    });
    const result = await purchasesStore.saveOrder(o);
    if (result.success) { toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Sipariş kaydedildi', life: 3000 }); router.push('/purchases/orders'); }
    else { toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 }); }
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-4 min-h-32 flex flex-col gap-2">
            <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Siparişi Düzenle' : 'Yeni Satın Alma Siparişi' }}</div>
            <div class="flex items-center gap-3 mt-2">
                <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                    <i class="pi pi-hashtag text-primary text-sm"></i>
                    <span class="text-xl font-mono font-bold text-primary leading-none">{{ order.orderNumber || '---' }}</span>
                </div>
                <div class="flex items-center gap-2 px-3 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <i class="pi pi-shopping-cart text-amber-600 text-sm"></i>
                    <span class="text-base font-bold text-amber-700 dark:text-amber-300">Alış Siparişi</span>
                </div>
                <div v-if="order.quoteId" class="flex items-center gap-2 px-3 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <i class="pi pi-link text-blue-500 text-sm"></i>
                    <span class="text-sm font-medium text-blue-700 dark:text-blue-300">Kaynak Teklif Bağlı</span>
                </div>
                <div v-if="order.currency !== 'TRY'" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                    <i class="pi pi-money-bill text-surface-500 text-sm"></i>
                    <span class="text-base font-medium">1 {{ order.currency }} = <strong class="text-primary">{{ order.exchangeRate.toFixed(4) }}</strong> ₺</span>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-4 mb-4">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div><label class="block font-bold mb-3">Tarih</label><DatePicker v-model="order.issueDate" dateFormat="dd.mm.yy" fluid /></div>
                    <div><label class="block font-bold mb-3">Teslim Tarihi</label><DatePicker v-model="order.dueDate" dateFormat="dd.mm.yy" fluid /></div>
                    <div><label class="block font-bold mb-3">Depo</label><Select v-model="order.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid /></div>
                    <div class="lg:col-span-2"><label class="block font-bold mb-3">Tedarikçi (Cari Hesap)</label><Select v-model="order.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Tedarikçi Seçin" filter fluid /></div>
                    <div><label class="block font-bold mb-3">Proje</label><Select v-model="order.projectId" :options="projectStore.projects" optionLabel="name" optionValue="id" placeholder="Proje Seçin" filter showClear fluid /></div>
                    <div><label class="block font-bold mb-3">Döviz</label><Select v-model="order.currency" :options="lookupStore.currencies" optionLabel="code" optionValue="code" fluid /></div>
                    <div><label class="block font-bold mb-3">Kur</label><InputNumber v-model="order.exchangeRate" :minFractionDigits="4" :disabled="order.currency === 'TRY'" fluid /></div>
                    <div><label class="block font-bold mb-3">Durum</label><Select v-model="order.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid /></div>
                    <div><label class="block font-bold mb-3">Genel İndirim %</label><InputNumber v-model="order.discountRate" :min="0" :max="100" fluid /></div>
                </div>

                <DocumentItemsTable v-model:lines="order.lines" :currency="order.currency" :exchangeRate="order.exchangeRate"
                    :accountId="order.accountId" :warehouseId="order.warehouseId" documentType="order"
                    @change="() => {}" @stock-check="checkStock">
                    <template #extra-columns>
                        <Column v-if="isEdit" header="Fatura/Teslim" style="width: 10%">
                            <template #body="slotProps">
                                <div class="flex flex-col gap-1">
                                    <ProgressBar :value="Math.min(100, Math.round((slotProps.data.invoicedQuantity / slotProps.data.quantity) * 100))" :showValue="false" style="height: 6px"
                                        :severity="slotProps.data.invoicedQuantity >= slotProps.data.quantity ? 'success' : (slotProps.data.invoicedQuantity > 0 ? 'warn' : 'secondary')" />
                                    <span class="text-[10px] text-surface-500 font-medium text-center">{{ slotProps.data.invoicedQuantity || 0 }} / {{ slotProps.data.quantity }}</span>
                                </div>
                            </template>
                        </Column>
                    </template>
                </DocumentItemsTable>

                <DocumentSummary :totals="totals" :currency="order.currency" v-model:notes="order.notes" />
            </div>

            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6"><Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" outlined @click="router.push('/purchases/orders')" /></div>
                <div class="col-span-6"><Button label="Siparişi Kaydet" icon="pi pi-check" class="w-full" @click="saveOrder" /></div>
            </div>
        </div>
    </div>

    <Dialog v-model:visible="stockWarning.visible" :header="stockWarning.title" modal :style="{ width: '450px' }" :closable="true">
        <div class="flex items-center gap-4 py-4">
            <i class="pi pi-exclamation-triangle text-amber-500" style="font-size: 3rem"></i>
            <p class="whitespace-pre-line m-0 leading-relaxed">{{ stockWarning.message }}</p>
        </div>
        <template #footer>
            <Button label="Anladım" icon="pi pi-check" severity="warning" @click="stockWarning.visible = false" />
        </template>
    </Dialog>
</template>
