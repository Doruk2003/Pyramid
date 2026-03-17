<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { Warehouse, type WarehouseProps } from '@/modules/inventory/domain/warehouse.entity';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const invStore = useInventoryStore();
const authStore = useAuthStore();
const toast = useToast();

const warehouseDialog = ref(false);
type WarehouseForm = Partial<WarehouseProps>;
const warehouse = ref<WarehouseForm>({});
const submitted = ref(false);

onMounted(() => {
    invStore.fetchWarehouses();
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
        isActive: warehouse.value.isActive,
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
</script>

<template>
    <div class="card">
        <Toolbar class="mb-6">
            <template #start>
                <Button label="Yeni Depo" icon="pi pi-plus" severity="secondary" @click="openNew" />
            </template>
        </Toolbar>

        <h4 class="m-0 mb-4">Depo Yönetimi</h4>
        <DataTable :value="invStore.warehouses" dataKey="id" :paginator="true" :rows="10">
            <Column field="name" header="Depo Adı" sortable></Column>
            <Column field="location" header="Konum" sortable></Column>
            <Column field="isActive" header="Durum" sortable>
                <template #body="slotProps">
                    <Tag :severity="slotProps.data.isActive ? 'success' : 'secondary'" :value="slotProps.data.isActive ? 'Aktif' : 'Pasif'" />
                </template>
            </Column>
            <Column header="İşlemler">
                <template #body="slotProps">
                    <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editWarehouse(slotProps.data)" />
                </template>
            </Column>
        </DataTable>

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
    </div>
</template>
