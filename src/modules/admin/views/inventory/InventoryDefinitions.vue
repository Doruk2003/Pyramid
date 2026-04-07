<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const lookupStore = useLookupStore();
const toast = useToast();
const confirm = useConfirm();

const dialogVisible = ref(false);
const dialogType = ref<'category' | 'brand' | 'type'>('category');
const dialogHeader = ref('');
const editMode = ref(false);
const currentId = ref('');
const itemName = ref('');

onMounted(async () => {
    await lookupStore.fetchAll();
});

const openNew = (type: 'category' | 'brand' | 'type') => {
    dialogType.value = type;
    dialogHeader.value = type === 'category' ? 'Yeni Kategori' : type === 'brand' ? 'Yeni Marka' : 'Yeni Ürün Tipi';
    editMode.value = false;
    currentId.value = '';
    itemName.value = '';
    dialogVisible.value = true;
};

const openEdit = (type: 'category' | 'brand' | 'type', item: any) => {
    dialogType.value = type;
    dialogHeader.value = type === 'category' ? 'Kategori Düzenle' : type === 'brand' ? 'Marka Düzenle' : 'Ürün Tipi Düzenle';
    editMode.value = true;
    currentId.value = item.id;
    itemName.value = item.name;
    dialogVisible.value = true;
};

const saveItem = async () => {
    if (!itemName.value.trim()) return;

    let result;
    if (editMode.value) {
        if (dialogType.value === 'category') result = await lookupStore.editCategory(currentId.value, itemName.value);
        else if (dialogType.value === 'brand') result = await lookupStore.editBrand(currentId.value, itemName.value);
        else result = await lookupStore.editProductType(currentId.value, itemName.value);
    } else {
        if (dialogType.value === 'category') result = await lookupStore.addCategory(itemName.value);
        else if (dialogType.value === 'brand') result = await lookupStore.addBrand(itemName.value);
        else result = await lookupStore.addProductType(itemName.value);
    }

    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'İşlem tamamlandı', life: 3000 });
        dialogVisible.value = false;
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'İşlem başarısız', life: 3000 });
    }
};

const deleteItem = (type: 'category' | 'brand' | 'type', item: any) => {
    confirm.require({
        message: `${item.name} kaydını silmek istediğinize emin misiniz?`,
        header: 'Silme Onayı',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: 'İptal', severity: 'secondary', outlined: true },
        acceptProps: { label: 'Sil', severity: 'danger' },
        accept: async () => {
            let result;
            if (type === 'category') result = await lookupStore.removeCategory(item.id);
            else if (type === 'brand') result = await lookupStore.removeBrand(item.id);
            else result = await lookupStore.removeProductType(item.id);

            if (result.success) {
                toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kayıt silindi', life: 3000 });
            } else {
                toast.add({ severity: 'error', summary: 'Hata', detail: 'Kayıt silinemedi (Kullanımda olabilir)', life: 3000 });
            }
        }
    });
};
</script>

<template>
    <div class="card">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <div class="m-0 font-medium text-2xl">Envanter Tanımları</div>
            <span class="text-surface-500">Kategori, Marka ve Ürün Tiplerini buradan yönetebilirsiniz.</span>
        </div>

        <Tabs value="0">
            <TabList>
                <Tab value="0">Kategoriler</Tab>
                <Tab value="1">Markalar</Tab>
                <Tab value="2">Ürün Tipleri</Tab>
            </TabList>
            <TabPanels>
                <!-- Kategoriler -->
                <TabPanel value="0">
                    <Toolbar class="mb-4">
                        <template #start>
                            <Button label="Yeni Kategori" icon="pi pi-plus" severity="success" class="mr-2" @click="openNew('category')" />
                        </template>
                    </Toolbar>
                    <DataTable :value="lookupStore.categories" :loading="lookupStore.loading" stripedRows paginator :rows="10">
                        <Column field="name" header="Kategori Adı" sortable></Column>
                        <Column header="İşlemler" style="width: 8rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="openEdit('category', slotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="deleteItem('category', slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- Markalar -->
                <TabPanel value="1">
                    <Toolbar class="mb-4">
                        <template #start>
                            <Button label="Yeni Marka" icon="pi pi-plus" severity="success" class="mr-2" @click="openNew('brand')" />
                        </template>
                    </Toolbar>
                    <DataTable :value="lookupStore.brands" :loading="lookupStore.loading" stripedRows paginator :rows="10">
                        <Column field="name" header="Marka Adı" sortable></Column>
                        <Column header="İşlemler" style="width: 8rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="openEdit('brand', slotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="deleteItem('brand', slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- Ürün Tipleri -->
                <TabPanel value="2">
                    <Toolbar class="mb-4">
                        <template #start>
                            <Button label="Yeni Ürün Tipi" icon="pi pi-plus" severity="success" class="mr-2" @click="openNew('type')" />
                        </template>
                    </Toolbar>
                    <DataTable :value="lookupStore.productTypes" :loading="lookupStore.loading" stripedRows paginator :rows="10">
                        <Column field="name" header="Tip Adı" sortable></Column>
                        <Column header="İşlemler" style="width: 8rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="openEdit('type', slotProps.data)" />
                                <Button icon="pi pi-trash" outlined rounded severity="danger" @click="deleteItem('type', slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
            </TabPanels>
        </Tabs>

        <Dialog v-model:visible="dialogVisible" :style="{ width: '450px' }" :header="dialogHeader" :modal="true" class="p-fluid">
            <div class="field">
                <label for="name" class="font-bold">Tanım Adı</label>
                <InputText id="name" v-model.trim="itemName" required="true" autofocus :class="{ 'p-invalid': !itemName.trim() }" />
                <small class="p-error" v-if="!itemName.trim()">İsim zorunludur.</small>
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="dialogVisible = false" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveItem" />
            </template>
        </Dialog>
    </div>
</template>
