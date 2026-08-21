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
const selectedStatus = ref<string>('all');
const searchQuery = ref('');

const statusOptions = [
    { label: 'Tümü', value: 'all' },
    { label: 'Normal', value: 'normal' },
    { label: 'Kritik (Min Altı)', value: 'critical' },
    { label: 'Maksimum Aşım', value: 'overstock' },
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

// Tüm satırları oluştur: her (ürün x depo) kombinasyonu için
const allRows = computed(() => {
    const rows: any[] = [];
    const warehouses = inventoryStore.warehouses;
    const products = productStore.products;
    const balances = inventoryStore.balances;
    const categories = lookupStore.categories;

    for (const product of products) {
        for (const warehouse of warehouses) {
            const balance = balances.find(
                (b) => b.productId === product.id && b.warehouseId === warehouse.id
            );
            const qty = balance?.balance ?? 0;
            const minStock = product.minStock ?? 0;
            const maxStock = product.maxStock ?? 0;

            let status = 'normal';
            if (qty === 0) status = 'zero';
            else if (minStock > 0 && qty < minStock) status = 'critical';
            else if (maxStock > 0 && qty > maxStock) status = 'overstock';

            const category = categories.find((c) => c.id === product.categoryId);

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
                gap: minStock > 0 && qty < minStock ? minStock - qty : 0
            });
        }
    }
    return rows;
});

const filteredRows = computed(() => {
    return allRows.value.filter((row) => {
        if (selectedWarehouses.value.length > 0 && !selectedWarehouses.value.includes(row.warehouseId)) return false;
        if (selectedCategories.value.length > 0 && !selectedCategories.value.includes(row.categoryId)) return false;
        if (selectedStatus.value !== 'all' && row.status !== selectedStatus.value) return false;
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            if (!row.productName.toLowerCase().includes(q) && !row.productCode.toLowerCase().includes(q)) return false;
        }
        return true;
    });
});

// Özet istatistikler
const summaryStats = computed(() => {
    const rows = filteredRows.value;
    return {
        total: rows.length,
        critical: rows.filter((r) => r.status === 'critical').length,
        overstock: rows.filter((r) => r.status === 'overstock').length,
        zero: rows.filter((r) => r.status === 'zero').length,
        normal: rows.filter((r) => r.status === 'normal').length
    };
});

// Depo bazında özet
const warehouseSummary = computed(() => {
    return inventoryStore.warehouses.map((wh) => {
        const whRows = filteredRows.value.filter((r) => r.warehouseId === wh.id);
        return {
            name: wh.name,
            total: whRows.length,
            critical: whRows.filter((r) => r.status === 'critical' || r.status === 'zero').length,
            normalPct: whRows.length > 0
                ? Math.round((whRows.filter((r) => r.status === 'normal').length / whRows.length) * 100)
                : 0
        };
    });
});

function getStatusLabel(status: string) {
    switch (status) {
        case 'critical': return 'Kritik';
        case 'overstock': return 'Aşım';
        case 'zero': return 'Sıfır';
        default: return 'Normal';
    }
}

function getStatusSeverity(status: string) {
    switch (status) {
        case 'critical': return 'danger';
        case 'overstock': return 'warn';
        case 'zero': return 'secondary';
        default: return 'success';
    }
}

function getBadgeSeverity(status: string) {
    switch (status) {
        case 'critical': return 'danger';
        case 'overstock': return 'warning';
        case 'zero': return 'neutral';
        default: return 'success';
    }
}

function clearFilters() {
    selectedWarehouses.value = [];
    selectedCategories.value = [];
    selectedStatus.value = 'all';
    searchQuery.value = '';
}

function exportCSV() {
    const headers = ['Ürün Kodu', 'Ürün Adı', 'Kategori', 'Depo', 'Stok', 'Min Stok', 'Max Stok', 'Durum'];
    const rows = filteredRows.value.map((r) => [
        r.productCode, r.productName, r.categoryName, r.warehouseName,
        r.balance, r.minStock, r.maxStock, getStatusLabel(r.status)
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stok-durum-raporu-${new Date().toISOString().slice(0, 10)}.csv`;
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
        if (selectedStatus.value !== 'all') {
            const statusObj = statusOptions.find(o => o.value === selectedStatus.value);
            filtersList.push({ label: 'Durum', value: statusObj?.label || selectedStatus.value });
        }
        if (searchQuery.value) {
            filtersList.push({ label: 'Arama', value: searchQuery.value });
        }

        // Summary cards mapping
        const summaryCards = [
            { label: 'Toplam Satır', value: summaryStats.value.total, color: 'neutral' as const },
            { label: 'Normal', value: summaryStats.value.normal, color: 'success' as const },
            { label: 'Kritik / Sıfır', value: summaryStats.value.critical + summaryStats.value.zero, color: 'danger' as const },
            { label: 'Maksimum Aşım', value: summaryStats.value.overstock, color: 'warning' as const }
        ];

        // Headers
        const headers = ['Ürün Kodu', 'Ürün Adı', 'Kategori', 'Depo', 'Stok', 'Min Stok', 'Max Stok', 'Durum'];

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
                severity: getBadgeSeverity(r.status) 
            }
        ]);

        await exportReportToPDF({
            title: 'Stok Durum Raporu',
            headers,
            rows,
            alignments: ['left', 'left', 'left', 'left', 'right', 'right', 'right', 'center'],
            fileName: `stok-durum-raporu-${new Date().toISOString().slice(0, 10)}.pdf`,
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
                    <i class="pi pi-box text-primary"></i>
                    Stok Durum Raporu
                </div>
                <div class="text-surface-500 text-sm mt-1">Tüm ürünlerin depoya göre anlık stok durumu</div>
            </div>
            <div class="flex gap-2">
                <Button label="CSV İndir" icon="pi pi-download" severity="secondary" outlined @click="exportCSV" />
                <Button label="PDF İndir" icon="pi pi-file-pdf" severity="danger" outlined @click="exportPDF" />
            </div>
        </div>

        <!-- Özet Kartlar -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="card p-4 flex items-center gap-3 border-l-4 border-surface-300 dark:border-surface-600">
                <div class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <i class="pi pi-list text-surface-600 dark:text-surface-300"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold">{{ summaryStats.total }}</div>
                    <div class="text-xs text-surface-500">Toplam Satır</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-green-400">
                <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <i class="pi pi-check-circle text-green-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ summaryStats.normal }}</div>
                    <div class="text-xs text-surface-500">Normal</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-red-400">
                <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <i class="pi pi-exclamation-circle text-red-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-red-600 dark:text-red-400">{{ summaryStats.critical + summaryStats.zero }}</div>
                    <div class="text-xs text-surface-500">Kritik / Sıfır</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-amber-400">
                <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <i class="pi pi-arrow-up-right text-amber-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ summaryStats.overstock }}</div>
                    <div class="text-xs text-surface-500">Max Aşım</div>
                </div>
            </div>
        </div>

        <!-- Depo Özet Kartları -->
        <div v-if="warehouseSummary.length > 0" class="flex flex-wrap gap-3">
            <div v-for="wh in warehouseSummary" :key="wh.name"
                class="card px-4 py-3 flex items-center gap-3 min-w-48">
                <i class="pi pi-building text-primary"></i>
                <div class="flex flex-col flex-1 min-w-0">
                    <span class="font-semibold text-sm truncate">{{ wh.name }}</span>
                    <div class="flex items-center gap-2 mt-1">
                        <ProgressBar :value="wh.normalPct" :showValue="false" style="height:5px; flex:1;"
                            :severity="wh.normalPct > 70 ? 'success' : wh.normalPct > 40 ? 'warn' : 'danger'" />
                        <span class="text-xs text-surface-500 whitespace-nowrap">{{ wh.normalPct }}%</span>
                    </div>
                </div>
                <Tag v-if="wh.critical > 0" :value="wh.critical" severity="danger" class="text-xs" />
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
                    <label class="block text-sm font-semibold mb-2">Stok Durumu</label>
                    <Select
                        v-model="selectedStatus"
                        :options="statusOptions"
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
        <div class="card p-0 dt-compact">
            <DataTable
                :value="filteredRows"
                :loading="inventoryStore.loading || productStore.loading"
                paginator
                :rows="25"
                :rowsPerPageOptions="[25, 50, 100]"
                sortField="status"
                :sortOrder="1"
                size="small"
                stripedRows
                scrollable
                scrollHeight="60vh"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-box text-5xl mb-3 text-surface-300"></i>
                        <span>Gösterilecek stok verisi bulunamadı</span>
                    </div>
                </template>
                <Column field="productCode" header="Kod" sortable style="width: 8%; font-family: monospace">
                    <template #body="{ data }">
                        <span class="font-mono text-xs font-semibold text-surface-500">{{ data.productCode }}</span>
                    </template>
                </Column>
                <Column field="productName" header="Ürün Adı" sortable style="min-width: 200px">
                    <template #body="{ data }">
                        <span class="font-medium">{{ data.productName }}</span>
                    </template>
                </Column>
                <Column field="categoryName" header="Kategori" sortable style="width: 12%" />
                <Column field="warehouseName" header="Depo" sortable style="width: 14%">
                    <template #body="{ data }">
                        <div class="flex items-center gap-1">
                            <i class="pi pi-building text-xs text-surface-400"></i>
                            <span>{{ data.warehouseName }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="balance" header="Stok" sortable style="width: 8%; text-align: right">
                    <template #body="{ data }">
                        <span :class="[
                            'font-bold text-right block',
                            data.status === 'critical' ? 'text-red-600 dark:text-red-400' :
                            data.status === 'zero' ? 'text-surface-400' :
                            data.status === 'overstock' ? 'text-amber-600 dark:text-amber-400' :
                            'text-green-600 dark:text-green-400'
                        ]">{{ data.balance }}</span>
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
                <Column field="gap" header="Eksik" sortable style="width: 8%; text-align: right">
                    <template #body="{ data }">
                        <span v-if="data.gap > 0" class="text-red-600 dark:text-red-400 font-semibold text-right block">
                            {{ data.gap }}
                        </span>
                        <span v-else class="text-surface-300 text-right block">—</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
