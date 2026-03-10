<script setup>
import { ProductService } from '@/service/ProductService';
import { supabase } from '@/service/supabaseClient';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const toast = useToast();
const dt = ref();
const products = ref([]);
const categories = ref([]);
const brands = ref([]);
const types = ref([]);
const currencies = ref([]);
const productDialog = ref(false);
const deleteProductDialog = ref(false);
const deleteProductsDialog = ref(false);
const categoryDialog = ref(false);
const brandDialog = ref(false);
const typeDialog = ref(false);
const product = ref({});
const selectedProducts = ref();
const newCategoryName = ref('');
const newBrandName = ref('');
const newTypeName = ref('');
const imageFile = ref(null);
const imagePreviewUrl = ref('');
const imageUploading = ref(false);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const statuses = ref([
    { label: 'Stok Takibi Yapılacak', value: 'TRACKED' },
    { label: 'Stok Takibi Yapılmayacak', value: 'UNTRACKED' }
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
    if (!product.value?.currency_id) return 'USD';
    return getCurrencyCode(product.value.currency_id) || 'USD';
});

const selectedCurrencyLocale = computed(() => {
    switch (selectedCurrencyCode.value) {
        case 'TRY':
            return 'tr-TR';
        case 'EUR':
            return 'de-DE';
        case 'USD':
        default:
            return 'en-US';
    }
});

async function loadProducts() {
    const data = await ProductService.getProducts();
    products.value = (data ?? []).filter((item) => item.inventoryStatus !== 'UNTRACKED');
}

async function loadLookups() {
    const [categoriesData, brandsData, typesData, currenciesData] = await Promise.all([ProductService.getCategories(), ProductService.getBrands(), ProductService.getTypes(), ProductService.getCurrencies()]);
    categories.value = categoriesData;
    brands.value = brandsData;
    types.value = typesData;
    currencies.value = currenciesData;
}

onMounted(async () => {
    await Promise.all([loadProducts(), loadLookups()]);
});

function formatCurrency(value, currencyId) {
    if (value === null || value === undefined) return '';
    const currencyCode = getCurrencyCode(currencyId) || 'USD';
    const locale = currencyCode === 'TRY' ? 'tr-TR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US';
    return Number(value).toLocaleString(locale, { style: 'currency', currency: currencyCode });
}

function openNew() {
    product.value = { tax_rate: 20, price_unit: 'pcs' };
    imageFile.value = null;
    imagePreviewUrl.value = '';
    submitted.value = false;
    productDialog.value = true;
}

function hideDialog() {
    productDialog.value = false;
    submitted.value = false;
    imageFile.value = null;
    imagePreviewUrl.value = '';
}

function normalizeInventoryStatus(value) {
    if (!value) return null;
    const resolved = value.value ? value.value : value;
    return typeof resolved === 'string' ? resolved.toUpperCase() : resolved;
}

function buildProductPayload() {
    return {
        name: product.value.name?.trim() ?? '',
        description: product.value.description ?? '',
        price: product.value.price ?? null,
        currency_id: product.value.currency_id ?? null,
        tax_rate: product.value.tax_rate ?? 0,
        price_unit: product.value.price_unit ?? 'pcs',
        category_id: product.value.category_id ?? null,
        brand_id: product.value.brand_id ?? null,
        type_id: product.value.type_id ?? null,
        inventoryStatus: normalizeInventoryStatus(product.value.inventoryStatus),
        quantity: product.value.quantity ?? null,
        min_stock: product.value.min_stock ?? null,
        max_stock: product.value.max_stock ?? null,
        image: product.value.image ?? 'product-placeholder.svg',
        code: product.value.code ?? createId()
    };
}

function resolveImageUrl(image) {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    return `https://primefaces.org/cdn/primevue/images/product/${image}`;
}

function onImageSelected(event) {
    const file = event?.files?.[0] ?? event?.target?.files?.[0] ?? null;
    imageFile.value = file;
    imagePreviewUrl.value = file ? URL.createObjectURL(file) : '';
}

async function uploadImage() {
    if (!imageFile.value) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen bir görsel seçin', life: 3000 });
        return;
    }

    imageUploading.value = true;

    const file = imageFile.value;
    const safeCode = product.value.code ?? createId();
    const fileName = `${safeCode}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });

    if (error) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Görsel yükleme başarısız', life: 3000 });
        imageUploading.value = false;
        return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    product.value.image = data.publicUrl;
    imagePreviewUrl.value = data.publicUrl;
    toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Görsel yüklendi', life: 3000 });
    imageUploading.value = false;
}

async function saveProduct() {
    submitted.value = true;

    if (!product?.value.name?.trim()) {
        return;
    }
    if (!product.value.currency_id || product.value.price === null || product.value.price === undefined) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Fiyat ve döviz zorunludur', life: 3000 });
        return;
    }
    if (!product.value.category_id || !product.value.brand_id || !product.value.type_id) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Kategori, marka ve tip zorunludur', life: 3000 });
        return;
    }
    if (product.value.tax_rate === null || product.value.tax_rate === undefined) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'KDV oranı zorunludur', life: 3000 });
        return;
    }
    if (!product.value.price_unit) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Birim zorunludur', life: 3000 });
        return;
    }

    const payload = buildProductPayload();

    if (product.value.id) {
        const updated = await ProductService.updateProduct(product.value.id, payload);
        if (updated) {
            const index = findIndexById(product.value.id);
            if (index !== -1) products.value[index] = updated;
            toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün güncellendi', life: 3000 });
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: 'Güncelleme başarısız', life: 3000 });
            return;
        }
    } else {
        const created = await ProductService.createProduct(payload);
        if (created) {
            products.value.push(created);
            toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün oluşturuldu', life: 3000 });
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: 'Oluşturma başarısız', life: 3000 });
            return;
        }
    }

    productDialog.value = false;
    product.value = {};
}

function editProduct(prod) {
    product.value = { ...prod };
    imageFile.value = null;
    imagePreviewUrl.value = '';
    productDialog.value = true;
}

function confirmDeleteProduct(prod) {
    product.value = prod;
    deleteProductDialog.value = true;
}

async function deleteProduct() {
    const ok = await ProductService.deleteProduct(product.value.id);
    if (ok) {
        products.value = products.value.filter((val) => val.id !== product.value.id);
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün silindi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Silme başarısız', life: 3000 });
    }
    deleteProductDialog.value = false;
    product.value = {};
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < products.value.length; i++) {
        if (products.value[i].id === id) {
            index = i;
            break;
        }
    }

    return index;
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
    await Promise.all(toDelete.map((item) => ProductService.deleteProduct(item.id)));
    products.value = products.value.filter((val) => !toDelete.includes(val));
    deleteProductsDialog.value = false;
    selectedProducts.value = null;
    toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürünler silindi', life: 3000 });
}

function getStatusLabel(status) {
    switch (status) {
        case 'TRACKED':
            return 'success';
        case 'UNTRACKED':
            return 'info';
        default:
            return null;
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
    const created = await ProductService.createCategory({ name: newCategoryName.value.trim() });
    if (created) {
        categories.value.push(created);
        categoryDialog.value = false;
        newCategoryName.value = '';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kategori oluşturuldu', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Kategori oluşturulamadı', life: 3000 });
    }
}

function getStatusText(status) {
    switch (status) {
        case 'TRACKED':
            return 'Takip Ediliyor';
        case 'UNTRACKED':
            return 'Takip Edilmiyor';
        default:
            return status ?? '';
    }
}

async function saveBrand() {
    if (!newBrandName.value.trim()) return;
    const created = await ProductService.createBrand({ name: newBrandName.value.trim() });
    if (created) {
        brands.value.push(created);
        brandDialog.value = false;
        newBrandName.value = '';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Marka oluşturuldu', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Marka oluşturulamadı', life: 3000 });
    }
}

async function saveType() {
    if (!newTypeName.value.trim()) return;
    const created = await ProductService.createType({ name: newTypeName.value.trim() });
    if (created) {
        types.value.push(created);
        typeDialog.value = false;
        newTypeName.value = '';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Tip oluşturuldu', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Tip oluşturulamadı', life: 3000 });
    }
}

function getCategoryName(id) {
    return categories.value.find((item) => item.id === id)?.name ?? '-';
}

function getBrandName(id) {
    return brands.value.find((item) => item.id === id)?.name ?? '-';
}

function getTypeName(id) {
    return types.value.find((item) => item.id === id)?.name ?? '-';
}

function getCurrencyCode(id) {
    return currencies.value.find((item) => item.id === id)?.code ?? '-';
}

function getPriceUnitLabel(value) {
    return priceUnits.value.find((item) => item.value === value)?.label ?? value ?? '-';
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

            <DataTable
                ref="dt"
                v-model:selection="selectedProducts"
                :value="products"
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
                            <i class="pi pi-search" />
                            <InputText v-model="filters['global'].value" placeholder="Ara..." />
                        </div>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                <Column field="image" header="Görsel">
                    <template #body="slotProps">
                        <img :src="resolveImageUrl(slotProps.data.image)" :alt="slotProps.data.image" class="rounded" style="width: 64px" />
                    </template>
                </Column>
                <Column field="name" header="Ad" sortable style="min-width: 12rem"></Column>
                <Column field="price_unit" header="Birim" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ getPriceUnitLabel(slotProps.data.price_unit) }}
                    </template>
                </Column>
                <Column field="price" header="Fiyat" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.price, slotProps.data.currency_id) }}
                    </template>
                </Column>
                <Column field="currency_id" header="Döviz" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ getCurrencyCode(slotProps.data.currency_id) }}
                    </template>
                </Column>
                <Column field="tax_rate" header="KDV %" sortable style="min-width: 8rem"></Column>
                <Column field="brand_id" header="Marka" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getBrandName(slotProps.data.brand_id) }}
                    </template>
                </Column>
                <Column field="category_id" header="Kategori" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getCategoryName(slotProps.data.category_id) }}
                    </template>
                </Column>
                <Column field="type_id" header="Tip" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ getTypeName(slotProps.data.type_id) }}
                    </template>
                </Column>
                <Column field="min_stock" header="Min Stok" sortable style="min-width: 10rem"></Column>
                <Column field="max_stock" header="Maks Stok" sortable style="min-width: 10rem"></Column>
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

        <Dialog v-model:visible="productDialog" :style="{ width: '1000px' }" :contentStyle="{ maxHeight: '70vh' }" header="Ürün Detayı" :modal="true">
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 lg:col-span-6">
                    <label for="name" class="block font-bold mb-3">Ad</label>
                    <InputText id="name" v-model.trim="product.name" required="true" autofocus :invalid="submitted && !product.name" fluid />
                    <small v-if="submitted && !product.name" class="text-red-500">Ad zorunludur.</small>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="inventoryStatus" class="block font-bold mb-3">Stok Durumu</label>
                    <Select id="inventoryStatus" v-model="product.inventoryStatus" :options="statuses" optionLabel="label" placeholder="Seçim Yap" fluid></Select>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="brand" class="block font-bold mb-3">Marka</label>
                    <div class="flex gap-2 items-center">
                        <Select id="brand" v-model="product.brand_id" :options="brands" optionLabel="name" optionValue="id" placeholder="Marka Seç" fluid />
                        <Button icon="pi pi-plus" severity="secondary" text @click="openBrandDialog" />
                    </div>
                    <small v-if="submitted && !product.brand_id" class="text-red-500">Marka zorunludur.</small>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="category" class="block font-bold mb-3">Kategori</label>
                    <div class="flex gap-2 items-center">
                        <Select id="category" v-model="product.category_id" :options="categories" optionLabel="name" optionValue="id" placeholder="Kategori Seç" fluid />
                        <Button icon="pi pi-plus" severity="secondary" text @click="openCategoryDialog" />
                    </div>
                    <small v-if="submitted && !product.category_id" class="text-red-500">Kategori zorunludur.</small>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="type" class="block font-bold mb-3">Tip</label>
                    <div class="flex gap-2 items-center">
                        <Select id="type" v-model="product.type_id" :options="types" optionLabel="name" optionValue="id" placeholder="Tip Seç" fluid />
                        <Button icon="pi pi-plus" severity="secondary" text @click="openTypeDialog" />
                    </div>
                    <small v-if="submitted && !product.type_id" class="text-red-500">Tip zorunludur.</small>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="price" class="block font-bold mb-3">Fiyat (KDV Hariç)</label>
                    <InputNumber id="price" v-model="product.price" mode="currency" :currency="selectedCurrencyCode" :locale="selectedCurrencyLocale" fluid />
                    <small v-if="submitted && (product.price === null || product.price === undefined)" class="text-red-500">Fiyat zorunludur.</small>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="currency" class="block font-bold mb-3">Döviz</label>
                    <Select id="currency" v-model="product.currency_id" :options="currencies" optionLabel="code" optionValue="id" placeholder="Döviz Seç" fluid />
                    <small v-if="submitted && !product.currency_id" class="text-red-500">Döviz zorunludur.</small>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="quantity" class="block font-bold mb-3">Miktar</label>
                    <InputNumber id="quantity" v-model="product.quantity" integeronly fluid />
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="minStock" class="block font-bold mb-3">Minimum Stok</label>
                    <InputNumber id="minStock" v-model="product.min_stock" integeronly fluid />
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="maxStock" class="block font-bold mb-3">Maksimum Stok</label>
                    <InputNumber id="maxStock" v-model="product.max_stock" integeronly fluid />
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="priceUnit" class="block font-bold mb-3">Birim</label>
                    <Select id="priceUnit" v-model="product.price_unit" :options="priceUnits" optionLabel="label" optionValue="value" placeholder="Birim Seç" fluid />
                    <small v-if="submitted && !product.price_unit" class="text-red-500">Birim zorunludur.</small>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="taxRate" class="block font-bold mb-3">KDV Oranı</label>
                    <Select id="taxRate" v-model="product.tax_rate" :options="taxRates" optionLabel="label" optionValue="value" placeholder="KDV Oranı Seç" fluid />
                    <small v-if="submitted && (product.tax_rate === null || product.tax_rate === undefined)" class="text-red-500">KDV oranı zorunludur.</small>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="description" class="block font-bold mb-3">Açıklama</label>
                    <Textarea id="description" v-model="product.description" required="true" rows="3" cols="20" fluid />
                </div>
                <div class="col-span-12">
                    <label for="imageUpload" class="block font-bold mb-3">Ürün Görseli</label>
                    <div class="grid grid-cols-12 gap-4 items-center">
                        <div class="col-span-12 lg:col-span-8 flex flex-wrap gap-3 items-center">
                            <FileUpload mode="basic" name="productImage" accept="image/*" chooseLabel="Görsel Seç" customUpload :auto="false" @select="onImageSelected" />
                            <Button label="Yükle" icon="pi pi-upload" severity="secondary" :disabled="imageUploading" @click="uploadImage" />
                        </div>
                        <div class="col-span-12 lg:col-span-4">
                            <div class="h-24 w-full rounded-md border border-surface-200 bg-surface-50 flex items-center justify-center overflow-hidden">
                                <img v-if="imagePreviewUrl || product.image" :src="imagePreviewUrl || resolveImageUrl(product.image)" :alt="product.image" class="max-h-24 object-contain" />
                                <span v-else class="text-xs text-surface-500">Önizleme</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveProduct" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProductDialog" :style="{ width: '450px' }" header="Onay" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-3xl!" />
                <span v-if="product"
                    >Silmek istediğinize emin misiniz <b>{{ product.name }}</b
                    >?</span
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
                <span v-if="product">Seçili ürünleri silmek istediğinize emin misiniz?</span>
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
