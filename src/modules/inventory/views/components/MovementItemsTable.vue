<script setup lang="ts">
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { ref } from 'vue';

const props = defineProps<{
    lines: any[];
    warehouseId?: string;
    movementType: 'in' | 'out' | 'transfer' | 'adjustment';
}>();

const emit = defineEmits(['change']);

const productStore = useProductStore();
const invStore = useInventoryStore();

const productSelectRefs = ref<any[]>([]);
const setProductSelectRef = (el: any, index: number) => {
    if (el) productSelectRefs.value[index] = el;
};

function getStock(productId: string) {
    if (!productId || !props.warehouseId) return 0;
    return invStore.balances.find(b => b.productId === productId && b.warehouseId === props.warehouseId)?.balance || 0;
}

function onProductChange(line: any) {
    const product = productStore.products.find((p) => p.id === line.productId);
    if (product) {
        line.description = product.name;
    }
    emit('change');
}

function addLine() {
    props.lines.push({
        id: crypto.randomUUID(),
        productId: '',
        description: '',
        quantity: 1,
        unitCost: 0,
        note: ''
    });
    emit('change');
}

function removeLine(index: number) {
    props.lines.splice(index, 1);
    emit('change');
}

defineExpose({ addLine });
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center">
            <h6 class="font-normal m-0 uppercase tracking-wider text-sm text-surface-500">Hareket Kalemleri</h6>
            <Button label="Ürün Ekle" icon="pi pi-plus" text size="small" @click="addLine" />
        </div>

        <DataTable :value="lines" class="p-datatable-sm overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
            <Column header="Ürün" style="width: 35%">
                <template #body="slotProps">
                    <div class="flex flex-col gap-1">
                        <Select 
                            v-model="slotProps.data.productId" 
                            :options="productStore.products" 
                            optionLabel="name" 
                            optionValue="id" 
                            @change="onProductChange(slotProps.data)"
                            placeholder="Ürün Seçin"
                            filter 
                            fluid 
                        />
                        <div v-if="slotProps.data.productId && warehouseId" class="flex items-center gap-1.5 px-1">
                            <i class="pi pi-box text-[10px]" :class="getStock(slotProps.data.productId) > 0 ? 'text-green-500' : 'text-red-500'"></i>
                            <span class="text-[10px] font-medium" :class="getStock(slotProps.data.productId) > 0 ? 'text-green-600' : 'text-red-600'">
                                Mevcut Stok: {{ getStock(slotProps.data.productId) }}
                            </span>
                        </div>
                    </div>
                </template>
            </Column>

            <Column header="Miktar" style="width: 15%">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.quantity" :min="0.001" :maxFractionDigits="3" fluid @input="() => emit('change')" />
                </template>
            </Column>

            <Column v-if="movementType === 'in'" header="Birim Maliyet" style="width: 15%">
                <template #body="slotProps">
                    <InputNumber v-model="slotProps.data.unitCost" :min="0" :minFractionDigits="2" fluid @input="() => emit('change')" />
                </template>
            </Column>

            <Column header="Not" style="width: 30%">
                <template #body="slotProps">
                    <InputText v-model="slotProps.data.note" placeholder="..." fluid @input="() => emit('change')" />
                </template>
            </Column>

            <Column style="width: 5%">
                <template #body="slotProps">
                    <Button icon="pi pi-trash" severity="danger" text rounded @click="removeLine(slotProps.index)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
:deep(.p-datatable-thead > tr > th) {
    background-color: var(--p-surface-50);
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: var(--p-surface-600);
}

:deep(.p-datatable-tbody > tr > td) {
    padding: 0.75rem 1rem;
}
</style>
