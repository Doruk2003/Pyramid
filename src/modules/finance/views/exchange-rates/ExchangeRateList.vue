<script setup lang="ts">
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import type { ExchangeRate } from '@/modules/finance/domain/exchange-rate.entity';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const exchangeRateStore = useExchangeRateStore();
const lookupStore = useLookupStore();
const toast = useToast();

// ─── Filtreler ────────────────────────────────────────────────────────────────
const showFilters = ref(false);

interface FilterForm {
    code: string;
    name: string;
    dateFrom: Date | null;
    dateTo: Date | null;
}

const filterForm = ref<FilterForm>({ code: '', name: '', dateFrom: null, dateTo: null });
const activeFilters = ref<FilterForm>({ ...filterForm.value });

const filteredRates = computed(() => {
    let list = exchangeRateStore.currentRates;
    if (activeFilters.value.code) {
        const q = activeFilters.value.code.toLowerCase();
        list = list.filter((r) => r.currencyCode.toLowerCase().includes(q));
    }
    if (activeFilters.value.name) {
        const q = activeFilters.value.name.toLowerCase();
        list = list.filter((r) => r.currencyName.toLowerCase().includes(q));
    }
    if (activeFilters.value.dateFrom) {
        const from = new Date(activeFilters.value.dateFrom);
        from.setHours(0, 0, 0, 0);
        list = list.filter((r) => new Date(r.effectiveDate) >= from);
    }
    if (activeFilters.value.dateTo) {
        const to = new Date(activeFilters.value.dateTo);
        to.setHours(23, 59, 59, 999);
        list = list.filter((r) => new Date(r.effectiveDate) <= to);
    }
    return list;
});

function toggleFilters() { showFilters.value = !showFilters.value; }
function applyFilters()  { activeFilters.value = { ...filterForm.value }; }
function clearFilters()  {
    filterForm.value = { code: '', name: '', dateFrom: null, dateTo: null };
    activeFilters.value = { ...filterForm.value };
}

// ─── Kur Girişi Dialog ────────────────────────────────────────────────────────
const rateDialogVisible = ref(false);
const rateSubmitted = ref(false);

interface RateForm {
    currencyId: string;
    currencyCode: string;
    rate: number | null;
    effectiveDate: Date;
    notes: string;
}

const emptyRateForm = (): RateForm => ({
    currencyId: '',
    currencyCode: '',
    rate: null,
    effectiveDate: new Date(),
    notes: ''
});

const rateForm = ref<RateForm>(emptyRateForm());

/** Tablodaki "Güncelle" butonu — döviz seçili gelir */
function openUpdateDialog(row: ExchangeRate) {
    rateForm.value = {
        currencyId: row.currencyId,
        currencyCode: row.currencyCode,
        rate: null,
        effectiveDate: new Date(),
        notes: ''
    };
    rateSubmitted.value = false;
    rateDialogVisible.value = true;
}

/** Toolbar "Yeni Kur Gir" butonu — döviz seçilmeden açılır */
function openNewRateDialog() {
    rateForm.value = emptyRateForm();
    rateSubmitted.value = false;
    rateDialogVisible.value = true;
}

function onCurrencySelect(currencyId: string) {
    const found = lookupStore.currencies.find((c) => c.id === currencyId);
    rateForm.value.currencyCode = found?.code ?? '';
}

async function saveRate() {
    rateSubmitted.value = true;
    if (!rateForm.value.currencyId || !rateForm.value.rate || rateForm.value.rate <= 0) return;

    const result = await exchangeRateStore.saveRate(
        rateForm.value.currencyId,
        rateForm.value.rate,
        rateForm.value.effectiveDate,
        rateForm.value.notes || undefined
    );

    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kur kaydedildi', life: 3000 });
        rateDialogVisible.value = false;
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

// ─── Geçmiş Dialog ────────────────────────────────────────────────────────────
const historyDialogVisible = ref(false);
const selectedCurrencyLabel = ref('');

async function openHistory(row: ExchangeRate) {
    selectedCurrencyLabel.value = `${row.currencyCode} — ${row.currencyName}`;
    await exchangeRateStore.fetchHistory(row.currencyId);
    historyDialogVisible.value = true;
}

// ─── Silme ────────────────────────────────────────────────────────────────────
const deleteDialogVisible = ref(false);
const rateToDelete = ref<ExchangeRate | null>(null);

function confirmDeleteHistory(row: ExchangeRate) {
    rateToDelete.value = row;
    deleteDialogVisible.value = true;
}

async function deleteRate() {
    if (!rateToDelete.value) return;
    const result = await exchangeRateStore.deleteRate(rateToDelete.value.id);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kur kaydı silindi', life: 3000 });
        // Geçmiş dialog açıksa güncelle
        if (historyDialogVisible.value && rateToDelete.value) {
            await exchangeRateStore.fetchHistory(rateToDelete.value.currencyId);
        }
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
    deleteDialogVisible.value = false;
    rateToDelete.value = null;
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('tr-TR');
}

function formatRate(rate: number): string {
    return rate.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}



const selectableCurrencies = computed(() =>
    lookupStore.currencies.filter(
        (c) => !['TRY', 'TL'].includes(c.code.toUpperCase())
    )
);

onMounted(async () => {
    await exchangeRateStore.fetchCurrentRates();
    if (lookupStore.currencies.length === 0) await lookupStore.fetchAll();
});
</script>

<template>
    <div>
        <!-- Başlık & Toolbar -->
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <h4 class="m-0 text-xl font-semibold">Döviz Kur Yönetimi</h4>
            </div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Kur Gir" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNewRateDialog" />
                </template>
                <template #end>
                    <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <!-- Filtreler -->
        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.code" placeholder="Kod (USD, EUR...)" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.name" placeholder="Ad" fluid />
                </div>
                <div class="col-span-1">
                    <DatePicker
                        v-model="filterForm.dateFrom"
                        placeholder="Başlangıç Tarihi"
                        dateFormat="dd.mm.yy"
                        showTime
                        hourFormat="24"
                        showIcon
                        fluid
                    />
                </div>
                <div class="col-span-1">
                    <DatePicker
                        v-model="filterForm.dateTo"
                        placeholder="Bitiş Tarihi"
                        dateFormat="dd.mm.yy"
                        showTime
                        hourFormat="24"
                        showIcon
                        fluid
                    />
                </div>
                <div class="col-span-1 flex items-end gap-2">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <!-- Güncel Kurlar Tablosu -->
        <div class="card">
            <DataTable
                :value="filteredRates"
                dataKey="id"
                :loading="exchangeRateStore.loading"
                :paginator="true"
                :rows="10"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Gösterilen {first} - {last} / {totalRecords} döviz"
            >
                <Column field="currencyCode" header="Kod" sortable style="width: 8rem">
                    <template #body="slotProps">
                        <Tag severity="info" :value="slotProps.data.currencyCode" />
                    </template>
                </Column>
                <Column field="currencyName" header="Döviz Adı" sortable></Column>
                <Column field="rate" header="Güncel Kur (TRY Karşılığı)" sortable>
                    <template #body="slotProps">
                        <span class="font-bold text-lg">
                            1 {{ slotProps.data.currencyCode }} = {{ formatRate(slotProps.data.rate) }} ₺
                        </span>
                    </template>
                </Column>
                <Column field="effectiveDate" header="Geçerlilik Tarihi" sortable>
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.effectiveDate) }}
                    </template>
                </Column>
                <Column header="İşlemler" style="width: 12rem">
                    <template #body="slotProps">
                        <Button
                            icon="pi pi-pencil"
                            outlined
                            rounded
                            class="mr-2"
                            v-tooltip.top="'Kur Güncelle'"
                            @click="openUpdateDialog(slotProps.data)"
                        />
                        <Button
                            icon="pi pi-history"
                            outlined
                            rounded
                            severity="secondary"
                            v-tooltip.top="'Kur Geçmişi'"
                            @click="openHistory(slotProps.data)"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- ─── Kur Giriş Dialog ─────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="rateDialogVisible"
            :header="rateForm.currencyId ? `${rateForm.currencyCode} Kuru Güncelle` : 'Yeni Kur Gir'"
            modal
            :style="{ width: '680px' }"
        >
            <div class="flex flex-col gap-4 pt-2">
                <!-- Döviz seçimi — sadece "Yeni Kur Gir"'de göster -->
                <div v-if="!rateForm.currencyId || rateForm.currencyId === ''">
                    <label class="block font-bold mb-3">Döviz</label>
                    <Select
                        v-model="rateForm.currencyId"
                        :options="selectableCurrencies"
                        optionLabel="code"
                        optionValue="id"
                        placeholder="Döviz seçin"
                        :invalid="rateSubmitted && !rateForm.currencyId"
                        fluid
                        @change="onCurrencySelect(rateForm.currencyId)"
                    >
                        <template #option="slotProps">
                            <span>
                                <Tag severity="info" :value="slotProps.option.code" class="mr-2" />
                                {{ slotProps.option.name }}
                            </span>
                        </template>
                    </Select>
                    <small v-if="rateSubmitted && !rateForm.currencyId" class="text-red-500">Döviz seçimi zorunludur.</small>
                </div>

                <div>
                    <label class="block font-bold mb-3">
                        TL Kuru 
                    </label>
                    <InputNumber
                        v-model="rateForm.rate"
                        :minFractionDigits="4"
                        :maxFractionDigits="6"
                        :min="0.0001"
                        placeholder="Örn: 32.5000"
                        :invalid="rateSubmitted && (!rateForm.rate || rateForm.rate <= 0)"
                        fluid
                        autofocus
                    />
                    <small v-if="rateSubmitted && (!rateForm.rate || rateForm.rate <= 0)" class="text-red-500">
                        Geçerli bir kur değeri giriniz.
                    </small>
                </div>

                <div>
                    <label class="block font-bold mb-3">Geçerlilik Tarihi</label>
                    <DatePicker v-model="rateForm.effectiveDate" fluid dateFormat="dd.mm.yy" />
                </div>

                <div>
                    <label class="block font-bold mb-3">Notlar <span class="font-normal text-surface-500">(opsiyonel)</span></label>
                    <InputText v-model="rateForm.notes" placeholder="Örn: TCMB alış kuru" fluid />
                </div>
            </div>
        
                <div class="grid grid-cols-12 gap-4 mt-6">
                    <div class="col-span-6">
                        <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="rateDialogVisible = false" />
                    </div>
                    <div class="col-span-6">
                        <Button label="Kaydet" icon="pi pi-check" class="w-full" @click="saveRate" />
                    </div>
                </div>
        
        </Dialog>

        <!-- ─── Geçmiş Dialog ────────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="historyDialogVisible"
            :header="`Kur Geçmişi — ${selectedCurrencyLabel}`"
            modal
            :style="{ width: '680px' }"
        >
            <DataTable
                :value="exchangeRateStore.history"
                :loading="exchangeRateStore.loading"
                dataKey="id"
                :rows="10"
                :paginator="exchangeRateStore.history.length > 10"
            >
                <Column field="effectiveDate" header="Geçerlilik Tarihi" sortable>
                    <template #body="slotProps">{{ formatDate(slotProps.data.effectiveDate) }}</template>
                </Column>
                <Column field="rate" header="Kur (TRY)" sortable>
                    <template #body="slotProps">
                        <span class="font-bold">{{ formatRate(slotProps.data.rate) }} ₺</span>
                    </template>
                </Column>
                <Column field="notes" header="Notlar"></Column>
                <Column field="createdAt" header="Oluşturulma">
                    <template #body="slotProps">{{ formatDate(slotProps.data.createdAt) }}</template>
                </Column>
                <Column header="" style="width: 5rem">
                    <template #body="slotProps">
                        <Button
                            icon="pi pi-trash"
                            outlined
                            rounded
                            severity="danger"
                            v-tooltip.top="'Kaydı Sil'"
                            @click="confirmDeleteHistory(slotProps.data)"
                        />
                    </template>
                </Column>
            </DataTable>
        </Dialog>

        <!-- ─── Silme Onay Dialog ─────────────────────────────────────────────── -->
        <Dialog v-model:visible="deleteDialogVisible" header="Silme Onayı" modal :style="{ width: '680px' }">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-4xl text-orange-400" />
                <span v-if="rateToDelete">
                    <b>{{ formatDate(rateToDelete.effectiveDate) }}</b> tarihli
                    <b>{{ rateToDelete.currencyCode }}</b> kurunu silmek istediğinize emin misiniz?
                </span>
            </div>
            <template #footer>
                <div class="grid grid-cols-12 gap-4 mt-2">
                    <div class="col-span-6">
                        <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="deleteDialogVisible = false" />
                    </div>
                    <div class="col-span-6">
                        <Button label="Evet, Sil" icon="pi pi-trash" severity="danger" class="w-full" @click="deleteRate" />
                    </div>
                </div>
            </template>
        </Dialog>
    </div>
</template>