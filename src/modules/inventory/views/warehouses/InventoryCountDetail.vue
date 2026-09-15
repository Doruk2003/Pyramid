<script setup lang="ts">
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { SupabaseInventoryRepository } from '@/modules/inventory/infra/supabase-inventory.repository';
import type { InventoryCount, InventoryCountItemProps } from '@/modules/inventory/domain/inventory-count.entity';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const invStore = useInventoryStore();
const productStore = useProductStore();
const authStore = useAuthStore();
const invRepo = new SupabaseInventoryRepository();
const toast = useToast();
const confirm = useConfirm();

const count = ref<InventoryCount | null>(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const notFound = ref(false);

// Düzenleme modu: her kalemin countedQty'si burada tutulur
const editMode = ref(false);
const editedQtys = ref<Record<string, number>>({});

onMounted(async () => {
    const id = route.params.id as string;
    await Promise.all([
        invStore.fetchWarehouses(),
        productStore.fetchProducts()
    ]);
    const result = await invRepo.getInventoryCountById(id);
    loading.value = false;
    if (!result.success || !result.data) {
        notFound.value = true;
        return;
    }
    count.value = result.data;
});

function getWarehouseName(id: string) {
    return invStore.warehouses.find(w => w.id === id)?.name || '—';
}
function getProductName(id: string) {
    return productStore.products.find(p => p.id === id)?.name || '—';
}
function getProductCode(id: string) {
    return productStore.products.find(p => p.id === id)?.code || '—';
}

const items = computed(() => count.value?.items ?? []);

const editedItems = computed<InventoryCountItemProps[]>(() =>
    items.value.map(item => ({
        ...item,
        countedQty: editMode.value ? (editedQtys.value[item.id] ?? item.countedQty) : item.countedQty,
        difference: (editMode.value ? (editedQtys.value[item.id] ?? item.countedQty) : item.countedQty) - item.systemQty
    }))
);

const displayItems = computed(() => editMode.value ? editedItems.value : items.value);

const stats = computed(() => {
    const list = displayItems.value;
    return {
        total: list.length,
        positive: list.filter(i => i.difference > 0).length,
        negative: list.filter(i => i.difference < 0).length,
        totalDiff: list.reduce((s, i) => s + Math.abs(i.difference), 0)
    };
});

function startEdit() {
    // Mevcut değerleri edit map'e kopyala
    editedQtys.value = {};
    items.value.forEach(item => {
        editedQtys.value[item.id] = item.countedQty;
    });
    editMode.value = true;
}

function cancelEdit() {
    editMode.value = false;
    editedQtys.value = {};
}

async function saveEdit() {
    if (!count.value) return;
    saving.value = true;

    const updatedItems: InventoryCountItemProps[] = items.value.map(item => ({
        ...item,
        countedQty: editedQtys.value[item.id] ?? item.countedQty,
        difference: (editedQtys.value[item.id] ?? item.countedQty) - item.systemQty
    }));

    const result = await invRepo.updateInventoryCount(
        count.value.id,
        count.value.companyId,
        count.value.warehouseId,
        authStore.user?.id || '',
        updatedItems
    );

    saving.value = false;

    if (!result.success) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Sayım güncellenemedi.', life: 4000 });
        return;
    }

    // Yerel state'i güncelle — sayfayı yeniden yüklemeden
    const refreshed = await invRepo.getInventoryCountById(count.value.id);
    if (refreshed.success && refreshed.data) count.value = refreshed.data;

    editMode.value = false;
    editedQtys.value = {};
    toast.add({ severity: 'success', summary: 'Kaydedildi', detail: 'Sayım ve stok hareketleri güncellendi.', life: 3000 });
}

function confirmDelete() {
    confirm.require({
        message: 'Bu sayım kaydı ve bağlı tüm stok hareketleri kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
        header: 'Sayımı Sil',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'İptal',
        acceptLabel: 'Evet, Sil',
        acceptClass: 'p-button-danger',
        accept: doDelete
    });
}

async function doDelete() {
    if (!count.value) return;
    deleting.value = true;
    const result = await invRepo.deleteInventoryCount(count.value.id);
    deleting.value = false;

    if (!result.success) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Sayım silinemedi.', life: 4000 });
        return;
    }

    toast.add({ severity: 'success', summary: 'Silindi', detail: 'Sayım ve stok hareketleri silindi.', life: 3000 });
    router.push('/inventory/movements');
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Loading -->
        <div v-if="loading" class="card flex items-center justify-center py-20">
            <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
        </div>

        <!-- Not Found -->
        <div v-else-if="notFound" class="card flex flex-col items-center justify-center py-20 text-surface-400">
            <i class="pi pi-exclamation-triangle text-6xl mb-4 text-orange-400"></i>
            <p class="text-xl font-semibold">Sayım kaydı bulunamadı</p>
            <Button label="Geri Dön" icon="pi pi-arrow-left" severity="secondary" class="mt-4" @click="router.back()" />
        </div>

        <template v-else-if="count">
            <!-- Başlık -->
            <div class="card flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <i class="pi pi-calculator text-2xl text-primary"></i>
                        <h1 class="text-2xl font-bold m-0">Envanter Sayım Detayı</h1>
                        <Tag v-if="editMode" value="Düzenleme Modu" severity="warn" icon="pi pi-pencil" />
                    </div>
                    <div class="text-surface-500 text-sm mt-2 flex flex-wrap gap-4">
                        <span class="flex items-center gap-1">
                            <i class="pi pi-building text-xs"></i>
                            {{ getWarehouseName(count.warehouseId) }}
                        </span>
                        <span class="flex items-center gap-1">
                            <i class="pi pi-calendar text-xs"></i>
                            {{ count.countedAt.toLocaleString('tr-TR') }}
                        </span>
                        <span class="flex items-center gap-1 font-mono text-xs bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">
                            #{{ count.id.slice(0, 8).toUpperCase() }}
                        </span>
                    </div>
                </div>

                <!-- Eylem butonları -->
                <div class="flex items-center gap-2">
                    <!-- Normal mod -->
                    <template v-if="!editMode">
                        <Button
                            label="Düzenle"
                            icon="pi pi-pencil"
                            severity="secondary"
                            outlined
                            @click="startEdit"
                        />
                        <Button
                            label="Sayımı Sil"
                            icon="pi pi-trash"
                            severity="danger"
                            outlined
                            :loading="deleting"
                            @click="confirmDelete"
                        />
                        <Button label="Geri" icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
                    </template>

                    <!-- Düzenleme modu -->
                    <template v-else>
                        <Button
                            label="İptal"
                            icon="pi pi-times"
                            severity="secondary"
                            outlined
                            @click="cancelEdit"
                        />
                        <Button
                            label="Değişiklikleri Kaydet"
                            icon="pi pi-check"
                            severity="primary"
                            :loading="saving"
                            @click="saveEdit"
                        />
                    </template>
                </div>
            </div>

            <!-- Düzenleme modu uyarısı -->
            <div v-if="editMode" class="card p-4 border border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700 flex items-start gap-3">
                <i class="pi pi-info-circle text-amber-500 text-xl mt-0.5"></i>
                <div>
                    <p class="font-semibold text-amber-700 dark:text-amber-400 m-0">Düzenleme Modu Aktif</p>
                    <p class="text-sm text-amber-600 dark:text-amber-500 m-0 mt-1">
                        "Sayılan Miktar" sütunundaki değerleri değiştirin. Kaydettiğinizde eski stok hareketleri silinecek
                        ve yeni değerlere göre yeniden oluşturulacak.
                    </p>
                </div>
            </div>

            <!-- Özet kartlar -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="card p-4 flex items-center gap-3 border-l-4 border-surface-300 dark:border-surface-600">
                    <div class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <i class="pi pi-list text-surface-500"></i>
                    </div>
                    <div>
                        <div class="text-2xl font-bold">{{ stats.total }}</div>
                        <div class="text-xs text-surface-500">Farklı Kalem</div>
                    </div>
                </div>
                <div class="card p-4 flex items-center gap-3 border-l-4 border-green-400">
                    <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <i class="pi pi-arrow-up text-green-500"></i>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats.positive }}</div>
                        <div class="text-xs text-surface-500">Fazla Sayılan</div>
                    </div>
                </div>
                <div class="card p-4 flex items-center gap-3 border-l-4 border-red-400">
                    <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <i class="pi pi-arrow-down text-red-500"></i>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-red-600 dark:text-red-400">{{ stats.negative }}</div>
                        <div class="text-xs text-surface-500">Eksik Sayılan</div>
                    </div>
                </div>
                <div class="card p-4 flex items-center gap-3 border-l-4 border-amber-400">
                    <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <i class="pi pi-equals text-amber-500"></i>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ stats.totalDiff }}</div>
                        <div class="text-xs text-surface-500">Toplam Fark</div>
                    </div>
                </div>
            </div>

            <!-- Kalem tablosu -->
            <div class="card p-0 dt-compact">
                <DataTable
                    :value="displayItems"
                    dataKey="id"
                    :paginator="true"
                    :rows="25"
                    :rowsPerPageOptions="[25, 50]"
                    sortField="difference"
                    :sortOrder="-1"
                    size="small"
                    stripedRows
                    emptyMessage="Kayıtlı kalem bulunamadı."
                >
                    <Column header="Ürün Kodu" style="min-width: 110px">
                        <template #body="{ data }">
                            <span class="font-mono text-xs font-semibold text-surface-500">
                                {{ getProductCode(data.productId) }}
                            </span>
                        </template>
                    </Column>
                    <Column header="Ürün Adı" style="min-width: 200px">
                        <template #body="{ data }">
                            <span class="font-medium">{{ getProductName(data.productId) }}</span>
                        </template>
                    </Column>
                    <Column header="Sistem Stoğu" style="min-width: 110px" headerClass="text-right" bodyClass="text-right">
                        <template #body="{ data }">
                            <span class="font-mono text-surface-500">{{ data.systemQty }}</span>
                        </template>
                    </Column>
                    <Column header="Sayılan Miktar" style="min-width: 140px" headerClass="text-right" bodyClass="text-right">
                        <template #body="{ data }">
                            <!-- Düzenleme modunda: input -->
                            <InputNumber
                                v-if="editMode"
                                v-model="editedQtys[data.id]"
                                :min="0"
                                inputClass="text-right font-bold w-24 border-2 border-primary/30 focus:border-primary"
                                size="small"
                            />
                            <!-- Normal mod: değer -->
                            <span v-else class="font-mono font-semibold">{{ data.countedQty }}</span>
                        </template>
                    </Column>
                    <Column field="difference" header="Fark" sortable style="min-width: 90px" headerClass="text-right" bodyClass="text-right">
                        <template #body="{ data }">
                            <span :class="[
                                'font-bold font-mono',
                                data.difference > 0 ? 'text-green-600 dark:text-green-400' :
                                data.difference < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-surface-400'
                            ]">
                                {{ data.difference > 0 ? '+' : '' }}{{ data.difference }}
                            </span>
                        </template>
                    </Column>
                    <Column header="Durum" style="min-width: 100px">
                        <template #body="{ data }">
                            <Tag v-if="data.difference > 0" value="Fazla" severity="success" />
                            <Tag v-else-if="data.difference < 0" value="Eksik" severity="danger" />
                            <Tag v-else value="Eşit" severity="secondary" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </template>
    </div>
</template>
