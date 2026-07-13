<script setup lang="ts">
import { useAuditLogStore } from '@/modules/admin/application/audit-log.store';
import { onMounted, ref, computed } from 'vue';

const auditLogStore = useAuditLogStore();

const searchVal = ref('');
const selectedModule = ref<string | null>(null);
const selectedAction = ref<string | null>(null);

const modules = ref([
    { label: 'Tümü', value: null },
    { label: 'Stok / Ürün', value: 'products' },
    { label: 'Cari Hesap', value: 'accounts' },
    { label: 'Fatura', value: 'invoices' },
    { label: 'Teklif', value: 'quotes' },
    { label: 'Sipariş', value: 'orders' },
    { label: 'Depo', value: 'warehouses' },
    { label: 'Stok Hareketi', value: 'stock_movements' }
]);

const actions = ref([
    { label: 'Tümü', value: null },
    { label: 'INSERT (Ekle)', value: 'INSERT' },
    { label: 'UPDATE (Güncelle)', value: 'UPDATE' },
    { label: 'DELETE (Sil)', value: 'DELETE' }
]);

onMounted(() => {
    auditLogStore.fetchLogs();
});

// Map table names to user friendly labels
const getModuleLabel = (tableName: string) => {
    switch (tableName) {
        case 'products': return 'Stok / Ürün';
        case 'accounts': return 'Cari Hesap';
        case 'invoices': return 'Fatura';
        case 'quotes': return 'Teklif';
        case 'orders': return 'Sipariş';
        case 'warehouses': return 'Depo';
        case 'stock_movements': return 'Stok Hareketi';
        default: return tableName;
    }
};

const getSeverity = (action: string) => {
    switch (action) {
        case 'INSERT': return 'success';
        case 'UPDATE': return 'info';
        case 'DELETE': return 'danger';
        default: return 'secondary';
    }
};

const getActionLabel = (action: string) => {
    switch (action) {
        case 'INSERT': return 'EKLE';
        case 'UPDATE': return 'GÜNCELLE';
        case 'DELETE': return 'SİL';
        default: return action;
    }
};

// Premium Change Formatter
const formatLogDetails = (log: any) => {
    const action = log.action;
    const oldVal = log.oldData;
    const newVal = log.newData;

    const getIdentifier = (data: any) => {
        if (!data) return '';
        if (log.tableName === 'products' || log.tableName === 'accounts') {
            if (data.code && data.name) {
                return `${data.code} - ${data.name}`;
            }
            return data.name || data.code || data.id || '';
        }
        return data.invoice_number || data.quote_number || data.order_number || data.name || data.code || data.title || data.id || '';
    };

    if (action === 'INSERT') {
        const iden = getIdentifier(newVal);
        return `Yeni kayıt oluşturuldu: ${iden ? `[${iden}]` : log.recordId || ''}`;
    }

    if (action === 'DELETE') {
        const iden = getIdentifier(oldVal);
        return `Kayıt silindi: ${iden ? `[${iden}]` : log.recordId || ''}`;
    }

    if (action === 'UPDATE') {
        if (!oldVal || !newVal) return 'Kayıt güncellendi';
        const changes: string[] = [];
        const ignoreFields = ['updated_at', 'created_at', 'deleted_at'];
        
        for (const key of Object.keys(newVal)) {
            if (ignoreFields.includes(key)) continue;
            
            const oldRaw = oldVal[key];
            const newRaw = newVal[key];
            
            if (JSON.stringify(oldRaw) !== JSON.stringify(newRaw)) {
                const label = key.toUpperCase();
                const displayOld = oldRaw !== null && oldRaw !== undefined ? String(oldRaw) : 'boş';
                const displayNew = newRaw !== null && newRaw !== undefined ? String(newRaw) : 'boş';
                changes.push(`${label} (${displayOld} ➔ ${displayNew})`);
            }
        }
        
        if (changes.length === 0) {
            return 'Sistem/Zaman alanları güncellendi';
        }
        return `Güncellenenler: ${changes.join(', ')}`;
    }

    return '';
};

// Filtering logic
const filteredLogs = computed(() => {
    let list = auditLogStore.logs || [];

    if (selectedModule.value) {
        list = list.filter(item => item.tableName === selectedModule.value);
    }

    if (selectedAction.value) {
        list = list.filter(item => item.action === selectedAction.value);
    }

    if (searchVal.value) {
        const query = searchVal.value.toLowerCase();
        list = list.filter(item => {
            const userText = `${item.userFullName || ''} ${item.userEmail || ''}`.toLowerCase();
            const detailsText = formatLogDetails(item).toLowerCase();
            const recordText = (item.recordId || '').toLowerCase();
            return userText.includes(query) || detailsText.includes(query) || recordText.includes(query);
        });
    }

    return list;
});

const clearFilters = () => {
    searchVal.value = '';
    selectedModule.value = null;
    selectedAction.value = null;
};
</script>

<template>
    <div>
        <!-- BAŞLIK & FİLTRELER -->
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-4">
                <div class="text-2xl font-medium">Sistem Logları</div>
                <Button icon="pi pi-refresh" severity="secondary" rounded text @click="auditLogStore.fetchLogs()" :loading="auditLogStore.loading" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <InputText v-model="searchVal" placeholder="Kullanıcı veya detaylarda ara..." class="w-full" />
                </div>
                <div>
                    <Select
                        v-model="selectedModule"
                        :options="modules"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Modül Filtresi"
                        class="w-full"
                    />
                </div>
                <div>
                    <Select
                        v-model="selectedAction"
                        :options="actions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="İşlem Filtresi"
                        class="w-full"
                    />
                </div>
                <div>
                    <Button label="Temizle" severity="secondary" class="w-full" icon="pi pi-filter-slash" @click="clearFilters" />
                </div>
            </div>
        </div>

        <!-- TABLO -->
        <div class="card">
            <DataTable 
                :value="filteredLogs" 
                paginator 
                :rows="15" 
                :loading="auditLogStore.loading"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[10, 15, 30, 50]"
                currentPageReportTemplate="Gösterilen {first} - {last} / {totalRecords} kayıt"
                tableStyle="min-width: 60rem"
            >
                <template #empty>
                    <div class="text-center p-4 text-gray-500">Log kaydı bulunamadı.</div>
                </template>

                <Column field="changedAt" header="Tarih" sortable style="width: 15%">
                    <template #body="slotProps">
                        <span class="text-sm font-medium">{{ new Date(slotProps.data.changedAt).toLocaleString('tr-TR') }}</span>
                    </template>
                </Column>

                <Column header="Kullanıcı" style="width: 20%">
                    <template #body="slotProps">
                        <div class="flex flex-col">
                            <span class="font-medium text-sm">{{ slotProps.data.userFullName || 'Sistem' }}</span>
                            <span class="text-xs text-gray-500">{{ slotProps.data.userEmail || '' }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="tableName" header="Modül" sortable style="width: 15%">
                    <template #body="slotProps">
                        <Tag :value="getModuleLabel(slotProps.data.tableName)" severity="secondary" />
                    </template>
                </Column>

                <Column field="action" header="İşlem" sortable style="width: 10%">
                    <template #body="slotProps">
                        <Tag :value="getActionLabel(slotProps.data.action)" :severity="getSeverity(slotProps.data.action)" />
                    </template>
                </Column>

                <Column header="Detaylar" style="width: 40%">
                    <template #body="slotProps">
                        <span class="text-sm break-all font-mono">{{ formatLogDetails(slotProps.data) }}</span>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
