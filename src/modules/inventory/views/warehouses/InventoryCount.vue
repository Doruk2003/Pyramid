<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { StockMovement } from '@/modules/inventory/domain/stock-movement.entity';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const invStore = useInventoryStore();
const productStore = useProductStore();
const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();

const selectedWarehouseId = ref<string>('');
const countData = ref<Record<string, number>>({});
const loading = ref(false);
const submitted = ref(false);

onMounted(async () => {
    loading.value = true;
    await Promise.all([
        invStore.fetchWarehouses(),
        productStore.fetchProducts(),
        invStore.fetchBalances()
    ]);
    loading.value = false;
});

const warehouseBalances = computed(() => {
    if (!selectedWarehouseId.value) return {};
    const map: Record<string, number> = {};
    invStore.balances
        .filter(b => b.warehouseId === selectedWarehouseId.value)
        .forEach(b => {
            map[b.productId] = b.balance;
        });
    return map;
});

const productsToCount = computed(() => {
    return productStore.products.filter(p => p.inventoryStatus === 'TRACKED');
});

watch(selectedWarehouseId, () => {
    countData.value = {};
    productsToCount.value.forEach(p => {
        countData.value[p.id] = warehouseBalances.value[p.id] || 0;
    });
});

function getDifference(productId: string) {
    const system = warehouseBalances.value[productId] || 0;
    const counted = countData.value[productId] || 0;
    return counted - system;
}

async function saveCount() {
    if (!selectedWarehouseId.value) {
        toast.add({ severity: 'warn', summary: 'Hata', detail: 'Lütfen sayım yapılacak depoyu seçin' });
        return;
    }

    submitted.value = true;
    const movements: StockMovement[] = [];
    const now = new Date();

    Object.keys(countData.value).forEach(productId => {
        const diff = getDifference(productId);
        if (diff !== 0) {
            movements.push(StockMovement.create({
                id: crypto.randomUUID(),
                companyId: authStore.user?.companyId || '',
                productId: productId,
                warehouseId: selectedWarehouseId.value,
                movementType: diff > 0 ? 'in' : 'out',
                quantity: Math.abs(diff),
                referenceType: 'adjustment',
                note: `Envanter Sayım Farkı (Sistem: ${warehouseBalances.value[productId] || 0}, Sayılan: ${countData.value[productId]})`,
                createdBy: authStore.user?.id || '',
                createdAt: now
            }));
        }
    });

    if (movements.length === 0) {
        toast.add({ severity: 'info', summary: 'Bilgi', detail: 'Herhangi bir fark bulunamadı.' });
        return;
    }

    const result = await invStore.addMovements(movements);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: `${movements.length} kalem için stok düzeltmesi yapıldı.` });
        router.push('/inventory/movements');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Düzeltme kaydedilemedi.' });
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="card flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold m-0 text-surface-900 dark:text-surface-0">Stok Sayımı ve Denkleştirme</h1>
                <p class="text-surface-500 mt-1">Fiziksel stok miktarlarını girerek sistem bakiyelerini eşitleyebilirsiniz.</p>
            </div>
            <div class="flex gap-2">
                <Button label="İptal" icon="pi pi-times" severity="secondary" outlined @click="router.back()" />
                <Button label="Sayımı Onayla ve Kaydet" icon="pi pi-check" severity="primary" @click="saveCount" :loading="loading" />
            </div>
        </div>

        <div class="card">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-surface-50 dark:bg-surface-900 px-6 py-8 rounded-2xl border border-surface-200 dark:border-surface-700">
                <div>
                    <label class="block font-bold mb-3 text-lg">Sayım Yapılacak Depo</label>
                    <Select 
                        v-model="selectedWarehouseId" 
                        :options="invStore.warehouses" 
                        optionLabel="name" 
                        optionValue="id" 
                        placeholder="Depo Seçiniz" 
                        fluid 
                        class="p-4 bg-white dark:bg-surface-800"
                    />
                </div>
                <div v-if="selectedWarehouseId" class="flex flex-col justify-center">
                    <span class="text-surface-500 uppercase text-xs font-black tracking-widest mb-1">Toplam Kalem</span>
                    <span class="text-3xl font-black text-primary">{{ productsToCount.length }}</span>
                </div>
                <div v-if="selectedWarehouseId" class="flex flex-col justify-center">
                    <span class="text-surface-500 uppercase text-xs font-black tracking-widest mb-1">Farklı Kalemler</span>
                    <span class="text-3xl font-black text-orange-500">
                        {{ Object.keys(countData).filter(id => getDifference(id) !== 0).length }}
                    </span>
                </div>
            </div>

            <div v-if="!selectedWarehouseId" class="flex flex-col items-center justify-center py-20 text-surface-400">
                <i class="pi pi-building text-6xl mb-4 opacity-20"></i>
                <p class="text-xl">Sayım başlatmak için yukarıdan bir depo seçiniz.</p>
            </div>

            <DataTable v-else :value="productsToCount" class="p-datatable-lg" :rows="50" scrollable scrollHeight="600px">
                <Column field="code" header="Ürün Kodu" style="width: 15%"></Column>
                <Column field="name" header="Ürün Adı" style="width: 30%"></Column>
                <Column header="Sistem Stoğu" style="width: 15%" headerClass="text-right" bodyClass="text-right">
                    <template #body="slotProps">
                        <span class="font-mono text-lg text-surface-500">
                            {{ warehouseBalances[slotProps.data.id] || 0 }}
                        </span>
                    </template>
                </Column>
                <Column header="Sayılan Miktar" style="width: 20%" headerClass="text-center" bodyClass="text-center">
                    <template #body="slotProps">
                        <InputNumber 
                            v-model="countData[slotProps.data.id]" 
                            :min="0" 
                            size="large"
                            inputClass="text-center font-bold text-xl w-32 border-2 border-primary/20 focus:border-primary"
                        />
                    </template>
                </Column>
                <Column header="Fark" style="width: 20%" headerClass="text-right" bodyClass="text-right">
                    <template #body="slotProps">
                        <div class="flex items-center justify-end gap-2 text-lg font-black">
                            <span v-if="getDifference(slotProps.data.id) > 0" class="text-green-500">
                                +{{ getDifference(slotProps.data.id) }}
                            </span>
                            <span v-else-if="getDifference(slotProps.data.id) < 0" class="text-red-500">
                                {{ getDifference(slotProps.data.id) }}
                            </span>
                            <span v-else class="text-surface-300">0</span>
                            
                            <i v-if="getDifference(slotProps.data.id) !== 0" 
                               :class="getDifference(slotProps.data.id) > 0 ? 'pi pi-arrow-up text-green-500' : 'pi pi-arrow-down text-red-500'" 
                               class="text-sm">
                            </i>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<style scoped>
:deep(.p-datatable-tbody > tr) {
    transition: background-color 0.2s;
}
:deep(.p-datatable-tbody > tr:hover) {
    background-color: var(--p-surface-50) !important;
}
</style>
