<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { supabase } from '@/lib/supabase';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { Product, ProductProps } from '@/modules/inventory/domain/product.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
    initialData?: Partial<ProductProps>;
    isEdit?: boolean;
}>();

const emit = defineEmits(['save', 'cancel']);

const toast = useToast();
const router = useRouter();
const productStore = useProductStore();
const lookupStore = useLookupStore();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const discountTypes = ref([
    { label: 'Seçim Yok', value: 0 },
    { label: 'İskonto 1', value: 1 },
    { label: 'İskonto 2', value: 2 },
    { label: 'İskonto 3', value: 3 }
]);

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

const product = ref<any>({
    taxRate: 20,
    priceUnit: 'pcs',
    status: 'ACTIVE',
    inventoryStatus: 'TRACKED',
    categoryDiscount: 0,
    price: 0,
    images: []
});

const submitted = ref(false);
const imageUploading = ref(false);
const coverImageFile = ref<File | null>(null);
const coverImagePreview = ref<string | null>(null);
const additionalImageFiles = ref<(File | null)[]>([null, null, null, null, null, null]);
const additionalImagePreviews = ref<(string | null)[]>([null, null, null, null, null, null]);
const coverInputRef = ref<HTMLInputElement | null>(null);
const additionalInputRefs = ref<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);
const isDragOver = ref(false);

const selectedCurrencyCode = computed(() => {
    if (!product.value.currencyId) return 'USD';
    const curr = lookupStore.currencies.find((c: any) => c.id === product.value.currencyId);
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
    let count = coverImagePreview.value && coverImagePreview.value !== 'product-placeholder.svg' ? 1 : 0;
    count += additionalImagePreviews.value.filter(f => f !== null && f !== 'product-placeholder.svg').length;
    return count;
});

// Sync initialData
watch(() => props.initialData, (newVal) => {
    if (newVal) {
        product.value = { ...product.value, ...newVal };
        if (newVal.image && newVal.image !== 'product-placeholder.svg') {
            coverImagePreview.value = newVal.image;
        }
        if (newVal.images && newVal.images.length > 0) {
            newVal.images.forEach((img: string, idx: number) => {
                if (idx < additionalImagePreviews.value.length && img !== 'product-placeholder.svg') {
                    additionalImagePreviews.value[idx] = img;
                }
            });
        }
    }
}, { immediate: true });

async function generateNextProductCode(): Promise<string> {
    const serial = (settingsStore.settings?.productSerial || 'PRD').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'PRD';
    const startingNo = settingsStore.settings?.productStartingNumber || 1;

    // Optimization: Fetch only codes to reduce data overhead
    const { data: latestProducts } = await supabase
        .from('products')
        .select('code')
        .ilike('code', `${serial}-%`)
        .order('code', { ascending: false })
        .limit(50);

    const extractSequence = (code: string | undefined) => {
        if (!code) return null;
        const pattern = new RegExp(`^${serial}-?(\\d+)$`);
        const match = code.toUpperCase().trim().match(pattern);
        return match ? Number(match[1]) : null;
    };

    const sequences = (latestProducts || [])
        .map(p => extractSequence(p.code))
        .filter((v): v is number => v !== null);

    const maxSequence = sequences.length > 0 ? Math.max(...sequences) : startingNo - 1;
    const nextSequence = Math.max(startingNo, maxSequence + 1);

    return `${serial}-${String(nextSequence).padStart(5, '0')}`;
}

onMounted(async () => {
    await Promise.all([lookupStore.fetchAll(), settingsStore.fetchSettings()]);
    if (!props.isEdit && !product.value.code) {
        product.value.code = await generateNextProductCode();
    }
});

// Image Handlers
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
    product.value.image = 'product-placeholder.svg';
}
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
}

async function uploadImages(): Promise<{ mainUrl: string, allUrls: string[] }> {
    const safeCode = product.value.code || Math.random().toString(36).substring(7);
    let mainUrl = product.value.image || 'product-placeholder.svg';
    const allUrls: string[] = [];

    if (coverImageFile.value) {
        const fileName = `${safeCode}-${Date.now()}-cover-${coverImageFile.value.name}`;
        await supabase.storage.from('product-images').upload(fileName, coverImageFile.value, { upsert: true });
        mainUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
    }

    for (let i = 0; i < additionalImagePreviews.value.length; i++) {
        const file = additionalImageFiles.value[i];
        const preview = additionalImagePreviews.value[i];
        if (file) {
            const fileName = `${safeCode}-${Date.now()}-${i}-${file.name}`;
            await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });
            allUrls.push(supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl);
        } else if (preview && preview.startsWith('http')) {
            allUrls.push(preview);
        }
    }

    return { mainUrl, allUrls };
}

async function generateBarcode() {
    // Internal EAN-13 logic: 27 (Internal prefix) + 10 digits (timestamp partial) + 1 digit (check digit)
    const prefix = '27';
    const timestampStr = Date.now().toString();
    const mid = timestampStr.slice(-10);
    const barcodeWithoutCheckdigit = prefix + mid;

    // EAN-13 Checksum Calculation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(barcodeWithoutCheckdigit[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    product.value.barcode = barcodeWithoutCheckdigit + checkDigit.toString();
    toast.add({ severity: 'info', summary: 'Barkod Üretildi', detail: product.value.barcode, life: 2000 });
}

async function handleSubmit() {
    submitted.value = true;
    if (!product.value.name?.trim() || !product.value.currencyId || product.value.price === null) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları doldurun', life: 3000 });
        return;
    }

    imageUploading.value = true;
    try {
        const { mainUrl, allUrls } = await uploadImages();
        
        const payload: ProductProps = {
            ...product.value,
            id: props.isEdit ? product.value.id : crypto.randomUUID(),
            companyId: authStore.user?.companyId || product.value.companyId || '',
            image: mainUrl,
            images: allUrls,
            createdAt: product.value.createdAt || new Date()
        };

        const result = await productStore.saveProduct(Product.create(payload));
        if (result.success) {
            toast.add({ severity: 'success', summary: 'Başarılı', detail: props.isEdit ? 'Ürün güncellendi' : 'Ürün oluşturuldu' });
            emit('save');
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error) });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(error) });
    } finally {
        imageUploading.value = false;
    }
}
</script>

<template>
    <div class="flex gap-6 items-start">
        <!-- Main Form -->
        <div class="card flex-1 min-w-0">
            <div class="grid grid-cols-12 gap-6 mb-6">
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Ürün Kodu</label>
                    <InputText v-model.trim="product.code" placeholder="Otomatik" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Ürün Adı</label>
                    <InputText v-model.trim="product.name" :invalid="submitted && !product.name" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Barkod</label>
                    <InputGroup>
                        <InputText v-model.trim="product.barcode" fluid />
                        <InputGroupAddon>
                            <Button icon="pi pi-refresh" severity="secondary" text @click="generateBarcode" v-tooltip.top="'Barkod Üret'" />
                        </InputGroupAddon>
                    </InputGroup>
                </div>

                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Marka</label>
                    <Select v-model="product.brandId" :options="lookupStore.brands" optionLabel="name" optionValue="id" placeholder="Seçiniz" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Kategori</label>
                    <Select v-model="product.categoryId" :options="lookupStore.categories" optionLabel="name" optionValue="id" placeholder="Seçiniz" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Tip</label>
                    <Select v-model="product.typeId" :options="lookupStore.productTypes" optionLabel="name" optionValue="id" placeholder="Seçiniz" fluid />
                </div>

                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3 text-primary font-bold underline">Kategori İskonto Tipi</label>
                    <Select v-model="product.categoryDiscount" :options="discountTypes" optionLabel="label" optionValue="value" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">KDV</label>
                    <Select v-model="product.taxRate" :options="taxRates" optionLabel="label" optionValue="value" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Birim</label>
                    <Select v-model="product.priceUnit" :options="priceUnits" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Fiyat</label>
                    <InputNumber v-model="product.price" mode="currency" :currency="selectedCurrencyCode" :locale="selectedCurrencyLocale" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Döviz</label>
                    <Select v-model="product.currencyId" :options="lookupStore.currencies" optionLabel="code" optionValue="id" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Stok Takibi</label>
                    <Select v-model="product.inventoryStatus" :options="statuses" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3 italic">Min Stok</label>
                    <InputNumber v-model="product.minStock" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3 italic">Max Stok</label>
                    <InputNumber v-model="product.maxStock" fluid />
                </div>
                <div class="col-span-12 lg:col-span-4 text-left">
                    <label class="block font-semibold mb-3">Başlangıç Stok</label>
                    <InputNumber v-model="product.initialStock" fluid />
                </div>

                <div class="col-span-12 text-left">
                    <label class="block font-semibold mb-3 font-bold text-surface-400">Açıklama</label>
                    <Textarea v-model="product.description" rows="3" fluid />
                </div>
            </div>

            <div class="flex gap-4 mt-6">
                <Button label="İptal" icon="pi pi-times" severity="secondary" @click="$emit('cancel')" class="flex-1" />
                <Button label="Kaydet" icon="pi pi-check" :loading="imageUploading" @click="handleSubmit" class="flex-1" />
            </div>
        </div>

        <!-- Image Panel -->
        <div class="card flex-shrink-0 flex flex-col gap-4" style="width: 300px;">
            <h5 class="m-0 font-semibold text-base">Görseller ({{ totalImageCount }} / 7)</h5>
            
            <div class="relative rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 transition-all aspect-square overflow-hidden cursor-pointer hover:border-primary"
                 @click="coverInputRef?.click()">
                <img v-if="coverImagePreview" :src="coverImagePreview" class="w-full h-full object-cover" />
                <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-surface-400">
                    <i class="pi pi-image text-3xl mb-2"></i>
                    <span class="text-xs">Kapak Görseli</span>
                </div>
                <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="onCoverFileSelected" />
                <Button v-if="coverImagePreview" icon="pi pi-times" severity="danger" rounded text class="absolute top-2 right-2 !w-8 !h-8 bg-white/80" @click.stop="removeCoverImage" />
            </div>

            <div class="grid grid-cols-3 gap-2">
                <div v-for="(preview, idx) in additionalImagePreviews" :key="idx" 
                     class="relative rounded-lg border border-dashed border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 aspect-square overflow-hidden cursor-pointer hover:border-primary"
                     @click="additionalInputRefs[idx]?.click()">
                    <img v-if="preview" :src="preview" class="w-full h-full object-cover" />
                    <i v-else class="pi pi-plus text-surface-300 m-auto"></i>
                    <input :ref="(el: any) => additionalInputRefs[idx] = el" type="file" accept="image/*" class="hidden" @change="onAdditionalFileSelected($event, idx)" />
                    <Button v-if="preview" icon="pi pi-times" severity="danger" rounded text class="absolute top-1 right-1 !w-6 !h-6 bg-white/80" @click.stop="removeAdditionalImage(idx)" />
                </div>
            </div>
        </div>
    </div>
</template>
