<script setup lang="ts">
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';

const router = useRouter();
const productStore = useProductStore();
const lookupStore = useLookupStore();
const toast = useToast();

const dt = ref();
const deleteProductDialog = ref(false);
const deleteProductsDialog = ref(false);
const categoryDialog = ref(false);
const brandDialog = ref(false);
const typeDialog = ref(false);
const product = ref<any>({});
const selectedProducts = ref<any[]>([]);
const newCategoryName = ref('');
const newBrandName = ref('');
const newTypeName = ref('');
const imageFiles = ref<any[]>([]);
const imageUploading = ref(false);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const showFilters = ref(false);

const filterForm = ref<any>({
    name: '',
    barcode: '',
    category_id: null,
    type_id: null,
    brand_id: null,
    status: null
});

const activeFilters = ref<any>({ ...filterForm.value });
const submitted = ref(false);

const statuses = ref([
    { label: 'Stok Takibi Evet', value: 'TRACKED' },
    { label: 'Stok Takibi Hayır', value: 'UNTRACKED' }
]);

const productStatuses = ref([
    { label: 'Aktif', value: 'ACTIVE' },
    { label: 'Pasif', value: 'PASSIVE' }
]);

const taxRates = ref([
    { label: '%0', value: 0 },
    { label: '%1', value: 1 },
    { label: '%8', value: 8 },
    { label: '%20', value: 20 },
    { label: '%25', value: 25 }
]);

const priceUnits = ref([
    { label: 'Adet', value: 'pcs' },
    { label: 'Paket', value: 'pack' },
    { label: 'Koli', value: 'carton' },
    { label: 'Palet', value: 'pallet' },
    { label: 'Kg', value: 'kg' },
    { label: 'Ton', value: 'ton' },
    { label: 'Lt', value: 'lt' },
    { label: 'Metre', value: 'm' },
    { label: 'Metrekare', value: 'm2' },
    { label: 'Metreküp', value: 'm3' },
    { label: 'Set', value: 'set' },
    { label: 'Kutu', value: 'box' }
]);

const selectedCurrencyCode = computed(() => {
    if (!product.value.currencyId) return 'USD';
    return getCurrencyCode(product.value.currencyId) || 'USD';
});

const selectedCurrencyLocale = computed(() => {
    switch (selectedCurrencyCode.value) {
        case 'TRY': return 'tr-TR';
        case 'EUR': return 'de-DE';
        case 'USD': default: return 'en-US';
    }
});

const filteredProducts = computed(() => {
    let list = productStore.products ?? [];
    const filtersValue = activeFilters.value as any;

    if (filtersValue.name) {
        const query = filtersValue.name.toLowerCase();
        list = list.filter((item: any) => (item.name || '').toLowerCase().includes(query));
    }
    if (filtersValue.barcode) {
        const query = filtersValue.barcode.toLowerCase();
        list = list.filter((item: any) => (item.barcode || '').toLowerCase().includes(query));
    }
    if (filtersValue.category_id) {
        list = list.filter((item: any) => item.categoryId === filtersValue.category_id);
    }
    if (filtersValue.type_id) {
        list = list.filter((item: any) => item.typeId === filtersValue.type_id);
    }
    if (filtersValue.brand_id) {
        list = list.filter((item: any) => item.brandId === filtersValue.brand_id);
    }
    if (filtersValue.status) {
        list = list.filter((item: any) => item.status === filtersValue.status);
    }

    return list;
});

onMounted(async () => {
    productStore.fetchProducts();
    lookupStore.fetchAll();
});

function formatCurrency(value: number | null | undefined, currencyId: any) {
    if (value === null || value === undefined) return '';
    const currencyCode = getCurrencyCode(currencyId) || 'USD';
    const locale = currencyCode === 'TRY' ? 'tr-TR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US';
    return Number(value).toLocaleString(locale, { style: 'currency', currency: currencyCode });
}

function openNew() {
    router.push('/inventory/products/create');
}

function hideDialog() {
    submitted.value = false;
    imageFiles.value = [];
}

function toggleFilters() {
    showFilters.value = !showFilters.value;
}

function applyFilters() {
    activeFilters.value = { ...filterForm.value };
}

function clearFilters() {
    filterForm.value = {
        name: '',
        barcode: '',
        category_id: null,
        type_id: null,
        brand_id: null,
        status: null
    };
    activeFilters.value = { ...filterForm.value };
}

function resolveImageUrl(image: any) {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    return `https://primefaces.org/cdn/primevue/images/product/${image}`;
}

function resolveProductImage(item: any) {
    const images = Array.isArray(item.images) ? item.images : [];
    if (images.length) return resolveImageUrl(images[0]);
    if (item.image) return resolveImageUrl(item.image);
    return '';
}

function editProduct(prod: any) {
    router.push(`/inventory/products/edit/${prod.id}`);
}

function confirmDeleteProduct(prod: any) {
    product.value = prod;
    deleteProductDialog.value = true;
}

async function deleteProduct() {
    const result = await productStore.deleteProduct(product.value.id);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün silindi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Silme başarısız', life: 3000 });
    }
    deleteProductDialog.value = false;
    product.value = {};
}

function createId() {
    let id = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmDeleteSelected() {
    deleteProductsDialog.value = true;
}

async function deleteSelectedProducts() {
    const toDelete = selectedProducts.value ?? [];
    await Promise.all(toDelete.map((item: any) => productStore.deleteProduct(item.id)));
    deleteProductsDialog.value = false;
    selectedProducts.value = [];
    toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürünler silindi', life: 3000 });
}

function getStatusLabel(status: any): "success" | "info" | "warn" | "secondary" | "contrast" | "danger" | undefined {
    switch (status) {
        case 'TRACKED': return 'success';
        case 'UNTRACKED': return 'info';
        default: return 'secondary';
    }
}

function openCategoryDialog() {
    newCategoryName.value = '';
    categoryDialog.value = true;
}

function openBrandDialog() {
    newBrandName.value = '';
    brandDialog.value = true;
}

function openTypeDialog() {
    newTypeName.value = '';
    typeDialog.value = true;
}

async function saveCategory() {
    if (!newCategoryName.value.trim()) return;
    const result = await lookupStore.addCategory(newCategoryName.value.trim());
    if (result.success) {
        categoryDialog.value = false;
        newCategoryName.value = '';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kategori oluşturuldu', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Kategori oluşturulamadı', life: 3000 });
    }
}

function getStatusText(status: any) {
    switch (status) {
        case 'TRACKED': return 'Takip Ediliyor';
        case 'UNTRACKED': return 'Takip Edilmiyor';
        default: return status || '';
    }
}

function getProductStatusLabel(status: any) {
    switch (status) {
        case 'ACTIVE': return 'success';
        case 'PASSIVE': return 'secondary';
        default: return 'secondary';
    }
}

function getProductStatusText(status: any) {
    switch (status) {
        case 'ACTIVE': return 'Aktif';
        case 'PASSIVE': return 'Pasif';
        default: return status || '';
    }
}

async function saveBrand() {
    if (!newBrandName.value.trim()) return;
    const result = await lookupStore.addBrand(newBrandName.value.trim());
    if (result.success) {
        brandDialog.value = false;
        newBrandName.value = '';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Marka oluşturuldu', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Marka oluşturulamadı', life: 3000 });
    }
}

async function saveType() {
    if (!newTypeName.value.trim()) return;
    const result = await lookupStore.addProductType(newTypeName.value.trim());
    if (result.success) {
        typeDialog.value = false;
        newTypeName.value = '';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Tip oluşturuldu', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Tip oluşturulamadı', life: 3000 });
    }
}

function getCategoryName(id: string) {
    return lookupStore.categories.find((item: any) => item.id === id)?.name || '-';
}

function getBrandName(id: string) {
    return lookupStore.brands.find((item: any) => item.id === id)?.name || '-';
}

function getTypeName(id: string) {
    return lookupStore.productTypes.find((item: any) => item.id === id)?.name || '-';
}

function getCurrencyCode(id: string) {
    return lookupStore.currencies.find((item: any) => item.id === id)?.code || '-';
}

function getPriceUnitLabel(value: any) {
    return priceUnits.value.find((item) => item.value === value)?.label || value || '-';
}
</script>

<template>
    <div>
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Yeni" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Sil" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedProducts || !selectedProducts.length" />
                </template>

                <template #end>
                    <Button label="Dışa Aktar" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>

            <div v-if="showFilters" class="card mb-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 lg:col-span-2">
                        <label class="block text-xs font-semibold mb-2 tracking-widest text-surface-500">Ürün</label>
                        <InputText v-model="filterForm.name" placeholder="Ürün Adı" fluid />
                    </div>
                    <div class="col-span-12 lg:col-span-2">
                        <label class="block text-xs font-semibold mb-2 tracking-widest text-surface-500">Barkod</label>
                        <InputText v-model="filterForm.barcode" placeholder="Barkod No" fluid />
                    </div>
                    <div class="col-span-12 lg:col-span-2">
                        <label class="block text-xs font-semibold mb-2 tracking-widest text-surface-500">Kategori</label>
                        <Select v-model="filterForm.category_id" :options="lookupStore.categories" optionLabel="name" optionValue="id" placeholder="Kategori Seç" fluid />
                    </div>
                    <div class="col-span-12 lg:col-span-2">
                        <label class="block text-xs font-semibold mb-2 tracking-widest text-surface-500">Tip</label>
                        <Select v-model="filterForm.type_id" :options="lookupStore.productTypes" optionLabel="name" optionValue="id" placeholder="Tip Seç" fluid />
                    </div>
                    <div class="col-span-12 lg:col-span-2">
                        <label class="block text-xs font-semibold mb-2 tracking-widest text-surface-500">Marka</label>
                        <Select v-model="filterForm.brand_id" :options="lookupStore.brands" optionLabel="name" optionValue="id" placeholder="Marka Seç" fluid />
                    </div>
                    <div class="col-span-12 lg:col-span-2">
                        <label class="block text-xs font-semibold mb-2 tracking-widest text-surface-500">Kapsam</label>
                        <Select v-model="filterForm.status" :options="productStatuses" optionLabel="label" optionValue="value" placeholder="Durum Seç" fluid />
                    </div>
                    <div class="col-span-12 lg:col-span-2 flex items-end">
                        <Button label="Filtrele" class="w-full" @click="applyFilters" />
                    </div>
                    <div class="col-span-12 lg:col-span-2 flex items-end">
                        <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                    </div>
                </div>
            </div>

            <DataTable
                ref="dt"
                v-model:selection="selectedProducts"
                :value="filteredProducts"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Gösterilen {first} - {last} / {totalRecords} ürün"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Ürün Yönetimi</h4>
                        <div class="flex items-center gap-2">
                            <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                        </div>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                <Column field="image" header="Görsel">
                    <template #body="slotProps">
                        <img :src="resolveProductImage(slotProps.data)" :alt="slotProps.data.name" class="rounded" style="width: 64px" />
                    </template>
                </Column>

                <Column field="name" header="Ürün Adı" sortable style="min-width: 12rem"></Column>
                <Column field="barcode" header="Barcode No" sortable style="min-width: 10rem"></Column>
                <Column field="status" header="Durum" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        <Tag :value="getProductStatusText(slotProps.data.status)" :severity="getProductStatusLabel(slotProps.data.status)" />
                    </template>
                </Column>

                <Column field="priceUnit" header="Birim" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ getPriceUnitLabel(slotProps.data.priceUnit) }}
                    </template>
                </Column>

                <Column field="price" header="Fiyat" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.price, slotProps.data.currencyId) }}
                    </template>
                </Column>

                <Column field="currencyId" header="Döviz" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ getCurrencyCode(slotProps.data.currencyId) }}
                    </template>
                </Column>

                <Column field="taxRate" header="KDV %" sortable style="min-width: 8rem"></Column>

                <Column field="brandId" header="Marka" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getBrandName(slotProps.data.brandId) }}
                    </template>
                </Column>

                <Column field="categoryId" header="Kategori" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getCategoryName(slotProps.data.categoryId) }}
                    </template>
                </Column>

                <Column field="typeId" header="Tip" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getTypeName(slotProps.data.typeId) }}
                    </template>
                </Column>

                <Column field="minStock" header="Min Stok" sortable style="min-width: 10rem"></Column>
                <Column field="maxStock" header="Max Stok" sortable style="min-width: 10rem"></Column>
                <Column field="initialStock" header="Mevcut Stok" sortable style="min-width: 10rem"></Column>

                <Column field="inventoryStatus" header="Stok Takibi" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        <Tag :value="getStatusText(slotProps.data.inventoryStatus)" :severity="getStatusLabel(slotProps.data.inventoryStatus)" />
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editProduct(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteProduct(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="deleteProductDialog" :style="{ width: '450px' }" header="Onay" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-3xl!" />
                <span v-if="product">Silmek istediğinize emin misiniz <b>{{ product.name }}</b></span>
            </div>
            <template #footer>
                <Button label="Hayır" icon="pi pi-times" text @click="deleteProductDialog = false" />
                <Button label="Evet" icon="pi pi-check" @click="deleteProduct" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductsDialog" :style="{ width: '450px' }" header="Onay" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-3xl!" />
                <span v-if="product">Seçili ürünleri silmek istediğinize emin misiniz</span>
            </div>
            <template #footer>
                <Button label="Hayır" icon="pi pi-times" text @click="deleteProductsDialog = false" />
                <Button label="Evet" icon="pi pi-check" text @click="deleteSelectedProducts" />
            </template>
        </Dialog>

        <Dialog v-model:visible="categoryDialog" :style="{ width: '420px' }" header="Yeni Kategori" :modal="true">
            <div class="flex flex-col gap-4">
                <label for="newCategory" class="font-bold">Ad</label>
                <InputText id="newCategory" v-model.trim="newCategoryName" autofocus />
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="categoryDialog = false" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveCategory" />
            </template>
        </Dialog>

        <Dialog v-model:visible="brandDialog" :style="{ width: '420px' }" header="Yeni Marka" :modal="true">
            <div class="flex flex-col gap-4">
                <label for="newBrand" class="font-bold">Ad</label>
                <InputText id="newBrand" v-model.trim="newBrandName" autofocus />
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="brandDialog = false" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveBrand" />
            </template>
        </Dialog>

        <Dialog v-model:visible="typeDialog" :style="{ width: '420px' }" header="Yeni Tip" :modal="true">
            <div class="flex flex-col gap-4">
                <label for="newType" class="font-bold">Ad</label>
                <InputText id="newType" v-model.trim="newTypeName" autofocus />
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="typeDialog = false" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveType" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.product-dialog :deep(.p-dialog-content) {
    scrollbar-width: none;
    -ms-overflow-style: none;
}
.product-dialog :deep(.p-dialog-content::-webkit-scrollbar) {
    width: 0;
    height: 0;
}
</style>

