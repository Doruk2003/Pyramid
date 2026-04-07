<script setup lang="ts">
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { StockMovement, type MovementType } from '@/modules/inventory/domain/stock-movement.entity';
import { useAuthStore } from '@/core/auth/auth.store';
import { getErrorMessage } from '@/shared/utils/error';

const toast = useToast();
const router = useRouter();
const invStore = useInventoryStore();
const productStore = useProductStore();
const authStore = useAuthStore();

interface MovementForm {
    movementType: MovementType;
    productId: string;
    warehouseId: string;
    targetWarehouseId: string;
    quantity: number;
    note: string;
}

const movement = ref<MovementForm>({
    movementType: 'in',
    productId: '',
    warehouseId: '',
    targetWarehouseId: '',
    quantity: 1,
    note: ''
});

const submitted = ref(false);

const movementTypes = [
    { label: 'Giriş', value: 'in' },
    { label: 'Çıkış', value: 'out' },
    { label: 'Transfer', value: 'transfer' },
    { label: 'Düzeltme', value: 'adjustment' }
];

onMounted(async () => {
    invStore.fetchWarehouses();
    if (productStore.products.length === 0) productStore.fetchProducts();
});

async function saveMovement() {
    submitted.value = true;

    if (!movement.value.productId || !movement.value.warehouseId || !movement.value.quantity) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları doldurun', life: 3000 });
        return;
    }

    if (movement.value.movementType === 'transfer' && !movement.value.targetWarehouseId) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Hedef depo seçilmelidir', life: 3000 });
        return;
    }

    const companyId = authStore.user?.companyId || '';
    const userId = authStore.user?.id || '';

    let result;
    if (movement.value.movementType === 'transfer') {
        const outMovement = StockMovement.create({
            id: crypto.randomUUID(),
            companyId,
            productId: movement.value.productId,
            warehouseId: movement.value.warehouseId,
            movementType: 'out',
            quantity: movement.value.quantity,
            note: `Transfer (Hedef: ${invStore.warehouses.find((w) => w.id === movement.value.targetWarehouseId)?.name}) - ${movement.value.note}`,
            createdBy: userId,
            createdAt: new Date()
        });

        const inMovement = StockMovement.create({
            id: crypto.randomUUID(),
            companyId,
            productId: movement.value.productId,
            warehouseId: movement.value.targetWarehouseId,
            movementType: 'in',
            quantity: movement.value.quantity,
            note: `Transfer (Kaynak: ${invStore.warehouses.find((w) => w.id === movement.value.warehouseId)?.name}) - ${movement.value.note}`,
            createdBy: userId,
            createdAt: new Date()
        });

        result = await invStore.addMovements([outMovement, inMovement]);
    } else {
        const m = StockMovement.create({
            id: crypto.randomUUID(),
            companyId,
            productId: movement.value.productId,
            warehouseId: movement.value.warehouseId,
            movementType: movement.value.movementType,
            quantity: movement.value.quantity,
            note: movement.value.note,
            createdBy: userId,
            createdAt: new Date()
        });

        result = await invStore.addMovement(m);
    }

    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Hareket kaydedildi', life: 3000 });
        router.push('/inventory/movements');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/inventory/movements');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-6 min-h-32 flex flex-col gap-0">
            <div class="m-0 text-2xl font-medium">Yeni Stok Hareketi</div>
            <div class="text-surface-600 dark:text-surface-400">
                <p>Ürün giriş, çıkış veya depolar arası transfer işlemlerini buradan gerçekleştirebilirsiniz.</p>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="movementType" class="block font-bold mb-3">Hareket Tipi</label>
                            <Select id="movementType" v-model="movement.movementType" :options="movementTypes" optionLabel="label" optionValue="value" placeholder="Tip Seçin" fluid />
                        </div>

                        <div>
                            <label for="product" class="block font-bold mb-3">Ürün</label>
                            <Select id="product" v-model="movement.productId" :options="productStore.products" optionLabel="name" optionValue="id" placeholder="Ürün Seçin" filter fluid />
                            <small v-if="submitted && !movement.productId" class="text-red-500">Ürün seçimi zorunludur.</small>
                        </div>

                        <div>
                            <label for="warehouse" class="block font-bold mb-3">
                                {{ movement.movementType === 'transfer' ? 'Kaynak Depo' : 'Depo' }}
                            </label>
                            <Select id="warehouse" v-model="movement.warehouseId" :options="invStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                            <small v-if="submitted && !movement.warehouseId" class="text-red-500">Depo seçimi zorunludur.</small>
                        </div>

                        <div v-if="movement.movementType === 'transfer'">
                            <label for="targetWarehouse" class="block font-bold mb-3">Hedef Depo</label>
                            <Select id="targetWarehouse" v-model="movement.targetWarehouseId" :options="invStore.warehouses" optionLabel="name" optionValue="id" placeholder="Hedef Depo Seçin" fluid />
                            <small v-if="submitted && movement.movementType === 'transfer' && !movement.targetWarehouseId" class="text-red-500">Hedef depo seçimi zorunludur.</small>
                        </div>

                        <div>
                            <label for="quantity" class="block font-bold mb-3">Miktar</label>
                            <InputNumber id="quantity" v-model="movement.quantity" :min="1" fluid />
                            <small v-if="submitted && !movement.quantity" class="text-red-500">Miktar zorunludur.</small>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        <div class="md:col-span-2 lg:col-span-2">
                            <label for="note" class="block font-bold mb-3">Not</label>
                            <Textarea id="note" v-model="movement.note" rows="3" fluid />
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Kaydet" icon="pi pi-check" class="w-full" @click="saveMovement" />
                </div>
            </div>
        </div>
    </div>
</template>


