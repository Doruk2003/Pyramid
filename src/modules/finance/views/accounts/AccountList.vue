<script setup lang="ts">
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import type { Account } from '@/modules/finance/domain/account.entity';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const router = useRouter();
const financeStore = useFinanceStore();
const toast = useToast();

const selectedAccounts = ref<Account[]>([]);
const showFilters = ref(false);
const deleteDialog = ref(false);
const accountToDelete = ref<Account | null>(null);

interface AccountFilterForm {
    name: string;
    phone: string;
    city: string;
    district: string;
    country: string;
    accountType: 'customer' | 'supplier' | 'both' | null;
    isActive: boolean | null;
}

const filterForm = ref<AccountFilterForm>({
    name: '',
    phone: '',
    city: '',
    district: '',
    country: '',
    accountType: null,
    isActive: null
});

const activeFilters = ref<AccountFilterForm>({ ...filterForm.value });

const accountTypes = ref([
    { label: 'Müşteri', value: 'customer' },
    { label: 'Tedarikçi', value: 'supplier' },
    { label: 'Müşteri + Tedarikçi', value: 'both' }
]);

const statusOptions = ref([
    { label: 'Aktif', value: true },
    { label: 'Pasif', value: false }
]);

onMounted(() => {
    financeStore.fetchAccounts();
});

function openNew() {
    router.push('/finance/accounts/create');
}

function editAccount(acc: Account) {
    router.push(`/finance/accounts/edit/${acc.id}`);
}

function confirmDeleteAccount(acc: Account) {
    accountToDelete.value = acc;
    deleteDialog.value = true;
}

async function deleteAccount() {
    if (!accountToDelete.value?.id) return;
    const result = await financeStore.deleteAccount(accountToDelete.value.id);
    deleteDialog.value = false;
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Silindi', detail: 'Cari hesap silindi', life: 3000 });
    } else {
        // Aktif fatura/teklif varsa DB RESTRICT hatası döner
        toast.add({ severity: 'error', summary: 'Silinemedi', detail: getErrorMessage(result.error), life: 5000 });
    }
    accountToDelete.value = null;
}

const accounts = computed(() => financeStore.accounts ?? []);

const filteredAccounts = computed(() => {
    let list = accounts.value;
    const filters = activeFilters.value;

    if (filters.name) {
        const query = filters.name.toLowerCase();
        list = list.filter((item) => (item.name || '').toLowerCase().includes(query));
    }
    if (filters.phone) {
        const query = filters.phone.toLowerCase();
        list = list.filter((item) => (item.phone || '').toLowerCase().includes(query));
    }
    if (filters.city) {
        const query = filters.city.toLowerCase();
        list = list.filter((item) => (item.city || '').toLowerCase().includes(query));
    }
    if (filters.district) {
        const query = filters.district.toLowerCase();
        list = list.filter((item) => (item.district || '').toLowerCase().includes(query));
    }
    if (filters.country) {
        const query = filters.country.toLowerCase();
        list = list.filter((item) => (item.country || '').toLowerCase().includes(query));
    }
    if (filters.accountType) {
        list = list.filter((item) => item.accountType === filters.accountType);
    }
    if (filters.isActive !== null) {
        list = list.filter((item) => item.isActive === filters.isActive);
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
    filterForm.value = {
        name: '',
        phone: '',
        city: '',
        district: '',
        country: '',
        accountType: null,
        isActive: null
    };
    activeFilters.value = { ...filterForm.value };
}
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Cari Hesap Yönetimi</div>
            </div>

            <Toolbar>
                <template #start>
                    <Button label="Yeni Cari Hesap Oluştur" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>
                <template #end>
                    <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.name" placeholder="Ad / Ünvan" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.phone" placeholder="Telefon" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.city" placeholder="İl" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.district" placeholder="İlçe" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.country" placeholder="Ülke" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.accountType" :options="accountTypes" optionLabel="label" optionValue="value" placeholder="Tip" fluid />
                </div>
                <div class="col-span-1">
                    <Select v-model="filterForm.isActive" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Durum" fluid />
                </div>
                <div class="col-span-1 flex items-end gap-2">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <div class="card">
            <DataTable
                v-model:selection="selectedAccounts"
                :value="filteredAccounts"
                dataKey="id"
                :paginator="true"
                :rows="10"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Gösterilen {first} - {last} / {totalRecords} cari hesap"
            >
                <Column field="name" header="Ad / Ünvan" sortable></Column>
                <Column field="authorizedPerson" header="Yetkili Kişi" sortable></Column>
                <Column field="authorizedGsm" header="Yetkili GSM" sortable></Column>
                <Column field="accountType" header="Tip" sortable>
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.accountType === 'customer' ? 'info' : slotProps.data.accountType === 'supplier' ? 'warn' : 'success'" :value="slotProps.data.accountType === 'customer' ? 'Müşteri' : slotProps.data.accountType === 'supplier' ? 'Tedarikçi' : 'Müşteri + Tedarikçi'" />
                    </template>
                </Column>
                <Column field="taxNumber" header="Vergi No" sortable></Column>
                <Column field="email" header="E-posta" sortable></Column>
                <Column field="phone" header="Telefon"></Column>
                <Column field="isActive" header="Durum" sortable>
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.isActive ? 'success' : 'secondary'" :value="slotProps.data.isActive ? 'Aktif' : 'Pasif'" />
                    </template>
                </Column>
                <Column header="İşlemler" style="min-width: 100px">
                    <template #body="slotProps">
                        <Button
                            icon="pi pi-pencil"
                            outlined rounded
                            class="mr-2"
                            v-tooltip.top="'Düzenle'"
                            @click="editAccount(slotProps.data)"
                        />
                        <Button
                            icon="pi pi-trash"
                            outlined rounded
                            severity="danger"
                            v-tooltip.top="'Sil'"
                            @click="confirmDeleteAccount(slotProps.data)"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Silme Onay Dialogu -->
        <Dialog
            v-model:visible="deleteDialog"
            :style="{ width: '420px' }"
            header="Cari Hesap Silme Onayı"
            :modal="true"
        >
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-4xl text-orange-500" />
                <div>
                    <p class="font-semibold mb-1">Bu cari hesabı silmek istediğinizden emin misiniz?</p>
                    <p class="text-surface-600 dark:text-surface-400 text-sm">
                        <strong>{{ accountToDelete?.name }}</strong> soft-delete ile işaretlenecek.
                        Bu hesaba ait açık fatura veya teklif varsa silme işlemi başarısız olur.
                    </p>
                </div>
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="deleteDialog = false" />
                <Button label="Evet, Sil" icon="pi pi-trash" severity="danger" @click="deleteAccount" />
            </template>
        </Dialog>
    </div>
</template>
