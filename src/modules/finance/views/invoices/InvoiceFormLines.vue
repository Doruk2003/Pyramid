<script setup lang="ts">
// Fatura kalem tablosu — parent'ın state'ini prop olarak alır,
// iç product select ref'lerini kendi yönetir.
import type { InvoiceLineForm } from './invoice-form.types';
import { nextTick, ref } from 'vue';

interface Props {
    lines: InvoiceLineForm[];
    warehouses: Array<{ id: string; name: string }>;
    products: Array<{ id: string; name: string }>;
    taxRates: Array<{ label: string; value: number }>;
    discountLabel1: string;
    discountLabel2: string;
    discountLabel3: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'remove-line': [index: number];
    'product-changed': [line: InvoiceLineForm];
    'quantity-blurred': [line: InvoiceLineForm];
}>();

// Ürün seçim dropdown'larına referans (satır bazlı)
const productSelectRefs = ref<Array<{ show?: () => void; $el?: HTMLElement } | null>>([]);

function setProductSelectRef(el: unknown, index: number) {
    if (el) {
        productSelectRefs.value[index] = el as { show?: () => void; $el?: HTMLElement };
    }
}

// Üst bileşen addLine() çağrıldıktan sonra bu metodu çağırarak
// yeni eklenen satırın ürün dropdown'ını otomatik açar.
function openLastProductSelect() {
    nextTick(() => {
        const lastIndex = props.lines.length - 1;
        const lastSelect = productSelectRefs.value[lastIndex];
        if (!lastSelect) return;
        if (lastSelect.show) {
            lastSelect.show();
        } else if (lastSelect.$el) {
            lastSelect.$el.click();
        }
    });
}

function focusAddLineButton() {
    const btn = document.getElementById('btnAddLine');
    if (btn) btn.focus();
}

defineExpose({ openLastProductSelect });
</script>

<template>
    <div>
        <div class="flex justify-between items-center mb-4">
            <h6 class="font-normal m-0">Fatura Kalemleri</h6>
            <slot name="add-button" />
        </div>

        <DataTable :value="lines" class="p-datatable-sm">
            <Column header="Ürün" style="width: 25%">
                <template #body="slotProps">
                    <Select
                        :ref="(el) => setProductSelectRef(el, slotProps.index)"
                        v-model="slotProps.data.productId"
                        :options="products"
                        optionLabel="name"
                        optionValue="id"
                        @change="emit('product-changed', slotProps.data)"
                        fluid
                        filter
                    />
                </template>
            </Column>
            <Column header="Depo" style="width: 8%">
                <template #body="slotProps">
                    <Select
                        v-model="slotProps.data.warehouseId"
                        :options="warehouses"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Depo"
                        fluid
                    />
                </template>
            </Column>
            <Column header="Miktar" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber
                        v-model="slotProps.data.quantity"
                        :min="1"
                        fluid
                        inputClass="text-right"
                        @blur="emit('quantity-blurred', slotProps.data)"
                    />
                </template>
            </Column>
            <Column header="Birim Fiyat" style="width: 8%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.unitPrice" :minFractionDigits="2" fluid inputClass="text-right" />
                </template>
            </Column>
            <Column header="Döviz" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputText :value="slotProps.data.originalCurrency || '-'" readonly fluid class="text-right" />
                </template>
            </Column>
            <Column header="KDV %" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <Select v-model="slotProps.data.vatRate" :options="taxRates" optionLabel="label" optionValue="value" fluid />
                </template>
            </Column>
            <Column :header="discountLabel1 || 'İskonto 1'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.discountRate1" :min="0" :max="100" fluid inputClass="text-right" />
                </template>
            </Column>
            <Column :header="discountLabel2 || 'İskonto 2'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.discountRate2" :min="0" :max="100" fluid inputClass="text-right" />
                </template>
            </Column>
            <Column :header="discountLabel3 || 'İskonto 3'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.discountRate3" :min="0" :max="100" fluid inputClass="text-right" />
                </template>
            </Column>
            <Column header="Toplam" style="width: 10%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                <template #body="slotProps">
                    <InputText
                        :value="slotProps.data.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })"
                        readonly
                        fluid
                        class="font-bold text-right"
                        @keydown.tab.exact.prevent="focusAddLineButton"
                    />
                </template>
            </Column>
            <Column style="width: 1%">
                <template #body="slotProps">
                    <Button icon="pi pi-trash" severity="danger" text rounded tabindex="-1" @click="emit('remove-line', slotProps.index)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
