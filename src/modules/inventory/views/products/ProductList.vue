<script setup lang="ts">
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const productStore = useProductStore();
const lookupStore = useLookupStore();
const toast = useToast();

type ExportableTable = { exportCSV: () => void };
const dt = ref<ExportableTable | null>(null);
const deleteProductDialog = ref(false);
const deleteProductsDialog = ref(false);
const categoryDialog = ref(false);
const brandDialog = ref(false);
const typeDialog = ref(false);
type ProductListItem = (typeof productStore.products)[number];
type CategoryListItem = (typeof lookupStore.categories)[number];
type BrandListItem = (typeof lookupStore.brands)[number];
type ProductTypeListItem = (typeof lookupStore.productTypes)[number];
type CurrencyListItem = (typeof lookupStore.currencies)[number];
const product = ref<ProductListItem | null>(null);
const selectedProducts = ref<ProductListItem[]>([]);
const newCategoryName = ref('');
const newBrandName = ref('');
const newTypeName = ref('');

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const showFilters = ref(false);

interface ProductFilterForm {
    name: string;
    barcode: string;
    category_id: string | null;
    type_id: string | null;
    brand_id: string | null;
    status: string | null;
}

const filterForm = ref<ProductFilterForm>({
    name: '',
    barcode: '',
    category_id: null,
    type_id: null,
    brand_id: null,
    status: null
});

const activeFilters = ref<ProductFilterForm>({ ...filterForm.value });

const productStatuses = ref([
    { label: 'Aktif', value: 'ACTIVE' },
    { label: 'Pasif', value: 'PASSIVE' }
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

const filteredProducts = computed(() => {
    let list = productStore.products ?? [];
    const filtersValue = activeFilters.value;

    if (filtersValue.name) {
        const query = filtersValue.name.toLowerCase();
        list = list.filter((item) => (item.name || '').toLowerCase().includes(query));
    }
    if (filtersValue.barcode) {
        const query = filtersValue.barcode.toLowerCase();
        list = list.filter((item) => (item.barcode || '').toLowerCase().includes(query));
    }
    if (filtersValue.category_id) {
        list = list.filter((item) => item.categoryId === filtersValue.category_id);
    }
    if (filtersValue.type_id) {
        list = list.filter((item) => item.typeId === filtersValue.type_id);
    }
    if (filtersValue.brand_id) {
        list = list.filter((item) => item.brandId === filtersValue.brand_id);
    }
    if (filtersValue.status) {
        list = list.filter((item) => item.status === filtersValue.status);
    }

    return list;
});

onMounted(async () => {
    productStore.fetchProducts();
    lookupStore.fetchAll();
});

function formatCurrency(value: number | null | undefined, currencyId: string | null | undefined) {
    if (value === null || value === undefined) return '';
    const currencyCode = getCurrencyCode(currencyId);
    
    if (!currencyCode || currencyCode === '-') {
        return Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    }

    try {
        const locale = currencyCode === 'TRY' ? 'tr-TR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US';
        return Number(value).toLocaleString(locale, { style: 'currency', currency: currencyCode });
    } catch (e) {
        return `${currencyCode} ${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    }
}

function openNew() {
    router.push('/inventory/products/create');
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

function resolveImageUrl(image: string | null | undefined) {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    return `https://primefaces.org/cdn/primevue/images/product/${image}`;
}

function resolveProductImage(item: ProductListItem) {
    const images = Array.isArray(item.images) ? item.images : [];
    if (images.length) return resolveImageUrl(images[0]);
    if (item.image) return resolveImageUrl(item.image);
    return '';
}

function editProduct(prod: ProductListItem) {
    router.push(`/inventory/products/edit/${prod.id}`);
}

function confirmDeleteProduct(prod: ProductListItem) {
    product.value = prod;
    deleteProductDialog.value = true;
}

async function deleteProduct() {
    if (!product.value) return;
    const result = await productStore.deleteProduct(product.value.id);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün silindi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Silme başarısız', life: 3000 });
    }
    deleteProductDialog.value = false;
    product.value = null;
}

function exportCSV() {
    dt.value?.exportCSV();
}

function confirmDeleteSelected() {
    deleteProductsDialog.value = true;
}

async function deleteSelectedProducts() {
    const toDelete = selectedProducts.value ?? [];
    await Promise.all(toDelete.map((item) => productStore.deleteProduct(item.id)));
    deleteProductsDialog.value = false;
    selectedProducts.value = [];
    toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürünler silindi', life: 3000 });
}

function getStatusLabel(status: string | null | undefined): 'success' | 'info' | 'warn' | 'secondary' | 'contrast' | 'danger' | undefined {
    switch (status) {
        case 'TRACKED':
            return 'success';
        case 'UNTRACKED':
            return 'info';
        default:
            return 'secondary';
    }
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

function getStatusText(status: string | null | undefined) {
    switch (status) {
        case 'TRACKED':
            return 'Takip Ediliyor';
        case 'UNTRACKED':
            return 'Takip Edilmiyor';
        default:
            return status || '';
    }
}

function getProductStatusLabel(status: string | null | undefined) {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'PASSIVE':
            return 'secondary';
        default:
            return 'secondary';
    }
}

function getProductStatusText(status: string | null | undefined) {
    switch (status) {
        case 'ACTIVE':
            return 'Aktif';
        case 'PASSIVE':
            return 'Pasif';
        default:
            return status || '';
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
    return lookupStore.categories.find((item: CategoryListItem) => item.id === id)?.name || '-';
}

function getBrandName(id: string) {
    return lookupStore.brands.find((item: BrandListItem) => item.id === id)?.name || '-';
}

function getTypeName(id: string) {
    return lookupStore.productTypes.find((item: ProductTypeListItem) => item.id === id)?.name || '-';
}

function getCurrencyCode(id: string | null | undefined) {
    if (!id) return null;
    return lookupStore.currencies.find((item: CurrencyListItem) => item.id === id)?.code || null;
}

function getPriceUnitLabel(value: string | null | undefined) {
    return priceUnits.value.find((item) => item.value === value)?.label || value || '-';
}
</script>

<template>
    <div>
        <!-- 1. Card: Başlık + Toolbar -->
        <div class="card mb-4">
            <!-- Üst Satır: Başlık (Solda) + Filtreler Butonu (Sağda) -->
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Ürün Yönetimi</div>
            </div>

            <!-- Alt Satır: Toolbar (Yeni, Sil, Dışa Aktar butonları) -->
            <Toolbar>
                <template #start>
                    <Button label="Yeni Ürün Oluştur" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>

                <template #end>
                    <Button label="Ürün Sil" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedProducts || !selectedProducts.length" />
                    <Button label="Ürün Ara" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                    <Button label="Dışa Aktar" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>
        </div>

        <!-- 2. Card: Filtre Alanları (showFilters true ise görünür) -->
        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.name" placeholder="Ürün Adı" fluid />
                </div>

                <div class="col-span-1">
                    <InputText v-model="filterForm.barcode" placeholder="Barkod No" fluid />
                </div>

                <div class="col-span-1">
                    <Select v-model="filterForm.category_id" :options="lookupStore.categories" optionLabel="name" optionValue="id" placeholder="Kategori" fluid />
                </div>

                <div class="col-span-1">
                    <Select v-model="filterForm.type_id" :options="lookupStore.productTypes" optionLabel="name" optionValue="id" placeholder="Tip" fluid />
                </div>

                <div class="col-span-1">
                    <Select v-model="filterForm.brand_id" :options="lookupStore.brands" optionLabel="name" optionValue="id" placeholder="Marka" fluid />
                </div>

                <div class="col-span-1">
                    <Select v-model="filterForm.status" :options="productStatuses" optionLabel="label" optionValue="value" placeholder="Durum" fluid />
                </div>

                <div class="col-span-1 flex items-end">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                </div>

                <div class="col-span-1 flex items-end">
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <!-- Error Message -->
        <Message v-if="productStore.error" severity="error" class="mb-4">{{ productStore.error }}</Message>

        <!-- 3. Card: DataTable -->
        <div class="card">
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
                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                <Column field="image" header="Görsel">
                    <template #body="slotProps">
                        <img :src="resolveProductImage(slotProps.data)" :alt="slotProps.data.name" class="rounded" style="width: 64px" />
                    </template>
                </Column>

                <Column field="code" header="Ürün Kodu" sortable style="min-width: 8rem"></Column>
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

        <!-- Dialog'lar aynı kalır -->
        <Dialog v-model:visible="deleteProductDialog" :style="{ width: '450px' }" header="Onay" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-3xl!" />
                <span v-if="product"
                    >Silmek istediğinize emin misiniz <b>{{ product.name }}</b></span
                >
            </div>
            <template #footer>
                <Button label="Hayır" icon="pi pi-times" text @click="deleteProductDialog = false" />
                <Button label="Evet" icon="pi pi-check" @click="deleteProduct" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductsDialog" :style="{ width: '450px' }" header="Onay" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-3xl!" />
                <span>Seçili ürünleri silmek istediğinize emin misiniz</span>
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
