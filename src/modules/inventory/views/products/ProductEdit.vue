<script setup lang="ts">
import { useToast } from 'primevue/usetoast';
import { onMounted, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { Product } from '@/modules/inventory/domain/product.entity';
import type { Currency } from '@/modules/inventory/domain/currency.entity';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/shared/utils/error';

const toast = useToast();
const router = useRouter();
const route = useRoute();

const productStore = useProductStore();
const lookupStore = useLookupStore();
const authStore = useAuthStore();

interface ProductForm {
    id?: string;
    companyId?: string;
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
    createdAt?: Date;
}

const product = ref<ProductForm>({});
const submitted = ref(false);
const imageFiles = ref<File[]>([]);
const imageUploading = ref(false);

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
    if (!product.value.currency_id) return 'USD';
    const curr = lookupStore.currencies.find((c: Currency) => c.id === product.value.currency_id);
    return curr ? curr.code : 'USD';
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

async function loadLookups() {
    await lookupStore.fetchAll();
}

async function loadProduct() {
    const id = route.params.id as string;
    if (id) {
        if (productStore.products.length === 0) {
            await productStore.fetchProducts();
        }
        const prod = productStore.products.find((p) => p.id === id);
        if (prod) {
            const obj = prod.toObject();
            product.value = {
                ...obj,
                category_id: obj.categoryId,
                brand_id: obj.brandId,
                type_id: obj.typeId,
                currency_id: obj.currencyId,
                tax_rate: obj.taxRate,
                price_unit: obj.priceUnit,
                min_stock: obj.minStock,
                max_stock: obj.maxStock,
                initial_stock: obj.initialStock
            };
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: 'Ürün bulunamadı', life: 3000 });
            router.push('/inventory/products');
        }
    }
}

onMounted(async () => {
    await Promise.all([loadLookups(), loadProduct()]);
});

function normalizeInventoryStatus(value: unknown): string | null {
    if (!value) return null;
    const resolved = typeof value === 'object' && value && 'value' in value ? (value as { value: unknown }).value : value;
    return typeof resolved === 'string' ? resolved.toUpperCase() : null;
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
        code: product.value.code?.trim() || ''
    };
}

function onImageSelected(event: { files?: File[]; target?: HTMLInputElement | null } | Event) {
    const files = 'files' in event && Array.isArray(event.files) ? event.files : (event as Event).target && 'files' in (event as Event).target ? Array.from(((event as Event).target as HTMLInputElement).files || []) : [];
    imageFiles.value = Array.from(files).slice(0, 6);
}

async function uploadImage() {
    if (!imageFiles.value.length) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen bir görsel seçin', life: 3000 });
        return;
    }
    imageUploading.value = true;
    const safeCode = product.value.code || Math.random().toString(36).substring(7);
    try {
        const uploads = await Promise.all(
            imageFiles.value.map(async (file: File) => {
                const fileName = `${safeCode}-${Date.now()}-${file.name}`;
                const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });
                if (error) throw error;
                const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
                return data.publicUrl;
            })
        );
        product.value.images = uploads;
        product.value.image = uploads[0] ?? product.value.image ?? 'product-placeholder.svg';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Görseller yüklendi', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(error), life: 3000 });
    } finally {
        imageUploading.value = false;
    }
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

    const payload = buildProductPayload();
    const productEntity = Product.create({
        id: product.value.id,
        companyId: product.value.companyId || authStore.user?.companyId || '',
        ...payload,
        categoryId: payload.category_id,
        brandId: payload.brand_id,
        typeId: payload.type_id,
        currencyId: payload.currency_id,
        taxRate: payload.tax_rate,
        priceUnit: payload.price_unit,
        minStock: payload.min_stock,
        maxStock: payload.max_stock,
        initialStock: payload.initial_stock,
        createdAt: product.value.createdAt || new Date()
    });

    const result = await productStore.saveProduct(productEntity);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün güncellendi', life: 3000 });
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
    <div class="flex flex-col gap-3">
        <!-- Bilgilendirme Card'ı -->
        <div class="card p-6 min-h-32 flex flex-col gap-3">
            <h4 class="m-0 text-xl font-bold">Ürün Düzenle: {{ product.name }}</h4>
            <div class="text-surface-600 dark:text-surface-400">
                <p>Ürün bilgilerini güncellerken stok miktarlarını kontrol etmeyi unutmayın.</p>
                <p>KDV oranı ve döviz birimi fiyatlandırma hesaplamalarını doğrudan etkiler.</p>
                <p>Değişiklikleri tamamladıktan sonra "Güncelle" butonu ile kaydedebilirsiniz.</p>
            </div>
        </div>

        <!-- Ana Form Card'ı -->
        <div class="card">
            <div class="grid grid-cols-12 gap-6 mb-6">
                <div class="col-span-12 lg:col-span-4">
                    <label for="name" class="block font-bold mb-3">Ürün Adı</label>
                    <InputText id="name" v-model.trim="product.name" required="true" :invalid="submitted && !product.name" fluid />
                    <small v-if="submitted && !product.name" class="text-red-500">Ürün adı zorunludur.</small>
                </div>

                <div class="col-span-12 lg:col-span-4">
                    <label for="barcode" class="block font-bold mb-3">Barkod / GTIN</label>
                    <InputText id="barcode" v-model.trim="product.barcode" fluid />
                </div>

                <div class="col-span-12 lg:col-span-4">
                    <label for="inventoryStatus" class="block font-bold mb-3">Stok Durumu</label>
                    <Select id="inventoryStatus" v-model="product.inventoryStatus" :options="statuses" optionLabel="label" optionValue="value" placeholder="Seçim Yap" fluid></Select>
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
                    <small v-if="submitted && (product.tax_rate === null || product.tax_rate === undefined)" class="text-red-500">KDV oran zorunludur.</small>
                </div>

                <div class="col-span-12 lg:col-span-4">
                    <label for="price" class="block font-bold mb-3">Fiyat (KDV Hariç)</label>
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
                    <small v-if="submitted && !product.price_unit" class="text-red-500">Birim zorunludur.</small>
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

                <div class="col-span-12 lg:col-span-4">
                    <label for="status" class="block font-bold mb-3">Durum</label>
                    <Select id="status" v-model="product.status" :options="productStatuses" optionLabel="label" optionValue="value" placeholder="Durum Seç" fluid></Select>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="description" class="block font-bold mb-3">Açıklama</label>
                    <Textarea id="description" v-model="product.description" rows="6" cols="20" fluid />
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="imageUpload" class="block font-bold mb-3">Ürün Görselleri (0/6)</label>
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-wrap gap-3 items-center">
                            <FileUpload mode="basic" name="productImages" accept="image/*" chooseLabel="Görsel Seç" customUpload :auto="false" multiple :fileLimit="6" @select="onImageSelected" />
                            <Button label="Yükle" icon="pi pi-upload" severity="secondary" :disabled="imageUploading" @click="uploadImage" />
                        </div>
                        <small class="text-surface-500">Seçilen: {{ imageFiles.length }}/6</small>
                    </div>
                </div>
            </div>

            <!-- İşlem Butonları - Alt Kısım -->
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Güncelle" icon="pi pi-check" class="w-full" @click="saveProduct" />
                </div>
            </div>
        </div>
    </div>
</template>
