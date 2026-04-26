<script setup lang="ts">
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const productStore = useProductStore();
const lookupStore = useLookupStore();

const productId = route.params.id as string;
const product = computed(() => productStore.products.find((p) => p.id === productId));

onMounted(async () => {
    if (productStore.products.length === 0) {
        await productStore.fetchProducts();
    }
    if (lookupStore.currencies.length === 0) {
        await lookupStore.fetchAll();
    }
});

const getBrandName = (id?: string) => lookupStore.brands.find((b) => b.id === id)?.name || '—';
const getCategoryName = (id?: string) => lookupStore.categories.find((c) => c.id === id)?.name || '—';
const getTypeName = (id?: string) => lookupStore.productTypes.find((t) => t.id === id)?.name || '—';
const getCurrencyCode = (id?: string) => lookupStore.currencies.find((c) => c.id === id)?.code || '—';

const getPriceUnitLabel = (unit?: string) => {
    const units: Record<string, string> = {
        pcs: 'Adet',
        pack: 'Paket',
        carton: 'Koli',
        pallet: 'Palet',
        kg: 'Kg',
        ton: 'Ton',
        lt: 'Lt',
        m: 'Metre',
        m2: 'Metrekare',
        m3: 'Metreküp',
        set: 'Set',
        box: 'Kutu'
    };
    return unit ? units[unit] || unit : '—';
};

const formatCurrency = (value: number, currencyId?: string) => {
    const code = getCurrencyCode(currencyId);
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: code === '—' ? 'TRY' : code }).format(value);
};

const activeImage = ref<string | null>(null);

const allImages = computed(() => {
    if (!product.value) return [];
    const images = [...(product.value.images || [])];
    if (product.value.image && !images.includes(product.value.image)) {
        images.unshift(product.value.image);
    }
    return images;
});

onMounted(() => {
    if (allImages.value.length > 0) {
        activeImage.value = allImages.value[0];
    }
});

function goBack() {
    router.push('/inventory/products');
}

function editProduct() {
    router.push(`/inventory/products/edit/${productId}`);
}
</script>

<template>
    <div class="flex flex-col gap-4 max-w-[1400px] mx-auto">
        <!-- Compact Header -->
        <div class="flex items-center justify-between bg-surface-0 dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
            <div class="flex items-center gap-3">
                <Button icon="pi pi-arrow-left" text rounded @click="goBack" class="!w-10 !h-10" />
                <div>
                    <h1 class="text-xl font-bold m-0 leading-tight">{{ product?.name || 'Ürün Detayı' }}</h1>
                    <div class="flex items-center gap-2 text-sm text-surface-500 mt-0.5">
                        <span class="font-medium px-2 py-0.5 bg-surface-100 dark:bg-surface-800 rounded">{{ product?.code || 'Kod Yok' }}</span>
                        <span v-if="product?.barcode" class="flex items-center gap-1">
                            <i class="pi pi-barcode text-xs"></i>
                            {{ product.barcode }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex gap-2">
                <Button label="Düzenle" icon="pi pi-pencil" outlined size="small" @click="editProduct" />
                <Button icon="pi pi-times" severity="secondary" text rounded @click="goBack" />
            </div>
        </div>

        <div v-if="product" class="grid grid-cols-12 gap-4">
            <!-- Left Panel: Images & Status -->
            <div class="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <div class="bg-surface-0 dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                    <!-- Main Image -->
                    <div class="relative aspect-square rounded-lg overflow-hidden bg-surface-50 dark:bg-surface-800 border border-surface-100 dark:border-surface-800 mb-4">
                        <img v-if="activeImage" :src="activeImage" class="w-full h-full object-contain p-2" alt="Product Image" />
                        <div v-else class="w-full h-full flex flex-col items-center justify-center text-surface-300">
                            <i class="pi pi-image text-5xl"></i>
                        </div>
                    </div>
                    
                    <!-- Thumbnails -->
                    <div v-if="allImages.length > 1" class="flex gap-2 overflow-x-auto pb-1">
                        <div 
                            v-for="(img, idx) in allImages" :key="idx"
                            @click="activeImage = img"
                            class="w-16 h-16 rounded-md overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0"
                            :class="activeImage === img ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'"
                        >
                            <img :src="img" class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>

                <!-- Quick Status Card -->
                <div class="bg-surface-0 dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                    <div class="flex items-center justify-between mb-3 pb-2 border-b border-surface-100 dark:border-surface-800">
                        <span class="text-sm font-semibold text-surface-600 uppercase tracking-wider">Durum & Takip</span>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-surface-500">Yayın Durumu</span>
                            <Tag :severity="product.status === 'ACTIVE' ? 'success' : 'danger'" :value="product.status === 'ACTIVE' ? 'Aktif' : 'Pasif'" pt:root:class="!text-[10px] !px-2 !py-0" />
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-surface-500">Stok Takibi</span>
                            <Tag :severity="product.inventoryStatus === 'TRACKED' ? 'info' : 'secondary'" :value="product.inventoryStatus === 'TRACKED' ? 'Aktif' : 'Pasif'" pt:root:class="!text-[10px] !px-2 !py-0" />
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-surface-500">Vergi Oranı</span>
                            <span class="text-sm font-bold">%{{ product.taxRate }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Panel: Info & Specs -->
            <div class="col-span-12 lg:col-span-8 flex flex-col gap-4">
                <!-- Highlights Bar -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                        <span class="block text-xs font-semibold text-primary/60 uppercase mb-1">Satış Fiyatı</span>
                        <span class="text-2xl font-black text-primary">{{ formatCurrency(product.price, product.currencyId) }}</span>
                    </div>
                    <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 rounded-xl shadow-sm">
                        <span class="block text-xs font-semibold text-surface-400 uppercase mb-1">Mevcut Stok</span>
                        <span class="text-2xl font-black text-surface-900 dark:text-surface-0">{{ product.initialStock || 0 }} <small class="text-xs font-normal text-surface-400">{{ getPriceUnitLabel(product.priceUnit) }}</small></span>
                    </div>
                    <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 rounded-xl shadow-sm">
                        <span class="block text-xs font-semibold text-surface-400 uppercase mb-1">Kategori</span>
                        <span class="text-base font-bold truncate block">{{ getCategoryName(product.categoryId) }}</span>
                    </div>
                </div>

                <!-- Detailed Information -->
                <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden flex-1">
                    <div class="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
                        <h2 class="text-sm font-bold m-0 uppercase tracking-widest text-surface-500">Ürün Detayları</h2>
                        <span class="text-[10px] bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded font-mono text-surface-400">ID: {{ product.id.split('-')[0] }}</span>
                    </div>
                    
                    <div class="p-6">
                        <div class="grid grid-cols-2 gap-x-12 gap-y-8">
                            <!-- Column 1 -->
                            <div class="space-y-6">
                                <div class="flex flex-col">
                                    <label class="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Marka</label>
                                    <p class="text-base font-semibold text-surface-800 dark:text-surface-100 m-0">{{ getBrandName(product.brandId) }}</p>
                                </div>
                                <div class="flex flex-col">
                                    <label class="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Ürün Tipi</label>
                                    <p class="text-base font-semibold text-surface-800 dark:text-surface-100 m-0">{{ getTypeName(product.typeId) }}</p>
                                </div>
                                <div class="flex flex-col">
                                    <label class="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Birim</label>
                                    <p class="text-base font-semibold text-surface-800 dark:text-surface-100 m-0">{{ getPriceUnitLabel(product.priceUnit) }}</p>
                                </div>
                            </div>
                            
                            <!-- Column 2 -->
                            <div class="space-y-6">
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex flex-col">
                                        <label class="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Min. Stok</label>
                                        <p class="text-base font-semibold text-surface-800 dark:text-surface-100 m-0">{{ product.minStock || 'Belirtilmemiş' }}</p>
                                    </div>
                                    <div class="flex flex-col">
                                        <label class="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Max. Stok</label>
                                        <p class="text-base font-semibold text-surface-800 dark:text-surface-100 m-0">{{ product.maxStock || 'Belirtilmemiş' }}</p>
                                    </div>
                                </div>
                                <div class="flex flex-col">
                                    <label class="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Açıklama</label>
                                    <p class="text-sm font-semibold leading-relaxed text-surface-600 dark:text-surface-400 italic m-0">
                                        {{ product.description || 'Bu ürün için açıklama girilmemiş.' }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Technical Timeline or Specs -->
                        <div class="mt-12 pt-8 border-t border-dashed border-surface-200 dark:border-surface-700 flex gap-8">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                                    <i class="pi pi-calendar text-surface-400 text-xs"></i>
                                </div>
                                <div>
                                    <span class="block text-[10px] text-surface-400 uppercase font-bold">Eklenme Tarihi</span>
                                    <span class="text-xs font-medium">{{ new Date(product.createdAt).toLocaleDateString('tr-TR') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-else class="flex flex-col items-center justify-center py-20 gap-4">
            <i class="pi pi-spin pi-spinner text-4xl text-surface-400"></i>
            <span class="text-surface-400 font-medium">Veriler yükleniyor...</span>
        </div>
    </div>
</template>
