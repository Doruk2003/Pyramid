<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { Account } from '@/modules/finance/domain/account.entity';
import { useToast } from 'primevue/usetoast';

const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();

const accountDialog = ref(false);
const account = ref<any>({});
const submitted = ref(false);

const accountTypes = [
    { label: 'Müşteri', value: 'customer' },
    { label: 'Tedarikçi', value: 'supplier' },
    { label: 'Her İkisi', value: 'both' }
];

onMounted(() => {
    financeStore.fetchAccounts();
});

function openNew() {
    account.value = { accountType: 'customer', isActive: true, creditLimit: 0 };
    submitted.value = false;
    accountDialog.value = true;
}

function editAccount(acc: any) {
    account.value = { ...acc };
    accountDialog.value = true;
}

async function saveAccount() {
    submitted.value = true;
    if (!account.value.name?.trim()) return;

    const acc = Account.create({
        id: account.value.id || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        accountType: account.value.accountType,
        name: account.value.name.trim(),
        taxNumber: account.value.taxNumber,
        email: account.value.email,
        phone: account.value.phone,
        address: account.value.address,
        creditLimit: account.value.creditLimit,
        isActive: account.value.isActive,
        createdAt: account.value.createdAt || new Date(),
        updatedAt: new Date()
    });

    const result = await financeStore.saveAccount(acc);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Cari hesap kaydedildi', life: 3000 });
        accountDialog.value = false;
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: (result as any).error.message, life: 3000 });
    }
}

function getAccountTypeLabel(type: string) {
    const map: any = {
        'customer': 'Müşteri',
        'supplier': 'Tedarikçi',
        'both': 'Müşteri + Tedarikçi'
    };
    return map[type] || type;
}

function getAccountTypeSeverity(type: string) {
    const map: any = {
        'customer': 'info',
        'supplier': 'warn',
        'both': 'success'
    };
    return map[type] || 'secondary';
}
</script>

<template>
    <div class="card">
        <Toolbar class="mb-6">
            <template #start>
                <Button label="Yeni Cari Hesap" icon="pi pi-plus" severity="secondary" @click="openNew" />
            </template>
        </Toolbar>

        <h4 class="m-0 mb-4">Cari Hesap Yönetimi</h4>
        <DataTable :value="financeStore.accounts" dataKey="id" :paginator="true" :rows="10">
            <Column field="name" header="Ad / Ünvan" sortable></Column>
            <Column field="accountType" header="Tip" sortable>
                <template #body="slotProps">
                    <Tag :severity="getAccountTypeSeverity(slotProps.data.accountType)" :value="getAccountTypeLabel(slotProps.data.accountType)" />
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
            <Column header="İşlemler">
                <template #body="slotProps">
                    <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editAccount(slotProps.data)" />
                </template>
            </Column>
        </DataTable>

        <Dialog v-model:visible="accountDialog" :style="{ width: '600px' }" header="Cari Hesap Detayları" :modal="true">
            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12">
                    <label for="name" class="block font-bold mb-3">Ad / Ünvan</label>
                    <InputText id="name" v-model.trim="account.name" required="true" autofocus :invalid="submitted && !account.name" fluid />
                    <small v-if="submitted && !account.name" class="text-red-500">Ad zorunludur.</small>
                </div>
                
                <div class="col-span-12 lg:col-span-6">
                    <label for="type" class="block font-bold mb-3">Hesap Tipi</label>
                    <Select id="type" v-model="account.accountType" :options="accountTypes" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="taxNumber" class="block font-bold mb-3">Vergi No / TC</label>
                    <InputText id="taxNumber" v-model.trim="account.taxNumber" fluid />
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="email" class="block font-bold mb-3">E-posta</label>
                    <InputText id="email" v-model.trim="account.email" fluid />
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="phone" class="block font-bold mb-3">Telefon</label>
                    <InputText id="phone" v-model.trim="account.phone" fluid />
                </div>

                <div class="col-span-12">
                    <label for="address" class="block font-bold mb-3">Adres</label>
                    <Textarea id="address" v-model="account.address" rows="3" fluid />
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label for="creditLimit" class="block font-bold mb-3">Kredi Limiti</label>
                    <InputNumber id="creditLimit" v-model="account.creditLimit" mode="currency" currency="TRY" locale="tr-TR" fluid />
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <label class="block font-bold mb-3">Durum</label>
                    <div class="flex items-center gap-4">
                        <div class="flex items-center">
                            <RadioButton v-model="account.isActive" inputId="active" name="status" :value="true" />
                            <label for="active" class="ml-2">Aktif</label>
                        </div>
                        <div class="flex items-center">
                            <RadioButton v-model="account.isActive" inputId="passive" name="status" :value="false" />
                            <label for="passive" class="ml-2">Pasif</label>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="accountDialog = false" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveAccount" />
            </template>
        </Dialog>
    </div>
</template>

