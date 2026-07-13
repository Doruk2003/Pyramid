<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useToast } from 'primevue/usetoast';
import { exportReportToPDF } from '@/shared/utils/pdf-generator';

const inventoryStore = useInventoryStore();
const productStore = useProductStore();
const lookupStore = useLookupStore();
const toast = useToast();

// Filtreler
const selectedWarehouses = ref<string[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedMode = ref<string>('all');
const searchQuery = ref('');

const modeOptions = [
    { label: 'Tümü (Kritik + Aşım)', value: 'all' },
    { label: 'Yalnız Kritik (Min Altı)', value: 'critical' },
    { label: 'Yalnız Aşım (Max Üstü)', value: 'overstock' },
    { label: 'Sıfır Stok', value: 'zero' }
];

onMounted(async () => {
    await Promise.all([
        inventoryStore.fetchWarehouses(),
        inventoryStore.fetchBalances(),
        productStore.fetchProducts(),
        lookupStore.fetchAll()
    ]);
});

// Sadece sorunlu satırları listele
const criticalRows = computed(() => {
    const rows: any[] = [];
    const warehouses = inventoryStore.warehouses;
    const products = productStore.products;
    const balances = inventoryStore.balances;
    const categories = lookupStore.categories;

    for (const product of products) {
        const minStock = product.minStock ?? 0;
        const maxStock = product.maxStock ?? 0;

        // En az bir kısıt olan ürünleri işle
        if (minStock === 0 && maxStock === 0) continue;

        for (const warehouse of warehouses) {
            const balance = balances.find(
                (b) => b.productId === product.id && b.warehouseId === warehouse.id
            );
            const qty = balance?.balance ?? 0;

            let status = '';
            let priority = 0;

            if (qty === 0 && minStock > 0) {
                status = 'zero';
                priority = 3; // En yüksek öncelik
            } else if (minStock > 0 && qty < minStock) {
                status = 'critical';
                priority = 2;
            } else if (maxStock > 0 && qty > maxStock) {
                status = 'overstock';
                priority = 1;
            } else {
                continue; // Normal, atla
            }

            const category = categories.find((c) => c.id === product.categoryId);
            const criticalGap = minStock > 0 && qty < minStock ? minStock - qty : 0;
            const overstockGap = maxStock > 0 && qty > maxStock ? qty - maxStock : 0;
            // Acil sipariş önerisi: en az min stok'u karşılamak için
            const orderSuggestion = minStock > 0 ? Math.max(0, minStock - qty) : 0;
            // Kritiklik yüzdesi: stok / min stok
            const critPct = minStock > 0 ? Math.round((qty / minStock) * 100) : 100;

            rows.push({
                productId: product.id,
                productCode: product.code || '-',
                productName: product.name,
                categoryId: product.categoryId || '',
                categoryName: category?.name || '-',
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                balance: qty,
                minStock,
                maxStock,
                status,
                priority,
                criticalGap,
                overstockGap,
                orderSuggestion,
                critPct: Math.min(100, critPct)
            });
        }
    }

    // Önceliğe göre sırala (en kritik önce)
    return rows.sort((a, b) => b.priority - a.priority || a.critPct - b.critPct);
});

const filteredRows = computed(() => {
    return criticalRows.value.filter((row) => {
        if (selectedWarehouses.value.length > 0 && !selectedWarehouses.value.includes(row.warehouseId)) return false;
        if (selectedCategories.value.length > 0 && !selectedCategories.value.includes(row.categoryId)) return false;
        if (selectedMode.value !== 'all' && row.status !== selectedMode.value) return false;
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            if (!row.productName.toLowerCase().includes(q) && !row.productCode.toLowerCase().includes(q)) return false;
        }
        return true;
    });
});

const summaryStats = computed(() => {
    const rows = criticalRows.value; // filtresiz toplam
    return {
        total: rows.length,
        zero: rows.filter((r) => r.status === 'zero').length,
        critical: rows.filter((r) => r.status === 'critical').length,
        overstock: rows.filter((r) => r.status === 'overstock').length,
        totalOrderSuggestion: rows.reduce((s, r) => s + r.orderSuggestion, 0)
    };
});

function getStatusLabel(status: string) {
    switch (status) {
        case 'critical': return 'Kritik';
        case 'overstock': return 'Max Aşım';
        case 'zero': return 'Sıfır Stok';
        default: return status;
    }
}

function getStatusSeverity(status: string) {
    switch (status) {
        case 'zero': return 'danger';
        case 'critical': return 'warn';
        case 'overstock': return 'secondary';
        default: return 'info';
    }
}

function clearFilters() {
    selectedWarehouses.value = [];
    selectedCategories.value = [];
    selectedMode.value = 'all';
    searchQuery.value = '';
}

function exportCSV() {
    const headers = [
        'Ürün Kodu', 'Ürün Adı', 'Kategori', 'Depo',
        'Mevcut Stok', 'Min Stok', 'Max Stok', 'Durum',
        'Eksik Miktar', 'Fazla Miktar', 'Önerilen Sipariş'
    ];
    const rows = filteredRows.value.map((r) => [
        r.productCode, r.productName, r.categoryName, r.warehouseName,
        r.balance, r.minStock || '-', r.maxStock || '-',
        getStatusLabel(r.status), r.criticalGap || '-', r.overstockGap || '-',
        r.orderSuggestion || '-'
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kritik-stok-raporu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

async function exportPDF() {
    try {
        toast.add({ severity: 'info', summary: 'Hazırlanıyor', detail: 'PDF raporu oluşturuluyor...', life: 2000 });

        // Filters mapping
        const filtersList: { label: string, value: string }[] = [];
        if (selectedWarehouses.value.length > 0) {
            const names = selectedWarehouses.value.map(id => inventoryStore.warehouses.find(w => w.id === id)?.name || id).join(', ');
            filtersList.push({ label: 'Depolar', value: names });
        }
        if (selectedCategories.value.length > 0) {
            const names = selectedCategories.value.map(id => lookupStore.categories.find(c => c.id === id)?.name || id).join(', ');
            filtersList.push({ label: 'Kategoriler', value: names });
        }
        if (selectedMode.value !== 'all') {
            const modeObj = modeOptions.find(o => o.value === selectedMode.value);
            filtersList.push({ label: 'Durum', value: modeObj?.label || selectedMode.value });
        }
        if (searchQuery.value) {
            filtersList.push({ label: 'Arama', value: searchQuery.value });
        }

        // Summary cards mapping
        const summaryCards = [
            { label: 'Sıfır Stok', value: summaryStats.value.zero, color: 'danger' as const },
            { label: 'Kritik (Min Altı)', value: summaryStats.value.critical, color: 'warning' as const },
            { label: 'Max Aşım', value: summaryStats.value.overstock, color: 'neutral' as const },
            { label: 'Önerilen Sipariş', value: summaryStats.value.totalOrderSuggestion, color: 'info' as const }
        ];

        // Headers
        const headers = ['Ürün Kodu', 'Ürün Adı', 'Kategori', 'Depo', 'Mevcut', 'Min', 'Max', 'Durum', 'Eksik', 'Önerilen Sipariş'];

        // Badge severities mapping for critical status
        const getCriticalBadgeSeverity = (status: string) => {
            switch (status) {
                case 'zero': return 'danger';
                case 'critical': return 'warning';
                case 'overstock': return 'neutral';
                default: return 'info';
            }
        };

        // Rows
        const rows = filteredRows.value.map(r => [
            r.productCode,
            r.productName,
            r.categoryName,
            r.warehouseName,
            r.balance,
            r.minStock || '-',
            r.maxStock || '-',
            {
                isBadge: true,
                text: getStatusLabel(r.status),
                severity: getCriticalBadgeSeverity(r.status)
            },
            r.criticalGap || r.overstockGap ? (r.criticalGap > 0 ? r.criticalGap : `+${r.overstockGap}`) : '-',
            r.orderSuggestion || '-'
        ]);

        await exportReportToPDF({
            title: 'Kritik Stok Raporu',
            headers,
            rows,
            alignments: ['left', 'left', 'left', 'left', 'right', 'right', 'right', 'center', 'right', 'right'],
            fileName: `kritik-stok-raporu-${new Date().toISOString().slice(0, 10)}.pdf`,
            summaryCards,
            filters: filtersList
        });

        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'PDF dosyası başarıyla indirildi', life: 3000 });
    } catch (err: any) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Hata', detail: 'PDF oluşturulurken bir hata oluştu.', life: 4000 });
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Başlık -->
        <div class="card p-4 flex items-center justify-between">
            <div>
                <div class="text-2xl font-bold flex items-center gap-2">
                    <i class="pi pi-exclamation-triangle text-red-500"></i>
                    Kritik Stok Raporu
                </div>
                <div class="text-surface-500 text-sm mt-1">Min stok altında veya maksimum stok üzerinde olan ürünler</div>
            </div>
            <div class="flex gap-2">
                <Button label="CSV İndir" icon="pi pi-download" severity="secondary" outlined @click="exportCSV" />
                <Button label="PDF İndir" icon="pi pi-file-pdf" severity="danger" outlined @click="exportPDF" />
            </div>
        </div>

        <!-- Uyarı Banner (hiç sorun yoksa) -->
        <div v-if="criticalRows.length === 0 && !inventoryStore.loading"
            class="card p-6 flex items-center gap-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <i class="pi pi-check-circle text-green-500 text-4xl"></i>
            <div>
                <div class="font-bold text-green-700 dark:text-green-300 text-lg">Harika! Stok seviyeleri normal.</div>
                <div class="text-green-600 dark:text-green-400 text-sm mt-1">
                    Min/Max sınırı tanımlı tüm ürünlerin stok seviyeleri belirlenen aralıklarda.
                </div>
            </div>
        </div>

        <!-- Özet Kartlar -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="card p-4 flex items-center gap-3 border-l-4 border-red-500">
                <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <i class="pi pi-times-circle text-red-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-red-600 dark:text-red-400">{{ summaryStats.zero }}</div>
                    <div class="text-xs text-surface-500">Sıfır Stok</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-amber-500">
                <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <i class="pi pi-exclamation-triangle text-amber-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ summaryStats.critical }}</div>
                    <div class="text-xs text-surface-500">Kritik (Min Altı)</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-surface-400">
                <div class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <i class="pi pi-arrow-up text-surface-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold">{{ summaryStats.overstock }}</div>
                    <div class="text-xs text-surface-500">Max Aşım</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-blue-400">
                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <i class="pi pi-shopping-cart text-blue-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ summaryStats.totalOrderSuggestion }}</div>
                    <div class="text-xs text-surface-500">Önerilen Sipariş</div>
                </div>
            </div>
        </div>

        <!-- Filtreler -->
        <div class="card p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label class="block text-sm font-semibold mb-2">Ürün Ara</label>
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText v-model="searchQuery" placeholder="Ürün adı veya kodu..." fluid />
                    </IconField>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Depo</label>
                    <MultiSelect
                        v-model="selectedWarehouses"
                        :options="inventoryStore.warehouses"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Tüm depolar"
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Kategori</label>
                    <MultiSelect
                        v-model="selectedCategories"
                        :options="lookupStore.categories"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Tüm kategoriler"
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Durum</label>
                    <Select
                        v-model="selectedMode"
                        :options="modeOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
            </div>
            <div class="flex justify-end mt-3">
                <Button label="Filtreleri Temizle" icon="pi pi-filter-slash" text size="small" @click="clearFilters" />
            </div>
        </div>

        <!-- Tablo -->
        <div class="card p-0">
            <DataTable
                :value="filteredRows"
                :loading="inventoryStore.loading || productStore.loading"
                paginator
                :rows="25"
                :rowsPerPageOptions="[25, 50, 100]"
                size="small"
                stripedRows
                scrollable
                scrollHeight="60vh"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-check-circle text-5xl mb-3 text-green-300"></i>
                        <span>Kritik stok bulunamadı — tüm stoklar normal aralıkta</span>
                    </div>
                </template>
                <Column field="status" header="" style="width: 4%">
                    <template #body="{ data }">
                        <span class="flex justify-center">
                            <i :class="[
                                'pi text-lg',
                                data.status === 'zero' ? 'pi-times-circle text-red-500' :
                                data.status === 'critical' ? 'pi-exclamation-triangle text-amber-500' :
                                'pi-arrow-up text-surface-400'
                            ]"></i>
                        </span>
                    </template>
                </Column>
                <Column field="productCode" header="Kod" sortable style="width: 8%">
                    <template #body="{ data }">
                        <span class="font-mono text-xs font-semibold text-surface-500">{{ data.productCode }}</span>
                    </template>
                </Column>
                <Column field="productName" header="Ürün Adı" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="font-medium">{{ data.productName }}</span>
                    </template>
                </Column>
                <Column field="categoryName" header="Kategori" sortable style="width: 12%" />
                <Column field="warehouseName" header="Depo" sortable style="width: 13%">
                    <template #body="{ data }">
                        <div class="flex items-center gap-1">
                            <i class="pi pi-building text-xs text-surface-400"></i>
                            <span>{{ data.warehouseName }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="balance" header="Mevcut" sortable style="width: 8%; text-align: right">
                    <template #body="{ data }">
                        <div class="text-right">
                            <div :class="[
                                'font-bold',
                                data.status === 'zero' ? 'text-red-600 dark:text-red-400' :
                                data.status === 'critical' ? 'text-amber-600 dark:text-amber-400' :
                                'text-surface-600'
                            ]">{{ data.balance }}</div>
                            <div v-if="data.minStock > 0" class="mt-1">
                                <ProgressBar :value="data.critPct" :showValue="false" style="height: 4px"
                                    :severity="data.status === 'zero' || data.status === 'critical' ? 'danger' : 'success'" />
                            </div>
                        </div>
                    </template>
                </Column>
                <Column field="minStock" header="Min" sortable style="width: 7%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-surface-500 text-right block">{{ data.minStock || '-' }}</span>
                    </template>
                </Column>
                <Column field="maxStock" header="Max" sortable style="width: 7%; text-align: right">
                    <template #body="{ data }">
                        <span class="text-surface-500 text-right block">{{ data.maxStock || '-' }}</span>
                    </template>
                </Column>
                <Column field="status" header="Durum" sortable style="width: 10%">
                    <template #body="{ data }">
                        <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                    </template>
                </Column>
                <Column field="criticalGap" header="Eksik" sortable style="width: 8%; text-align: right">
                    <template #body="{ data }">
                        <span v-if="data.criticalGap > 0"
                            class="font-bold text-red-600 dark:text-red-400 text-right block">
                            {{ data.criticalGap }}
                        </span>
                        <span v-else-if="data.overstockGap > 0"
                            class="text-surface-400 text-right block">+{{ data.overstockGap }}</span>
                        <span v-else class="text-surface-300 text-right block">—</span>
                    </template>
                </Column>
                <Column field="orderSuggestion" header="Önerilen Sipariş" sortable style="width: 12%; text-align: right">
                    <template #body="{ data }">
                        <div v-if="data.orderSuggestion > 0"
                            class="flex items-center justify-end gap-1">
                            <i class="pi pi-shopping-cart text-blue-400 text-xs"></i>
                            <span class="font-semibold text-blue-600 dark:text-blue-400">{{ data.orderSuggestion }}</span>
                        </div>
                        <span v-else class="text-surface-300 text-right block">—</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
