<script setup lang="ts">
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
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
const invStore = useInventoryStore();

type ExportableTable = { exportCSV: () => void };
const dt = ref<ExportableTable | null>(null);
const deleteProductDialog = ref(false);
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
const menu = ref();
const menuItems = ref([
    {
        label: 'Detay',
        command: () => {
            if (product.value) viewProduct(product.value as ProductListItem);
        }
    },
    {
        label: 'Kopyala',
        command: () => {
            if (product.value) cloneProduct(product.value as ProductListItem);
        }
    },
    {
        label: 'Düzenle',
        command: () => {
            if (product.value) editProduct(product.value as ProductListItem);
        }
    },
    {
        label: 'Sil',
        command: () => {
            if (product.value) confirmDeleteProduct(product.value as ProductListItem);
        }
    }
]);

const columns = ref([
    { field: 'image', header: 'Görsel' },
    { field: 'code', header: 'Ürün Kodu' },
    { field: 'name', header: 'Ürün Adı' },
    { field: 'barcode', header: 'Barkod No' },
    { field: 'taxRate', header: 'KDV %' },
    { field: 'brandId', header: 'Marka' },
    { field: 'categoryId', header: 'Kategori' },
    { field: 'typeId', header: 'Tip' },
    { field: 'minStock', header: 'Min Stok' },
    { field: 'maxStock', header: 'Max Stok' },
    { field: 'initialStock', header: 'Mevcut Stok' },
    { field: 'categoryDiscount', header: 'İskonto Tipi' },
    { field: 'status', header: 'Durum' },
    { field: 'inventoryStatus', header: 'Stok Takibi' }
]);

const selectedColumns = ref(columns.value.filter(c => ['image', 'code', 'name', 'status', 'price', 'initialStock', 'categoryDiscount'].includes(c.field)));

function onColumnToggle(val: any) {
    selectedColumns.value = columns.value.filter((col) => val.includes(col));
    // Seçimleri localStorage'a kaydet (sadece field isimlerini)
    const fieldNames = selectedColumns.value.map(c => c.field);
    localStorage.setItem('product_list_columns', JSON.stringify(fieldNames));
}

function viewProduct(prod: ProductListItem) {
    router.push(`/inventory/products/details/${prod.id}`);
}

function cloneProduct(prod: ProductListItem) {
    router.push(`/inventory/products/create?cloneId=${prod.id}`);
}

const onProductActionClick = (event: any, prod: ProductListItem) => {
    product.value = prod;
    menu.value.toggle(event);
};

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
    categoryDiscount: number | null;
}

const filterForm = ref<ProductFilterForm>({
    name: '',
    barcode: '',
    category_id: null,
    type_id: null,
    brand_id: null,
    status: null,
    categoryDiscount: null
});

const activeFilters = ref<ProductFilterForm>({ ...filterForm.value });

const productStatuses = ref([
    { label: 'AKTİF', value: 'ACTIVE' },
    { label: 'PASİF', value: 'PASSIVE' }
]);

const discountTypes = ref([
    { label: 'İskonto 1', value: 1 },
    { label: 'İskonto 2', value: 2 },
    { label: 'İskonto 3', value: 3 }
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
    if (filtersValue.categoryDiscount !== null) {
        list = list.filter((item) => item.categoryDiscount === filtersValue.categoryDiscount);
    }

    return list;
});

const getDiscountTypeLabel = (value: number | null | undefined) => {
    switch (value) {
        case 1: return 'İskonto 1';
        case 2: return 'İskonto 2';
        case 3: return 'İskonto 3';
        default: return '—';
    }
};

onMounted(async () => {
    productStore.fetchProducts();
    invStore.fetchBalances();
    lookupStore.fetchAll();

    // Kayıtlı sütun seçimlerini yükle
    const saved = localStorage.getItem('product_list_columns');
    if (saved) {
        try {
            const fieldNames = JSON.parse(saved);
            selectedColumns.value = columns.value.filter(col => fieldNames.includes(col.field));
        } catch (e) {
            console.error('Sütun seçimleri yüklenemedi:', e);
        }
    }
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
        status: null,
        categoryDiscount: null
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

function getProductStatusText(status: string | null | undefined) {
    switch (status) {
        case 'ACTIVE':
            return 'AKTİF';
        case 'PASSIVE':
            return 'PASİF';
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
                    <Button label="Yeni Ürün Oluştur" icon="pi pi-plus" severity="primary" class="mr-2" @click="openNew" />
                </template>

                <template #end>
                    <MultiSelect
                        :modelValue="selectedColumns"
                        :options="columns"
                        optionLabel="header"
                        @update:modelValue="onColumnToggle"
                        placeholder="Sütun Seç"
                        :maxSelectedLabels="1"
                        class="mr-2"
                        style="min-width: 15rem"
                    />
                    <Button  icon="pi pi-filter" severity="secondary"  v-tooltip.bottom="'Ürün Ara'" @click="toggleFilters" />
                    <Button  icon="pi pi-upload" severity="secondary" v-tooltip.bottom="'Dışa Aktar'" @click="exportCSV" />
                </template>
            </Toolbar>
        </div>

        <!-- 2. Card: Filtre Alanları (showFilters true ise görünür) -->
        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 items-center">
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

                <div class="col-span-1">
                    <Select v-model="filterForm.categoryDiscount" :options="discountTypes" optionLabel="label" optionValue="value" placeholder="İskonto" showClear fluid />
                </div>

                <div class="col-span-1">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                </div>

                <div class="col-span-1">
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

                <Column v-if="selectedColumns.find(c => c.field === 'image')" field="image" header="Görsel">
                    <template #body="slotProps">
                        <img :src="resolveProductImage(slotProps.data)" :alt="slotProps.data.name" class="rounded" style="width: 64px" />
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'code')" field="code" header="Ürün Kodu" sortable style="min-width: 8rem"></Column>
                <Column v-if="selectedColumns.find(c => c.field === 'name')" field="name" header="Ürün Adı" sortable style="min-width: 12rem"></Column>
                <Column v-if="selectedColumns.find(c => c.field === 'barcode')" field="barcode" header="Barcode No" sortable style="min-width: 10rem"></Column>

                <Column v-if="selectedColumns.find(c => c.field === 'priceUnit')" field="priceUnit" header="Birim" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ getPriceUnitLabel(slotProps.data.priceUnit) }}
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'price')" field="price" header="Fiyat" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.price, slotProps.data.currencyId) }}
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'currencyId')" field="currencyId" header="Döviz" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ getCurrencyCode(slotProps.data.currencyId) }}
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'taxRate')" field="taxRate" header="KDV %" sortable style="min-width: 8rem"></Column>

                <Column v-if="selectedColumns.find(c => c.field === 'brandId')" field="brandId" header="Marka" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getBrandName(slotProps.data.brandId) }}
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'categoryId')" field="categoryId" header="Kategori" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getCategoryName(slotProps.data.categoryId) }}
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'typeId')" field="typeId" header="Tip" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getTypeName(slotProps.data.typeId) }}
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'minStock')" field="minStock" header="Min Stok" sortable style="min-width: 10rem"></Column>
                <Column v-if="selectedColumns.find(c => c.field === 'maxStock')" field="maxStock" header="Max Stok" sortable style="min-width: 10rem"></Column>
                <Column v-if="selectedColumns.find(c => c.field === 'initialStock')" field="initialStock" header="Mevcut Stok" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        <div class="flex flex-col">
                            <span :class="[
                                invStore.getTotalBalance(slotProps.data.id) < (slotProps.data.minStock || 0) ? 'text-orange-500 font-bold' : 'font-medium',
                                invStore.getTotalBalance(slotProps.data.id) < 0 ? 'text-red-500' : ''
                            ]">
                                {{ invStore.getTotalBalance(slotProps.data.id) }}
                            </span>
                            <Tag v-if="invStore.getTotalBalance(slotProps.data.id) < (slotProps.data.minStock || 0)" severity="warn" value="Kritik" class="mt-1" />
                        </div>
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'categoryDiscount')" field="categoryDiscount" header="İskonto Tipi" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        <Tag v-if="slotProps.data.categoryDiscount > 0" :value="getDiscountTypeLabel(slotProps.data.categoryDiscount)" severity="warn" />
                        <span v-else class="text-surface-400">—</span>
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'status')" field="status" header="Durum" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        <span 
                            class="font-bold text-sm" 
                            :class="slotProps.data.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'"
                        >
                            {{ getProductStatusText(slotProps.data.status) }}
                        </span>
                    </template>
                </Column>

                <Column v-if="selectedColumns.find(c => c.field === 'inventoryStatus')" field="inventoryStatus" header="Stok Takibi" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        <Tag :value="getStatusText(slotProps.data.inventoryStatus)" :severity="getStatusLabel(slotProps.data.inventoryStatus)" />
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 4rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-ellipsis-v" text rounded @click="onProductActionClick($event, slotProps.data)" />
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

        <Menu ref="menu" :model="menuItems" :popup="true" />
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
