<script setup lang="ts">
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import * as JsBarcodeModule from 'jsbarcode';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const JsBarcode = (JsBarcodeModule as any).default || JsBarcodeModule;

const route = useRoute();
const router = useRouter();
const productStore = useProductStore();
const invStore = useInventoryStore();
const lookupStore = useLookupStore();

const productId = route.params.id as string;
const product = computed(() => productStore.products.find((p) => p.id === productId));

const barcodeDialogVisible = ref(false);
const printQuantity = ref(1);
const barcodeSvgRef = ref<any>(null);

onMounted(async () => {
    if (productStore.products.length === 0) {
        await productStore.fetchProducts();
    }
    if (lookupStore.currencies.length === 0) {
        await lookupStore.fetchAll();
    }
    await invStore.fetchBalances();
    await invStore.fetchMovements(productId);
});

const productMovements = computed(() => {
    return invStore.movements.filter(m => m.productId === productId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

const getWarehouseName = (id: string) => invStore.warehouses.find(w => w.id === id)?.name || id;

function openBarcodePrint() {
    barcodeDialogVisible.value = true;
    nextTick(() => {
        if (product.value?.barcode && barcodeSvgRef.value) {
            JsBarcode(barcodeSvgRef.value, product.value.barcode, {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 14,
                margin: 10
            });
        }
    });
}

function printLabels() {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const barcodeHtml = barcodeSvgRef.value.outerHTML;
    const productName = product.value?.name || '';
    const productCode = product.value?.code || '';
    const productPrice = formatCurrency(product.value?.price || 0, product.value?.currencyId);

    let labelsContent = '';
    for (let i = 0; i < printQuantity.value; i++) {
        labelsContent += `
            <div class="label">
                <div class="header">PYRAMID ERP</div>
                <div class="product-name">${productName}</div>
                <div class="barcode">${barcodeHtml}</div>
                <div class="footer">
                    <span>${productCode}</span>
                    <span class="price">${productPrice}</span>
                </div>
            </div>
        `;
    }

    printWindow.document.write(`
        <html>
            <head>
                <style>
                    @page { margin: 0; size: 40mm 25mm; }
                    body { margin: 0; padding: 0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; }
                    .label { 
                        width: 40mm; height: 25mm; 
                        padding: 1mm; box-sizing: border-box; 
                        display: flex; flex-direction: column; 
                        justify-content: space-between; 
                        page-break-after: always;
                        text-align: center;
                    }
                    .header { font-size: 6px; font-weight: bold; color: #666; border-bottom: 0.1mm solid #eee; padding-bottom: 0.5mm; }
                    .product-name { font-size: 7px; font-weight: bold; margin-top: 1mm; max-height: 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                    .barcode { transform: scale(0.65); transform-origin: top center; margin-top: -5px; }
                    .footer { display: flex; justify-content: space-between; font-size: 6px; font-weight: bold; margin-top: -12px; padding: 0 1mm; }
                    .price { font-size: 7px; color: #000; }
                    svg { width: 100%; height: auto; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                ${labelsContent}
            </body>
        </html>
    `);
    printWindow.document.close();
}

function getMovementTypeLabel(type: string) {
    const map: Record<string, string> = {
        in: 'Giriş',
        out: 'Çıkış',
        transfer: 'Transfer',
        adjustment: 'Düzeltme'
    };
    return map[type] || type;
}

function getMovementSeverity(type: string) {
    const map: Record<string, 'success' | 'danger' | 'info' | 'warn'> = {
        in: 'success',
        out: 'danger',
        transfer: 'info',
        adjustment: 'warn'
    };
    return map[type] || 'secondary';
}

const getBrandName = (id?: string) => lookupStore.brands.find((b) => b.id === id)?.name || '—';
const getCategoryName = (id?: string) => lookupStore.categories.find((c) => c.id === id)?.name || '—';
const getTypeName = (id?: string) => lookupStore.productTypes.find((t) => t.id === id)?.name || '—';
const getCurrencyCode = (id?: string) => lookupStore.currencies.find((c) => c.id === id)?.code || '—';
const getDiscountTypeLabel = (value?: number) => {
    switch (value) {
        case 1: return 'İskonto 1';
        case 2: return 'İskonto 2';
        case 3: return 'İskonto 3';
        default: return 'Belirtilmemiş';
    }
};

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
    <div class="flex flex-col gap-4 w-full">
        <!-- Compact Header -->
        <div class="flex items-center justify-between bg-surface-0 dark:bg-surface-900 px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
            <div class="flex items-center gap-3">
                <Button icon="pi pi-arrow-left" text rounded @click="goBack" class="!w-8 !h-8" />
                <div>
                    <h4 class="text-base font-bold m-0 leading-tight text-surface-900 dark:text-surface-0">{{ product?.name || 'Ürün Detayı' }}</h4>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-lg font-normal py-0.5 text-primary">{{ product?.code || 'Kod Yok' }}</span>
                        <span v-if="product?.barcode" class="flex items-center gap-1.5 text-xs text-surface-500 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">
                            <i class="pi pi-barcode"></i>
                            {{ product.barcode }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex gap-1.5">
                <Button v-if="product?.barcode" icon="pi pi-barcode" severity="secondary" text size="small" @click="openBarcodePrint" v-tooltip.top="'Barkod Yazdır'" />
                <Button label="Düzenle" icon="pi pi-pencil" outlined size="medium" @click="editProduct" />
                <Button icon="pi pi-times" severity="secondary" text rounded @click="goBack" class="!w-8 !h-8" />
            </div>
        </div>

        <div v-if="product" class="grid grid-cols-12 gap-4">
            <!-- Left Panel: Summary & Details -->
            <div class="col-span-12 lg:col-span-6 flex flex-col gap-4">
                <!-- Image & Vital Stats Card -->
                <div class="bg-surface-0 dark:bg-surface-900 p-5 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                    <div class="flex gap-8 items-start">
                        <div class="w-48 flex flex-col gap-3 flex-shrink-0">
                            <div class="aspect-square rounded-xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-800 flex items-center justify-center overflow-hidden shadow-inner">
                                <img v-if="activeImage" :src="activeImage" class="w-full h-full object-contain p-3" />
                                <i v-else class="pi pi-image text-4xl text-surface-300"></i>
                            </div>
                            <!-- Micro Thumbnails -->
                            <div v-if="allImages.length > 1" class="flex gap-2 overflow-x-auto no-scrollbar justify-center">
                                <div 
                                    v-for="(img, idx) in allImages" :key="idx"
                                    @click="activeImage = img"
                                    class="w-10 h-10 rounded-md overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0"
                                    :class="activeImage === img ? 'border-primary' : 'border-surface-200 opacity-60 hover:opacity-100'"
                                >
                                    <img :src="img" class="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>
                        <div class="flex-1 flex flex-col gap-4 self-stretch justify-center">
                            <div class="bg-primary/5 px-5 py-4 rounded-2xl border border-primary/20">
                                <span class="block text-xs font-bold text-primary/60 uppercase tracking-widest mb-2">Satış Fiyatı</span>
                                <span class="text-3xl font-black text-primary">{{ formatCurrency(product.price, product.currencyId) }}</span>
                            </div>
                            <div class="bg-surface-50 dark:bg-surface-800/50 px-5 py-4 rounded-2xl border border-surface-100 dark:border-surface-700">
                                <span class="block text-xs font-bold text-surface-400 uppercase tracking-widest mb-2">Mevcut Stok</span>
                                <span class="text-3xl font-black text-surface-800 dark:text-surface-100">
                                    {{ invStore.getTotalBalance(product.id) }} 
                                    <small class="text-base font-normal text-surface-400">{{ getPriceUnitLabel(product.priceUnit) }}</small>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Full Detailed Identification -->
                <div class="bg-surface-0 dark:bg-surface-900 p-6 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col gap-8">
                    <!-- Tech Grid -->
                    <div class="grid grid-cols-2 gap-x-12 gap-y-6">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Marka</span>
                            <span class="text-lg font-semibold truncate text-surface-700 dark:text-surface-200">{{ getBrandName(product.brandId) }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Kategori</span>
                            <span class="text-lg font-semibold truncate text-surface-700 dark:text-surface-200">{{ getCategoryName(product.categoryId) }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Ürün Tipi</span>
                            <span class="text-lg font-semibold truncate text-surface-700 dark:text-surface-200">{{ getTypeName(product.typeId) }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Birim</span>
                            <span class="text-lg font-semibold text-surface-700 dark:text-surface-200">{{ getPriceUnitLabel(product.priceUnit) }}</span>
                        </div>
                        
                        <!-- Tax & Description Row -->
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Vergi Oranı</span>
                            <span class="text-lg font-semibold text-surface-700 dark:text-surface-200">%{{ product.taxRate }}</span>
                        </div>
                        <div v-if="product.description" class="flex flex-col">
                            <span class="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Açıklama</span>
                            <p class="text-sm text-surface-600 dark:text-surface-400 m-0 leading-relaxed italic line-clamp-3">
                                {{ product.description }}
                            </p>
                        </div>
                    </div>

                    <!-- Min-Max High-Visibility Section -->
                    <div class="grid grid-cols-2 gap-x-12 pt-6 border-t border-surface-100 dark:border-surface-800">
                        <div class="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
                            <span class="block text-[10px] font-bold text-red-400 dark:text-red-300 uppercase tracking-widest mb-1">Minimum Stok</span>
                            <div class="flex items-baseline gap-2">
                                <span class="text-2xl font-black text-red-600 dark:text-red-400">{{ product.minStock || '0' }}</span>
                                <span class="text-xs font-medium text-red-400">{{ getPriceUnitLabel(product.priceUnit) }}</span>
                            </div>
                        </div>
                        <div class="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/20">
                            <span class="block text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-widest mb-1">Maksimum Stok</span>
                            <div class="flex items-baseline gap-2">
                                <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400">{{ product.maxStock || '∞' }}</span>
                                <span class="text-xs font-medium text-indigo-400">{{ getPriceUnitLabel(product.priceUnit) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Enlarged Global Status Tags -->
                <div class="bg-surface-0 dark:bg-surface-900 p-6 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm mt-auto">
                    <div class="flex flex-wrap items-center gap-4">
                         <Tag :severity="product.status === 'ACTIVE' ? 'success' : 'danger'" size="large" class="!px-6 !py-2">
                             <div class="flex items-center gap-2">
                                <i :class="product.status === 'ACTIVE' ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
                                <span class="text-sm font-bold uppercase tracking-widest">{{ product.status === 'ACTIVE' ? 'Aktif' : 'Pasif' }}</span>
                             </div>
                         </Tag>
                         <Tag :severity="product.inventoryStatus === 'TRACKED' ? 'info' : 'secondary'" size="large" class="!px-6 !py-2">
                             <div class="flex items-center gap-2">
                                <i class="pi pi-box"></i>
                                <span class="text-sm font-bold uppercase tracking-widest">{{ product.inventoryStatus === 'TRACKED' ? 'Stok Takibi' : 'Takipsiz' }}</span>
                             </div>
                         </Tag>
                         <Tag v-if="product.categoryDiscount" severity="warn" size="large" class="!px-6 !py-2">
                             <div class="flex items-center gap-2">
                                <i class="pi pi-percentage"></i>
                                <span class="text-sm font-bold uppercase tracking-widest">{{ getDiscountTypeLabel(product.categoryDiscount) }}</span>
                             </div>
                         </Tag>
                    </div>
                </div>
            </div>

            <!-- Right Panel: Kardeks (Stock Movement History) -->
            <div class="col-span-12 lg:col-span-6 flex flex-col h-full min-h-0">
                <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden flex flex-col flex-1">
                    <div class="px-5 py-4 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="pi pi-history text-primary text-lg"></i>
                            <h4 class="text-sm font-bold m-0 uppercase tracking-widest text-surface-500 dark:text-surface-200">Stok Hareketleri (Kardeks)</h4>
                        </div>
                        <Tag :value="String(productMovements.length) + ' Kayıt'" severity="secondary" rounded />
                    </div>

                    <DataTable :value="productMovements" class="p-datatable-sm" :paginator="true" :rows="15" 
                        paginatorPosition="bottom"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="{first}-{last} / {totalRecords}"
                        pt:pcPaginator:root:class="!py-2"
                    >
                        <Column field="createdAt" header="Tarih" sortable>
                            <template #body="slotProps">
                                <span class="text-xs">{{ new Date(slotProps.data.createdAt).toLocaleString('tr-TR') }}</span>
                            </template>
                        </Column>
                        <Column field="warehouseId" header="Depo" sortable>
                            <template #body="slotProps">
                                <span class="text-xs font-medium">{{ getWarehouseName(slotProps.data.warehouseId) }}</span>
                            </template>
                        </Column>
                        <Column field="movementType" header="İşlem" sortable>
                            <template #body="slotProps">
                                <Tag :severity="getMovementSeverity(slotProps.data.movementType)" :value="getMovementTypeLabel(slotProps.data.movementType)" pt:root:class="!text-[9px] !px-1.5 !py-0 !h-4" />
                            </template>
                        </Column>
                        <Column field="quantity" header="Miktar" sortable class="font-bold text-right" headerClass="text-right">
                            <template #body="slotProps">
                                <span :class="slotProps.data.movementType === 'out' ? 'text-red-500' : 'text-green-500'" class="text-xs">
                                    {{ slotProps.data.movementType === 'out' ? '-' : '+' }}{{ slotProps.data.quantity }}
                                </span>
                            </template>
                        </Column>
                        <Column field="note" header="Açıklama">
                            <template #body="slotProps">
                                <span class="text-xs text-surface-500 italic truncate block max-w-[200px]">{{ slotProps.data.note || '—' }}</span>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-else class="flex flex-col items-center justify-center py-20 gap-4">
            <i class="pi pi-spin pi-spinner text-4xl text-surface-400"></i>
            <span class="text-surface-400 font-medium">Veriler yükleniyor...</span>
        </div>

        <!-- Barcode Print Dialog -->
        <Dialog v-model:visible="barcodeDialogVisible" header="Barkod Yazdırma" :modal="true" :style="{ width: '450px' }">
            <div class="flex flex-col gap-6">
                <!-- Preview Container -->
                <div class="flex justify-center p-8 bg-surface-50 dark:bg-surface-900 rounded-2xl border-2 border-dashed border-surface-200 dark:border-surface-700">
                    <div class="bg-white p-4 shadow-xl border border-surface-200 flex flex-col items-center gap-2" style="width: 200px; height: 125px;">
                        <span class="text-[8px] font-black text-surface-400 uppercase tracking-widest border-b w-full text-center pb-1 mb-1">PYRAMID ERP</span>
                        <span class="text-[10px] font-bold text-center block w-full truncate">{{ product?.name }}</span>
                        <div class="flex items-center justify-center overflow-hidden w-full h-16">
                            <svg ref="barcodeSvgRef"></svg>
                        </div>
                        <div class="flex justify-between w-full mt-auto">
                            <span class="text-[8px] font-bold">{{ product?.code }}</span>
                            <span class="text-[8px] font-black">{{ formatCurrency(product?.price || 0, product?.currencyId) }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-bold text-sm">Yazdırılacak Adet</label>
                    <InputNumber v-model="printQuantity" :min="1" :max="1000" showButtons fluid size="large" />
                    <small class="text-surface-500">Etiketler 40x25mm standart termal ölçülerine göre hazırlanmıştır.</small>
                </div>
            </div>
            <template #footer>
                <Button label="Vazgeç" icon="pi pi-times" text severity="secondary" @click="barcodeDialogVisible = false" />
                <Button label="Şimdi Yazdır" icon="pi pi-print" severity="primary" @click="printLabels" />
            </template>
        </Dialog>
    </div>
</template>
