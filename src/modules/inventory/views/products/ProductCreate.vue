<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { supabase } from '@/lib/supabase';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { Product } from '@/modules/inventory/domain/product.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

const productStore = useProductStore();
const lookupStore = useLookupStore();
const authStore = useAuthStore();

interface ProductForm {
    name?: string;
    description?: string;
    price?: number | null;
    currency_id?: string | null;
    tax_rate?: number | null;
    price_unit?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    type_id?: string | null;
    inventoryStatus?: string | null;
    initial_stock?: number | null;
    min_stock?: number | null;
    max_stock?: number | null;
    barcode?: string | null;
    status?: string;
    images?: string[];
    image?: string;
    code?: string;
}

const product = ref<ProductForm>({
    tax_rate: 20,
    price_unit: 'pcs',
    status: 'ACTIVE',
    inventoryStatus: 'TRACKED'
});
const submitted = ref(false);
const imageUploading = ref(false);

// Cover image state
const coverImageFile = ref<File | null>(null);
const coverImagePreview = ref<string | null>(null);
const isDragOver = ref(false);
const coverInputRef = ref<HTMLInputElement | null>(null);

// Additional images (3 slots)
const additionalImageFiles = ref<(File | null)[]>([null, null, null, null, null, null]);
const additionalImagePreviews = ref<(string | null)[]>([null, null, null, null, null, null]);
const additionalInputRefs = ref<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

const statuses = ref([
    { label: 'Evet', value: 'TRACKED' },
    { label: 'Hayır', value: 'UNTRACKED' }
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
    if (!product.value.currency_id) return 'USD';
    const curr = lookupStore.currencies.find((c) => c.id === product.value.currency_id);
    return curr ? curr.code : 'USD';
});

const selectedCurrencyLocale = computed(() => {
    switch (selectedCurrencyCode.value) {
        case 'TRY': return 'tr-TR';
        case 'EUR': return 'de-DE';
        case 'USD':
        default: return 'en-US';
    }
});

const totalImageCount = computed(() => {
    let count = coverImageFile.value ? 1 : 0;
    count += additionalImageFiles.value.filter(f => f !== null).length;
    return count;
});

async function loadLookups() {
    await lookupStore.fetchAll();
}

onMounted(() => {
    loadLookups();
});

function normalizeInventoryStatus(value: unknown): string | null {
    if (!value) return null;
    const resolved = typeof value === 'object' && value && 'value' in value ? (value as { value: unknown }).value : value;
    return typeof resolved === 'string' ? resolved.toUpperCase() : null;
}

function createId() {
    let id = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function buildProductPayload() {
    return {
        name: product.value.name?.trim() || '',
        description: product.value.description || '',
        price: product.value.price || null,
        currency_id: product.value.currency_id || null,
        tax_rate: product.value.tax_rate || 0,
        price_unit: product.value.price_unit || 'pcs',
        category_id: product.value.category_id || null,
        brand_id: product.value.brand_id || null,
        type_id: product.value.type_id || null,
        inventoryStatus: normalizeInventoryStatus(product.value.inventoryStatus),
        initial_stock: product.value.initial_stock || null,
        min_stock: product.value.min_stock || null,
        max_stock: product.value.max_stock || null,
        barcode: product.value.barcode?.trim() || null,
        status: product.value.status || 'ACTIVE',
        images: product.value.images ?? [],
        image: product.value.image || 'product-placeholder.svg',
        code: product.value.code?.trim() || createId()
    };
}

// Cover image handlers
function onCoverDragOver(e: DragEvent) {
    e.preventDefault();
    isDragOver.value = true;
}
function onCoverDragLeave() {
    isDragOver.value = false;
}
function onCoverDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver.value = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) setCoverImage(file);
}
function onCoverFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) setCoverImage(file);
}
function setCoverImage(file: File) {
    coverImageFile.value = file;
    const reader = new FileReader();
    reader.onload = (ev) => { coverImagePreview.value = ev.target?.result as string; };
    reader.readAsDataURL(file);
}
function removeCoverImage() {
    coverImageFile.value = null;
    coverImagePreview.value = null;
    if (coverInputRef.value) coverInputRef.value.value = '';
}

// Additional image handlers
function onAdditionalFileSelected(e: Event, index: number) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) setAdditionalImage(file, index);
}
function setAdditionalImage(file: File, index: number) {
    additionalImageFiles.value[index] = file;
    const reader = new FileReader();
    reader.onload = (ev) => { additionalImagePreviews.value[index] = ev.target?.result as string; };
    reader.readAsDataURL(file);
}
function removeAdditionalImage(index: number) {
    additionalImageFiles.value[index] = null;
    additionalImagePreviews.value[index] = null;
    if (additionalInputRefs.value[index]) additionalInputRefs.value[index]!.value = '';
}

async function uploadAllImages(): Promise<string[]> {
    const safeCode = product.value.code ?? createId();
    const allFiles: File[] = [];
    if (coverImageFile.value) allFiles.push(coverImageFile.value);
    additionalImageFiles.value.forEach(f => { if (f) allFiles.push(f); });
    if (!allFiles.length) return [];

    const uploads = await Promise.all(
        allFiles.map(async (file: File) => {
            const fileName = `${safeCode}-${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
            return data.publicUrl;
        })
    );
    return uploads;
}

async function saveProduct() {
    submitted.value = true;
    if (!product.value?.name?.trim()) return;
    if (!product.value.currency_id || product.value.price === null || product.value.price === undefined) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Fiyat ve döviz zorunludur', life: 3000 });
        return;
    }
    if (!product.value.category_id || !product.value.brand_id || !product.value.type_id) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Kategori, marka ve tip zorunludur', life: 3000 });
        return;
    }

    imageUploading.value = true;
    try {
        const uploadedUrls = await uploadAllImages();
        if (uploadedUrls.length > 0) {
            product.value.images = uploadedUrls;
            product.value.image = uploadedUrls[0];
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(error), life: 3000 });
        imageUploading.value = false;
        return;
    }
    imageUploading.value = false;

    const payload = buildProductPayload();
    const productEntity = Product.create({
        id: crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        name: payload.name,
        description: payload.description,
        price: payload.price ?? 0,
        status: payload.status,
        images: payload.images,
        image: payload.image,
        code: payload.code,
        barcode: payload.barcode ?? undefined,
        inventoryStatus: payload.inventoryStatus ?? undefined,
        categoryId: payload.category_id ?? undefined,
        brandId: payload.brand_id ?? undefined,
        typeId: payload.type_id ?? undefined,
        currencyId: payload.currency_id ?? undefined,
        taxRate: payload.tax_rate,
        priceUnit: payload.price_unit,
        minStock: payload.min_stock ?? undefined,
        maxStock: payload.max_stock ?? undefined,
        initialStock: payload.initial_stock ?? undefined,
        createdAt: new Date()
    });

    const result = await productStore.saveProduct(productEntity);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün oluşturuldu', life: 3000 });
        router.push('/inventory/products');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/inventory/products');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <!-- Header Card -->
        <div class="card p-6 min-h-32 flex flex-col gap-0">
            <h4 class="m-0 text-xl font-bold">Yeni Ürün Oluştur</h4>
            <div class="text-surface-600 dark:text-surface-400">
                <p>Ürün oluşturma işlemi sırasında tüm zorunlu alanları doldurduğunuzdan emin olun.</p>
            </div>
        </div>

        <!-- Main Content: Form (left) + Image Panel (right) -->
        <div class="flex gap-6 items-start">

            <!-- LEFT: Form Card -->
            <div class="card flex-1 min-w-0">
                <div class="grid grid-cols-12 gap-6 mb-6">

                    <div class="col-span-12 lg:col-span-4">
                        <label for="name" class="block font-bold mb-3">Ürün Adı</label>
                        <InputText id="name" v-model.trim="product.name" required="true" autofocus :invalid="submitted && !product.name" fluid />
                        <small v-if="submitted && !product.name" class="text-red-500">Ürün adı zorunludur.</small>
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="barcode" class="block font-bold mb-3">Barkod / GTIN</label>
                        <InputText id="barcode" v-model.trim="product.barcode" fluid />
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="inventoryStatus" class="block font-bold mb-3">Stok Takibi</label>
                        <Select id="inventoryStatus" v-model="product.inventoryStatus" :options="statuses" optionLabel="label" optionValue="value" placeholder="Seçim Yap" fluid />
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="brand" class="block font-bold mb-3">Marka</label>
                        <Select id="brand" v-model="product.brand_id" :options="lookupStore.brands" optionLabel="name" optionValue="id" placeholder="Marka Seç" fluid />
                        <small v-if="submitted && !product.brand_id" class="text-red-500">Marka zorunludur.</small>
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="category" class="block font-bold mb-3">Kategori</label>
                        <Select id="category" v-model="product.category_id" :options="lookupStore.categories" optionLabel="name" optionValue="id" placeholder="Kategori Seç" fluid />
                        <small v-if="submitted && !product.category_id" class="text-red-500">Kategori zorunludur.</small>
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="type" class="block font-bold mb-3">Tip</label>
                        <Select id="type" v-model="product.type_id" :options="lookupStore.productTypes" optionLabel="name" optionValue="id" placeholder="Tip Seç" fluid />
                        <small v-if="submitted && !product.type_id" class="text-red-500">Tip zorunludur.</small>
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="taxRate" class="block font-bold mb-3">KDV Oran</label>
                        <Select id="taxRate" v-model="product.tax_rate" :options="taxRates" optionLabel="label" optionValue="value" placeholder="KDV Oranı Seç" fluid />
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="price" class="block font-bold mb-3">Fiyat ( KDV Hariç )</label>
                        <InputNumber id="price" v-model="product.price" mode="currency" :currency="selectedCurrencyCode" :locale="selectedCurrencyLocale" fluid />
                        <small v-if="submitted && (product.price === null || product.price === undefined)" class="text-red-500">Fiyat zorunludur.</small>
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="currency" class="block font-bold mb-3">Döviz</label>
                        <Select id="currency" v-model="product.currency_id" :options="lookupStore.currencies" optionLabel="code" optionValue="id" placeholder="Döviz Seç" fluid />
                        <small v-if="submitted && !product.currency_id" class="text-red-500">Döviz zorunludur.</small>
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="priceUnit" class="block font-bold mb-3">Birim</label>
                        <Select id="priceUnit" v-model="product.price_unit" :options="priceUnits" optionLabel="label" optionValue="value" placeholder="Birim Seç" fluid />
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="minStock" class="block font-bold mb-3">Minimum Stok</label>
                        <InputNumber id="minStock" v-model="product.min_stock" integeronly fluid />
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="maxStock" class="block font-bold mb-3">Maksimum Stok</label>
                        <InputNumber id="maxStock" v-model="product.max_stock" integeronly fluid />
                    </div>

                    <div class="col-span-12 lg:col-span-4">
                        <label for="initialStock" class="block font-bold mb-3">Mevcut Stok (Başlangıç)</label>
                        <InputNumber id="initialStock" v-model="product.initial_stock" integeronly fluid />
                    </div>

                    <div class="col-span-12 lg:col-span-8">
                        <label for="description" class="block font-bold mb-3">Açıklama</label>
                        <Textarea id="description" v-model="product.description" rows="1" cols="20" fluid />
                    </div>    

                    <div class="col-span-12 lg:col-span-12">
                        <label for="status" class="block font-bold mb-3">Durum</label>
                        <Select id="status" v-model="product.status" :options="productStatuses" optionLabel="label" optionValue="value" placeholder="Durum Seç" fluid />
                    </div>



                </div>

                <!-- Action Buttons -->
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6 mt-12">
                        <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                    </div>
                    <div class="col-span-6 mt-12">
                        <Button label="Kaydet" icon="pi pi-check" class="w-full" :loading="imageUploading" @click="saveProduct" />
                    </div>
                </div>
            </div>

            <!-- RIGHT: Image Upload Panel -->
            <div class="card flex-shrink-0 flex flex-col gap-4" style="width: 320px;">
                <h5 class="m-0 font-bold text-base">Ürün Görseli</h5>

                <!-- Cover Image Drop Zone -->
                <div
                    class="relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden"
                    :class="[
                        coverImagePreview ? 'border-transparent cursor-default' : 'cursor-pointer',
                        isDragOver
                            ? 'border-primary bg-primary/5'
                            : !coverImagePreview ? 'border-surface-200 dark:border-surface-700 hover:border-surface-400 dark:hover:border-surface-500 bg-surface-50 dark:bg-surface-800' : ''
                    ]"
                    style="height: 220px;"
                    @dragover="onCoverDragOver"
                    @dragleave="onCoverDragLeave"
                    @drop="onCoverDrop"
                    @click="!coverImagePreview && coverInputRef?.click()"
                >
                    <!-- Preview -->
                    <template v-if="coverImagePreview">
                        <img :src="coverImagePreview" alt="Kapak Görseli" class="w-full h-full object-cover" />
                        <button
                            type="button"
                            class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                            @click.stop="removeCoverImage"
                        >
                            <i class="pi pi-times text-xs"></i>
                        </button>
                    </template>

                    <!-- Empty State -->
                    <template v-else>
                        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                            <div class="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                                <i class="pi pi-cloud-upload text-xl text-surface-400 dark:text-surface-500"></i>
                            </div>
                            <p class="text-sm text-surface-500 dark:text-surface-400 text-center font-medium m-0">
                                Kapak görselini bırakın veya seçin
                            </p>
                            <span class="text-sm text-primary underline font-semibold hover:opacity-80 transition-opacity">
                                Yükle
                            </span>
                        </div>
                    </template>

                    <input
                        ref="coverInputRef"
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="onCoverFileSelected"
                    />
                </div>

                <!-- Additional Image Slots (3 slots) -->
                <div class="grid grid-cols-3 gap-2">
                    <div
                        v-for="(preview, idx) in additionalImagePreviews"
                        :key="idx"
                        class="relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden"
                        :class="[
                            preview
                                ? 'border-transparent cursor-default'
                                : 'border-surface-200 dark:border-surface-700 hover:border-surface-400 dark:hover:border-surface-500 bg-surface-50 dark:bg-surface-800 cursor-pointer'
                        ]"
                        style="height: 88px;"
                        @click="!preview && additionalInputRefs[idx]?.click()"
                    >
                        <!-- Preview -->
                        <template v-if="preview">
                            <img :src="preview" alt="Ürün Görseli" class="w-full h-full object-cover rounded-xl" />
                            <button
                                type="button"
                                class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors z-10"
                                @click.stop="removeAdditionalImage(idx)"
                            >
                                <i class="pi pi-times" style="font-size: 0.55rem;"></i>
                            </button>
                        </template>

                        <!-- Empty Slot -->
                        <template v-else>
                            <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                <i class="pi pi-cloud-upload text-surface-300 dark:text-surface-600" style="font-size: 1.1rem;"></i>
                                <span class="text-xs text-primary underline font-medium">Yükle</span>
                            </div>
                        </template>

                        <input
                            :ref="(el) => { additionalInputRefs[idx] = el as HTMLInputElement | null }"
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="(e) => onAdditionalFileSelected(e, idx)"
                        />
                    </div>
                </div>

                <!-- Image count -->
                <p class="text-xs text-surface-400 dark:text-surface-500 text-center m-0">
                    {{ totalImageCount }} / 7 görsel seçildi
                </p>
            </div>

        </div>
    </div>
</template>
