<script setup lang="ts">
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { Currency } from '@/modules/inventory/domain/currency.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const lookupStore = useLookupStore();
const toast = useToast();

// --- Liste & filtre ---
const showFilters = ref(false);

interface CurrencyFilterForm {
    code: string;
    name: string;
}

const filterForm = ref<CurrencyFilterForm>({ code: '', name: '' });
const activeFilters = ref<CurrencyFilterForm>({ ...filterForm.value });

const currencies = computed(() => lookupStore.currencies ?? []);

const filteredCurrencies = computed(() => {
    let list = currencies.value;
    if (activeFilters.value.code) {
        const q = activeFilters.value.code.toLowerCase();
        list = list.filter((c) => c.code.toLowerCase().includes(q));
    }
    if (activeFilters.value.name) {
        const q = activeFilters.value.name.toLowerCase();
        list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
});

function toggleFilters() {
    showFilters.value = !showFilters.value;
}

function applyFilters() {
    activeFilters.value = { ...filterForm.value };
}

function clearFilters() {
    filterForm.value = { code: '', name: '' };
    activeFilters.value = { ...filterForm.value };
}

// --- Dialog ---
const dialogVisible = ref(false);
const isEditMode = ref(false);
const submitted = ref(false);

interface CurrencyForm {
    id: string;
    code: string;
    name: string;
}

const emptyForm = (): CurrencyForm => ({ id: '', code: '', name: '' });
const form = ref<CurrencyForm>(emptyForm());

function openNew() {
    form.value = emptyForm();
    isEditMode.value = false;
    submitted.value = false;
    dialogVisible.value = true;
}

function editCurrency(currency: Currency) {
    form.value = { id: currency.id, code: currency.code, name: currency.name };
    isEditMode.value = true;
    submitted.value = false;
    dialogVisible.value = true;
}

function closeDialog() {
    dialogVisible.value = false;
}

async function saveCurrency() {
    submitted.value = true;
    if (!form.value.code.trim() || !form.value.name.trim()) return;

    const result = isEditMode.value
        ? await lookupStore.editCurrency(form.value.id, form.value.code, form.value.name)
        : await lookupStore.addCurrency(form.value.code, form.value.name);

    if (result.success) {
        toast.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: isEditMode.value ? 'Döviz güncellendi' : 'Döviz eklendi',
            life: 3000
        });
        dialogVisible.value = false;
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

// --- Silme ---
const deleteDialogVisible = ref(false);
const currencyToDelete = ref<Currency | null>(null);

const menu = ref();
const menuItems = computed(() => [
    {
        label: 'Düzenle',
        command: () => {
            if (currencyToDelete.value) editCurrency(currencyToDelete.value as Currency);
        }
    },
    {
        label: 'Sil',
        command: () => {
            if (currencyToDelete.value) confirmDelete(currencyToDelete.value as Currency);
        }
    }
]);

const onActionClick = (event: any, currency: Currency) => {
    currencyToDelete.value = currency;
    menu.value.toggle(event);
};

function confirmDelete(currency: Currency) {
    currencyToDelete.value = currency;
    deleteDialogVisible.value = true;
}

async function deleteCurrency() {
    if (!currencyToDelete.value) return;
    const result = await lookupStore.removeCurrency(currencyToDelete.value.id);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Döviz silindi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
    deleteDialogVisible.value = false;
    currencyToDelete.value = null;
}

onMounted(() => {
    lookupStore.fetchAll();
});
</script>

<template>
    <div>
        <!-- Başlık & Toolbar -->
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Döviz Yönetimi</div>
            </div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Döviz Ekle" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>
                <template #end>
                    <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <!-- Filtreler -->
        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.code" placeholder="Kod (USD, TRY...)" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.name" placeholder="Ad" fluid />
                </div>
                <div class="col-span-1 flex items-end gap-2">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <!-- Tablo -->
        <div class="card">
            <DataTable
                :value="filteredCurrencies"
                dataKey="id"
                :paginator="true"
                :rows="10"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Gösterilen {first} - {last} / {totalRecords} döviz"
            >
                <Column field="code" header="Kod" sortable>
                    <template #body="slotProps">
                        <Tag severity="info" :value="slotProps.data.code" />
                    </template>
                </Column>
                <Column field="name" header="Ad" sortable></Column>
                <Column header="İşlemler" style="min-width: 50px">
                    <template #body="slotProps">
                        <Button icon="pi pi-ellipsis-v" text rounded @click="onActionClick($event, slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Yeni / Düzenle Dialog -->
        <Dialog v-model:visible="dialogVisible" :header="isEditMode ? 'Döviz Düzenle' : 'Yeni Döviz Ekle'" modal :style="{ width: '400px' }">
            <div class="flex flex-col gap-4 pt-2">
                <div>
                    <label for="currencyCode" class="block font-bold mb-3">Döviz Kodu</label>
                    <InputText
                        id="currencyCode"
                        v-model.trim="form.code"
                        placeholder="Örn: USD, EUR, GBP"
                        :invalid="submitted && !form.code"
                        fluid
                        autofocus
                    />
                    <small v-if="submitted && !form.code" class="text-red-500">Döviz kodu zorunludur.</small>
                </div>
                <div>
                    <label for="currencyName" class="block font-bold mb-3">Döviz Adı</label>
                    <InputText
                        id="currencyName"
                        v-model.trim="form.name"
                        placeholder="Örn: Amerikan Doları"
                        :invalid="submitted && !form.name"
                        fluid
                    />
                    <small v-if="submitted && !form.name" class="text-red-500">Döviz adı zorunludur.</small>
                </div>
            </div>
            <template #footer>
                <div class="grid grid-cols-12 gap-4 mt-2">
                    <div class="col-span-6">
                        <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="closeDialog" />
                    </div>
                    <div class="col-span-6">
                        <Button label="Kaydet" icon="pi pi-check" class="w-full" @click="saveCurrency" />
                    </div>
                </div>
            </template>
        </Dialog>

        <!-- Silme Onay Dialog -->
        <Dialog v-model:visible="deleteDialogVisible" header="Silme Onayı" modal :style="{ width: '380px' }">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-4xl text-orange-400" />
                <span v-if="currencyToDelete">
                    <b>{{ currencyToDelete.code }} — {{ currencyToDelete.name }}</b> dövizini silmek istediğinize emin misiniz?
                </span>
            </div>
            <template #footer>
                <div class="grid grid-cols-12 gap-4 mt-2">
                    <div class="col-span-6">
                        <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="deleteDialogVisible = false" />
                    </div>
                    <div class="col-span-6">
                        <Button label="Evet, Sil" icon="pi pi-trash" severity="danger" class="w-full" @click="deleteCurrency" />
                    </div>
                </div>
            </template>
        </Dialog>

        <Menu ref="menu" :model="menuItems" :popup="true" />
    </div>
</template>
