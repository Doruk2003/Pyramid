<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useToast } from 'primevue/usetoast';
import { exportReportToPDF } from '@/shared/utils/pdf-generator';

const inventoryStore = useInventoryStore();
const productStore = useProductStore();
const toast = useToast();

// Filtreler
const dateFrom = ref<Date | null>((() => { const d = new Date(); d.setDate(1); return d; })());
const dateTo = ref<Date | null>(new Date());
const selectedWarehouses = ref<string[]>([]);
const selectedMovementTypes = ref<string[]>([]);
const searchQuery = ref('');

const movementTypeOptions = [
    { label: 'Giriş', value: 'in', icon: 'pi pi-arrow-down', color: 'text-green-600' },
    { label: 'Çıkış', value: 'out', icon: 'pi pi-arrow-up', color: 'text-red-600' },
    { label: 'Transfer', value: 'transfer', icon: 'pi pi-arrows-h', color: 'text-blue-600' },
    { label: 'Düzeltme', value: 'adjustment', icon: 'pi pi-pencil', color: 'text-amber-600' }
];

onMounted(async () => {
    await Promise.all([
        inventoryStore.fetchWarehouses(),
        inventoryStore.fetchMovements(),
        productStore.fetchProducts()
    ]);
});

const allRows = computed(() => {
    return inventoryStore.movements.map((m) => {
        const obj = m.toObject();
        const product = productStore.products.find((p) => p.id === obj.productId);
        const warehouse = inventoryStore.warehouses.find((w) => w.id === obj.warehouseId);
        return {
            id: obj.id,
            date: obj.createdAt,
            productId: obj.productId,
            productName: product?.name || 'Bilinmeyen Ürün',
            productCode: product?.code || '-',
            warehouseId: obj.warehouseId,
            warehouseName: warehouse?.name || 'Bilinmeyen Depo',
            movementType: obj.movementType,
            quantity: obj.quantity,
            unitCost: obj.unitCost,
            referenceType: obj.referenceType,
            referenceId: obj.referenceId,
            note: obj.note || '-'
        };
    });
});

const filteredRows = computed(() => {
    return allRows.value.filter((row) => {
        if (dateFrom.value && row.date < dateFrom.value) return false;
        if (dateTo.value) {
            const end = new Date(dateTo.value);
            end.setHours(23, 59, 59, 999);
            if (row.date > end) return false;
        }
        if (selectedWarehouses.value.length > 0 && !selectedWarehouses.value.includes(row.warehouseId)) return false;
        if (selectedMovementTypes.value.length > 0 && !selectedMovementTypes.value.includes(row.movementType)) return false;
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            if (!row.productName.toLowerCase().includes(q) && !row.productCode.toLowerCase().includes(q)) return false;
        }
        return true;
    });
});

const summaryStats = computed(() => {
    const rows = filteredRows.value;
    return {
        total: rows.length,
        totalIn: rows.filter((r) => r.movementType === 'in').reduce((s, r) => s + r.quantity, 0),
        totalOut: rows.filter((r) => r.movementType === 'out').reduce((s, r) => s + r.quantity, 0),
        totalTransfer: rows.filter((r) => r.movementType === 'transfer').length,
        totalAdjustment: rows.filter((r) => r.movementType === 'adjustment').length
    };
});

function getMovementLabel(type: string) {
    switch (type) {
        case 'in': return 'Giriş';
        case 'out': return 'Çıkış';
        case 'transfer': return 'Transfer';
        case 'adjustment': return 'Düzeltme';
        default: return type;
    }
}

function getMovementSeverity(type: string) {
    switch (type) {
        case 'in': return 'success';
        case 'out': return 'danger';
        case 'transfer': return 'info';
        case 'adjustment': return 'warn';
        default: return 'secondary';
    }
}

function getMovementIcon(type: string) {
    switch (type) {
        case 'in': return 'pi-arrow-down';
        case 'out': return 'pi-arrow-up';
        case 'transfer': return 'pi-arrows-h';
        case 'adjustment': return 'pi-pencil';
        default: return 'pi-circle';
    }
}

function getReferenceLabel(type?: string) {
    switch (type) {
        case 'invoice': return 'Fatura';
        case 'order': return 'Sipariş';
        case 'count': return 'Sayım';
        case 'manual': return 'Manuel';
        default: return type || '-';
    }
}

function clearFilters() {
    const d = new Date(); d.setDate(1);
    dateFrom.value = d;
    dateTo.value = new Date();
    selectedWarehouses.value = [];
    selectedMovementTypes.value = [];
    searchQuery.value = '';
}

function exportCSV() {
    const headers = ['Tarih', 'Ürün Kodu', 'Ürün Adı', 'Depo', 'Hareket Tipi', 'Miktar', 'Birim Maliyet', 'Referans Tipi', 'Not'];
    const rows = filteredRows.value.map((r) => [
        r.date.toLocaleDateString('tr-TR'),
        r.productCode,
        r.productName,
        r.warehouseName,
        getMovementLabel(r.movementType),
        r.quantity,
        r.unitCost ?? '',
        getReferenceLabel(r.referenceType),
        r.note
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stok-hareketleri-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
async function exportPDF() {
    try {
        toast.add({ severity: 'info', summary: 'Hazırlanıyor', detail: 'PDF raporu oluşturuluyor...', life: 2000 });

        // Filters mapping
        const filtersList: { label: string, value: string }[] = [];
        if (dateFrom.value) {
            filtersList.push({ label: 'Başlangıç Tarihi', value: dateFrom.value.toLocaleDateString('tr-TR') });
        }
        if (dateTo.value) {
            filtersList.push({ label: 'Bitiş Tarihi', value: dateTo.value.toLocaleDateString('tr-TR') });
        }
        if (selectedWarehouses.value.length > 0) {
            const names = selectedWarehouses.value.map(id => inventoryStore.warehouses.find(w => w.id === id)?.name || id).join(', ');
            filtersList.push({ label: 'Depolar', value: names });
        }
        if (selectedMovementTypes.value.length > 0) {
            const names = selectedMovementTypes.value.map(type => getMovementLabel(type)).join(', ');
            filtersList.push({ label: 'Hareket Tipleri', value: names });
        }
        if (searchQuery.value) {
            filtersList.push({ label: 'Arama', value: searchQuery.value });
        }

        // Summary cards mapping
        const summaryCards = [
            { label: 'Toplam Hareket', value: summaryStats.value.total, color: 'neutral' as const },
            { label: 'Toplam Giriş', value: summaryStats.value.totalIn, color: 'success' as const },
            { label: 'Toplam Çıkış', value: summaryStats.value.totalOut, color: 'danger' as const },
            { label: 'Transfer Sayısı', value: summaryStats.value.totalTransfer, color: 'info' as const }
        ];

        // Headers
        const headers = ['Tarih', 'Ürün Kodu', 'Ürün Adı', 'Depo', 'Hareket Tipi', 'Miktar', 'Kaynak', 'Not'];

        // Badge severities mapping for movements
        const getMovementBadgeSeverity = (type: string) => {
            switch (type) {
                case 'in': return 'success';
                case 'out': return 'danger';
                case 'transfer': return 'info';
                case 'adjustment': return 'warning';
                default: return 'neutral';
            }
        };

        // Rows
        const rows = filteredRows.value.map(r => [
            r.date.toLocaleDateString('tr-TR'),
            r.productCode,
            r.productName,
            r.warehouseName,
            {
                isBadge: true,
                text: getMovementLabel(r.movementType),
                severity: getMovementBadgeSeverity(r.movementType)
            },
            r.quantity,
            getReferenceLabel(r.referenceType),
            r.note
        ]);

        await exportReportToPDF({
            title: 'Stok Hareketleri Raporu',
            headers,
            rows,
            alignments: ['left', 'left', 'left', 'left', 'center', 'right', 'center', 'left'],
            fileName: `stok-hareketleri-raporu-${new Date().toISOString().slice(0, 10)}.pdf`,
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
                    <i class="pi pi-sync text-primary"></i>
                    Stok Hareketleri Raporu
                </div>
                <div class="text-surface-500 text-sm mt-1">Seçilen dönemdeki stok giriş, çıkış ve transferleri</div>
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
                    <i class="pi pi-list text-surface-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold">{{ summaryStats.total }}</div>
                    <div class="text-xs text-surface-500">Toplam Hareket</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-green-400">
                <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <i class="pi pi-arrow-down text-green-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ summaryStats.totalIn }}</div>
                    <div class="text-xs text-surface-500">Toplam Giriş</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-red-400">
                <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <i class="pi pi-arrow-up text-red-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-red-600 dark:text-red-400">{{ summaryStats.totalOut }}</div>
                    <div class="text-xs text-surface-500">Toplam Çıkış</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-blue-400">
                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <i class="pi pi-arrows-h text-blue-500"></i>
                </div>
                <div>
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ summaryStats.totalTransfer }}</div>
                    <div class="text-xs text-surface-500">Transfer Sayısı</div>
                </div>
            </div>
        </div>

        <!-- Filtreler -->
        <div class="card p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label class="block text-sm font-semibold mb-2">Başlangıç Tarihi</label>
                    <DatePicker v-model="dateFrom" dateFormat="dd.mm.yy" fluid showIcon />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Bitiş Tarihi</label>
                    <DatePicker v-model="dateTo" dateFormat="dd.mm.yy" fluid showIcon />
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
                    <label class="block text-sm font-semibold mb-2">Hareket Tipi</label>
                    <MultiSelect
                        v-model="selectedMovementTypes"
                        :options="movementTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tüm tipler"
                        fluid
                    />
                </div>
            </div>
            <div class="flex items-center justify-between mt-3 gap-3">
                <IconField class="flex-1 max-w-xs">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchQuery" placeholder="Ürün ara..." fluid />
                </IconField>
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
                sortField="date"
                :sortOrder="-1"
                size="small"
                stripedRows
                scrollable
                scrollHeight="60vh"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-sync text-5xl mb-3 text-surface-300"></i>
                        <span>Seçilen kriterlere uygun hareket bulunamadı</span>
                    </div>
                </template>
                <Column field="date" header="Tarih" sortable style="width: 12%">
                    <template #body="{ data }">
                        <div class="flex flex-col">
                            <span class="text-sm font-medium">{{ data.date.toLocaleDateString('tr-TR') }}</span>
                            <span class="text-xs text-surface-400">{{ data.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="productCode" header="Kod" sortable style="width: 8%">
                    <template #body="{ data }">
                        <span class="font-mono text-xs font-semibold text-surface-500">{{ data.productCode }}</span>
                    </template>
                </Column>
                <Column field="productName" header="Ürün" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="font-medium">{{ data.productName }}</span>
                    </template>
                </Column>
                <Column field="warehouseName" header="Depo" sortable style="width: 14%">
                    <template #body="{ data }">
                        <div class="flex items-center gap-1">
                            <i class="pi pi-building text-xs text-surface-400"></i>
                            <span>{{ data.warehouseName }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="movementType" header="Tip" sortable style="width: 10%">
                    <template #body="{ data }">
                        <Tag :value="getMovementLabel(data.movementType)" :severity="getMovementSeverity(data.movementType)">
                            <template #default>
                                <div class="flex items-center gap-1">
                                    <i :class="`pi ${getMovementIcon(data.movementType)} text-xs`"></i>
                                    {{ getMovementLabel(data.movementType) }}
                                </div>
                            </template>
                        </Tag>
                    </template>
                </Column>
                <Column field="quantity" header="Miktar" sortable style="width: 8%; text-align: right">
                    <template #body="{ data }">
                        <span :class="[
                            'font-bold text-right block',
                            data.movementType === 'in' ? 'text-green-600 dark:text-green-400' :
                            data.movementType === 'out' ? 'text-red-600 dark:text-red-400' :
                            'text-blue-600 dark:text-blue-400'
                        ]">
                            {{ data.movementType === 'in' ? '+' : data.movementType === 'out' ? '-' : '' }}{{ data.quantity }}
                        </span>
                    </template>
                </Column>
                <Column field="referenceType" header="Kaynak" style="width: 10%">
                    <template #body="{ data }">
                        <span class="text-xs bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded">
                            {{ getReferenceLabel(data.referenceType) }}
                        </span>
                    </template>
                </Column>
                <Column field="note" header="Not" style="min-width: 140px">
                    <template #body="{ data }">
                        <span class="text-xs text-surface-500 truncate block max-w-xs" :title="data.note">{{ data.note }}</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
