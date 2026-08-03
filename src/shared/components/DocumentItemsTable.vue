<script setup lang="ts">
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { DocumentLogicService } from '@/shared/utils/document-logic.service';
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
    lines: any[];
    currency: string;
    exchangeRate: number;
    accountId?: string;
    warehouseId?: string;
    documentType: 'quote' | 'order' | 'invoice';
}>();

const emit = defineEmits(['update:lines', 'change', 'stock-check']);

const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const lookupStore = useLookupStore();
const exchangeRateStore = useExchangeRateStore();
const settingsStore = useSettingsStore();
const financeStore = useFinanceStore();

// Watch for account change to recalculate dealer discounts
watch(() => props.accountId, () => {
    if (props.lines.length > 0) {
        props.lines.forEach(line => {
            if (line.productId) {
                onProductChange(line);
            }
        });
    }
});

const taxRates = [
    { label: '%0', value: 0 },
    { label: '%1', value: 1 },
    { label: '%8', value: 8 },
    { label: '%10', value: 10 },
    { label: '%20', value: 20 }
];

const productSelectRefs = ref<any[]>([]);
const setProductSelectRef = (el: any, index: number) => {
    if (el) productSelectRefs.value[index] = el;
};

function convertLinePrice(line: any) {
    if (!line.originalPrice || !line.originalCurrency) return;
    const targetCurrency = props.currency || 'TRY';
    const targetRate = props.exchangeRate || 1;
    const productRate = exchangeRateStore.getRateByCode(line.originalCurrency);
    
    if (line.originalCurrency === targetCurrency) {
        line.unitPrice = line.originalPrice;
    } else {
        line.unitPrice = CurrencyConversionService.crossConvert(line.originalPrice, productRate, targetRate);
    }
}

function onProductChange(line: any) {
    const product = productStore.products.find((p) => p.id === line.productId);
    if (product) {
        line.originalPrice = product.price || 0;
        line.originalCurrency = lookupStore.currencies.find(c => c.id === product.currencyId)?.code || 'TRY';
        convertLinePrice(line);
        line.vatRate = product.taxRate || 20;
        line.description = line.description || product.name;

        // Apply Automatic Discounts
        const account = financeStore.accounts.find(a => a.id === props.accountId);
        if (account) {
            const category = lookupStore.categories.find(c => c.id === product.categoryId);
            const extendedProduct = { ...product.toObject(), categoryName: category?.name };
            const discountType = DocumentLogicService.getProductDiscount(extendedProduct, account, settingsStore.settings);
            const discounts = DocumentLogicService.applyAccountDealerDiscount(discountType, account);
            
            line.discountRate1 = discounts.d1;
            line.discountRate2 = discounts.d2;
            line.discountRate3 = discounts.d3;
        }
    }
    emit('change');
}

function addLine(autoOpenSelect = false) {
    const newLine = {
        id: crypto.randomUUID(),
        productId: '',
        warehouseId: props.warehouseId || '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        originalPrice: 0,
        originalCurrency: '',
        vatRate: 20,
        discountRate1: 0,
        discountRate2: 0,
        discountRate3: 0,
        lineTotal: 0,
        sortOrder: props.lines.length,
        // Document specific defaults
        orderedQuantity: 0,
        invoicedQuantity: 0,
        shippedQuantity: 0
    };
    
    emit('update:lines', [...props.lines, newLine]);

    if (autoOpenSelect) {
        nextTick(() => {
            const lastIndex = props.lines.length; // lines is not updated in props yet, but after nextTick it will be props.lines.length - 1 of new length
            const lastSelect = productSelectRefs.value[lastIndex];
            if (lastSelect) {
                if (lastSelect.show) lastSelect.show();
                else if (lastSelect.$el) lastSelect.$el.click();
            }
        });
    }
    emit('change');
}

function removeLine(index: number) {
    emit('update:lines', props.lines.filter((_, i) => i !== index));
    emit('change');
}

defineExpose({ addLine });
</script>

<template>
    <div>
        <div class="flex justify-between items-center mb-4">
            <h6 class="font-normal m-0 text-surface-900 dark:text-surface-0">Belge Kalemleri</h6>
            <Button label="Kalem Ekle" icon="pi pi-plus" text size="small" @click="() => addLine(true)" id="btnAddLine" />
        </div>
        <DataTable :value="lines" class="p-datatable-sm items-table" dataKey="id">
            <Column header="Ürün" style="width: 25%">
                <template #body="slotProps">
                    <div class="flex flex-col gap-1">
                        <Select :ref="(el) => setProductSelectRef(el, slotProps.index)" 
                                v-model="slotProps.data.productId" 
                                :options="productStore.products" 
                                optionLabel="name" optionValue="id" 
                                @change="() => { onProductChange(slotProps.data); emit('stock-check', slotProps.data); }" 
                                fluid filter />
                    </div>
                </template>
            </Column>
            
            <Column header="Depo" style="width: 10%">
                <template #body="slotProps">
                    <Select v-model="slotProps.data.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo" fluid />
                </template>
            </Column>

            <Column header="Miktar" style="width: 8%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.quantity" :min="0.001" :minFractionDigits="0" :maxFractionDigits="3" @input="() => emit('change')" @blur="() => emit('stock-check', slotProps.data)" fluid inputClass="text-right" />
                </template>
            </Column>

            <!-- Hook for specialized tracking (orderedQty, invoicedQty etc) -->
            <slot name="extra-columns"></slot>

            <Column header="Birim Fiyat" style="width: 10%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.unitPrice" :minFractionDigits="2" @input="() => emit('change')" fluid inputClass="text-right" />
                </template>
            </Column>

            <Column header="KDV %" style="width: 7%">
                <template #body="slotProps">
                    <Select v-model="slotProps.data.vatRate" :options="taxRates" optionLabel="label" optionValue="value" @change="() => emit('change')" fluid />
                </template>
            </Column>

            <Column :header="settingsStore.settings?.discountLabel1 || 'İnd.1'" style="width: 5%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.discountRate1" :min="0" :max="100" @input="() => emit('change')" fluid inputClass="text-right" />
                </template>
            </Column>

            <Column :header="settingsStore.settings?.discountLabel2 || 'İnd.2'" style="width: 5%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.discountRate2" :min="0" :max="100" @input="() => emit('change')" fluid inputClass="text-right" />
                </template>
            </Column>

            <Column :header="settingsStore.settings?.discountLabel3 || 'İnd.3'" style="width: 5%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.discountRate3" :min="0" :max="100" @input="() => emit('change')" fluid inputClass="text-right" />
                </template>
            </Column>

            <Column header="Toplam" style="width: 12%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputText :value="slotProps.data.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })" 
                                readonly fluid class="font-bold text-right" />
                </template>
            </Column>

            <Column style="width: 3%">
                <template #body="slotProps">
                    <Button icon="pi pi-trash" severity="danger" text rounded tabindex="-1" @click="removeLine(slotProps.index)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
.items-table :deep(.p-inputnumber-input) {
    padding: 0.5rem;
}
.items-table :deep(.p-select-label) {
    padding: 0.5rem;
}
</style>
