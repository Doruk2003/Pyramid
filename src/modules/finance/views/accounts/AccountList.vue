<script setup lang="ts">
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import type { Account } from '@/modules/finance/domain/account.entity';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const financeStore = useFinanceStore();

const selectedAccounts = ref<Account[]>([]);

onMounted(() => {
    financeStore.fetchAccounts();
});

function openNew() {
    router.push('/finance/accounts/create');
}

function editAccount(acc: Account) {
    router.push(`/finance/accounts/edit/${acc.id}`);
}

const accounts = computed(() => financeStore.accounts ?? []);
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <h4 class="m-0 text-xl font-semibold">Cari Hesap Y?netimi</h4>
            </div>

            <Toolbar>
                <template #start>
                    <Button label="Yeni Cari Hesap Olu?tur" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <DataTable
                v-model:selection="selectedAccounts"
                :value="accounts"
                dataKey="id"
                :paginator="true"
                :rows="10"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="G?sterilen {first} - {last} / {totalRecords} cari hesap"
            >
                <Column field="name" header="Ad / ?nvan" sortable></Column>
                <Column field="authorizedPerson" header="Yetkili Ki?i" sortable></Column>
                <Column field="authorizedGsm" header="Yetkili GSM" sortable></Column>
                <Column field="accountType" header="Tip" sortable>
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.accountType === 'customer' ? 'info' : slotProps.data.accountType === 'supplier' ? 'warn' : 'success'" :value="slotProps.data.accountType === 'customer' ? 'M??teri' : slotProps.data.accountType === 'supplier' ? 'Tedarik?i' : 'M??teri + Tedarik?i'" />
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
                <Column header="??lemler">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editAccount(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
