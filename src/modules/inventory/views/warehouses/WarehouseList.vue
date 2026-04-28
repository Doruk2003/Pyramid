<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { Warehouse, type WarehouseProps } from '@/modules/inventory/domain/warehouse.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const invStore = useInventoryStore();
const authStore = useAuthStore();
const toast = useToast();

const warehouseDialog = ref(false);
const deleteDialog = ref(false);
const warehouseToDelete = ref<Warehouse | null>(null);

const menu = ref();
const actionTarget = ref<Warehouse | null>(null);

const menuItems = computed(() => [
    {
        label: 'Düzenle',
        command: () => {
            if (actionTarget.value) editWarehouse(actionTarget.value as Warehouse);
        }
    },
    {
        label: 'Sil',
        command: () => {
            if (actionTarget.value) confirmDelete(actionTarget.value as Warehouse);
        }
    }
]);

const onActionClick = (event: any, w: Warehouse) => {
    actionTarget.value = w;
    menu.value.toggle(event);
};
type WarehouseForm = Partial<WarehouseProps>;
const warehouse = ref<WarehouseForm>({});
const submitted = ref(false);
const showFilters = ref(false);

interface WarehouseFilterForm {
    name: string;
    location: string;
    isActive: boolean | null;
}

const filterForm = ref<WarehouseFilterForm>({
    name: '',
    location: '',
    isActive: null
});

const activeFilters = ref<WarehouseFilterForm>({ ...filterForm.value });

const statusOptions = [
    { label: 'Aktif', value: true },
    { label: 'Pasif', value: false }
];

onMounted(async () => {
    try {
        await invStore.fetchWarehouses();
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Depolar yüklenirken bir sorun oluştu', life: 3000 });
    }
});

function openNew() {
    warehouse.value = { isActive: true };
    submitted.value = false;
    warehouseDialog.value = true;
}

function editWarehouse(w: Warehouse) {
    warehouse.value = w.toObject();
    warehouseDialog.value = true;
}

async function saveWarehouse() {
    submitted.value = true;
    if (!warehouse.value.name?.trim()) return;

    const w = Warehouse.create({
        id: warehouse.value.id || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        name: warehouse.value.name.trim(),
        location: warehouse.value.location,
        isActive: warehouse.value.isActive ?? true,
        createdAt: warehouse.value.createdAt || new Date()
    });

    const result = await invStore.addWarehouse(w);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Depo kaydedildi', life: 3000 });
        warehouseDialog.value = false;
        await invStore.fetchWarehouses();
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function confirmDelete(w: Warehouse) {
    warehouseToDelete.value = w;
    deleteDialog.value = true;
}

async function deleteWarehouse() {
    if (!warehouseToDelete.value?.id) return;
    const result = await invStore.deleteWarehouse(warehouseToDelete.value.id);
    deleteDialog.value = false;
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Silindi', detail: 'Depo başarıyla silindi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
    warehouseToDelete.value = null;
}

const filteredWarehouses = computed(() => {
    let list = invStore.warehouses ?? [];
    const filters = activeFilters.value;

    if (filters.name) {
        const query = filters.name.toLowerCase();
        list = list.filter((item) => (item.name || '').toLowerCase().includes(query));
    }
    if (filters.location) {
        const query = filters.location.toLowerCase();
        list = list.filter((item) => (item.location || '').toLowerCase().includes(query));
    }
    if (filters.isActive !== null) {
        list = list.filter((item) => item.isActive === filters.isActive);
    }

    return list;
});

function toggleFilters() {
    showFilters.value = !showFilters.value;
}

function applyFilters() {
    activeFilters.value = { ...filterForm.value };
}

function clearFilters() {
    filterForm.value = {
        name: '',
        location: '',
        isActive: null
    };
    activeFilters.value = { ...filterForm.value };
}
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Depo Yönetimi</div>
            </div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Depo" icon="pi pi-plus" severity="primary" @click="openNew" />
                </template>
                <template #end>
                    <Button  icon="pi pi-filter" severity="secondary"  v-tooltip.bottom="'Filtreleri Aç/Kapa'" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.name" placeholder="Depo Adı" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.location" placeholder="Konum" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.isActive" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Durum" fluid />
                </div>
                <div class="col-span-1 flex items-end">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                </div>
                <div class="col-span-1 flex items-end">
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <div class="card">
            <DataTable :value="filteredWarehouses" dataKey="id" :paginator="true" :rows="10"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Gösterilen {first} - {last} / {totalRecords} depo"
            >
                <Column field="name" header="Depo Adı" sortable></Column>
                <Column field="location" header="Konum" sortable></Column>
                <Column field="isActive" header="Durum" sortable>
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.isActive ? 'success' : 'secondary'" :value="slotProps.data.isActive ? 'Aktif' : 'Pasif'" />
                    </template>
                </Column>
                <Column header="İşlemler" style="min-width: 50px">
                    <template #body="slotProps">
                        <Button icon="pi pi-ellipsis-v" text rounded @click="onActionClick($event, slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="warehouseDialog" :style="{ width: '450px' }" header="Depo Detayları" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Depo Adı</label>
                    <InputText id="name" v-model.trim="warehouse.name" required="true" autofocus :invalid="submitted && !warehouse.name" fluid />
                    <small v-if="submitted && !warehouse.name" class="text-red-500">Ad zorunludur.</small>
                </div>
                <div>
                    <label for="location" class="block font-bold mb-3">Konum</label>
                    <InputText id="location" v-model.trim="warehouse.location" fluid />
                </div>
                <div>
                    <label class="block font-bold mb-3">Durum</label>
                    <div class="flex items-center gap-4">
                        <div class="flex items-center">
                            <RadioButton v-model="warehouse.isActive" inputId="active" name="status" :value="true" />
                            <label for="active" class="ml-2">Aktif</label>
                        </div>
                        <div class="flex items-center">
                            <RadioButton v-model="warehouse.isActive" inputId="passive" name="status" :value="false" />
                            <label for="passive" class="ml-2">Pasif</label>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="warehouseDialog = false" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveWarehouse" />
            </template>
        </Dialog>

        <!-- Silme Onay Dialogu -->
        <Dialog
            v-model:visible="deleteDialog"
            :style="{ width: '420px' }"
            header="Depo Silme Onayı"
            :modal="true"
        >
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-4xl text-orange-500" />
                <div>
                    <p class="font-semibold mb-1">Bu depoyu silmek istediğinizden emin misiniz?</p>
                    <p class="text-surface-600 dark:text-surface-400 text-sm">
                        <strong>{{ warehouseToDelete?.name }}</strong> deposu soft-delete ile işaretlenecek.
                        Stok hareketleri ve geçmiş kayıtlar korunacaktır.
                    </p>
                </div>
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="deleteDialog = false" />
                <Button label="Evet, Sil" icon="pi pi-trash" severity="danger" @click="deleteWarehouse" />
            </template>
        </Dialog>
        <Menu ref="menu" :model="menuItems" :popup="true" />
    </div>
</template>