<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { Account, type AccountType, type AddressValue } from '@/modules/finance/domain/account.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();
const route = useRoute();

interface AccountForm {
    id?: string;
    companyId?: string;
    accountType: AccountType;
    name?: string;
    taxNumber?: string;
    taxOffice?: string;
    email?: string;
    phone?: string;
    authorizedPerson?: string;
    authorizedGsm?: string;
    address?: AddressValue;
    city?: string;
    district?: string;
    country?: string;
    bankName?: string;
    accountOwner?: string;
    iban?: string;
    description?: string;
    isDealer?: boolean;
    dealerDiscount1?: number;
    dealerDiscount2?: number;
    dealerDiscount3?: number;
    creditLimit: number;
    isActive: boolean;
    createdAt?: Date;
}

const account = ref<AccountForm>({
    accountType: 'customer',
    isActive: true,
    creditLimit: 0,
    isDealer: false,
    dealerDiscount1: 0,
    dealerDiscount2: 0,
    dealerDiscount3: 0
});
const submitted = ref(false);

const accountTypes: Array<{ label: string; value: AccountType }> = [
    { label: 'Müşteri', value: 'customer' },
    { label: 'Tedarikçi', value: 'supplier' },
    { label: 'Her İkisi', value: 'both' }
];
const statusOptions = [
    { label: 'Aktif', value: true },
    { label: 'Pasif', value: false }
];
const dealerOptions = [
    { label: 'Evet', value: true },
    { label: 'Hayır', value: false }
];

async function loadAccount() {
    const id = route.params.id as string;
    if (!id) return;

    if (financeStore.accounts.length === 0) {
        await financeStore.fetchAccounts();
    }

    const found = financeStore.accounts.find((item) => item.id === id);
    if (!found) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Cari hesap bulunamadı', life: 3000 });
        router.push('/finance/accounts');
        return;
    }

    const obj = found.toObject();
    account.value = {
        ...obj,
        isDealer: obj.isDealer ?? false,
        dealerDiscount1: obj.dealerDiscount1 ?? 0,
        dealerDiscount2: obj.dealerDiscount2 ?? 0,
        dealerDiscount3: obj.dealerDiscount3 ?? 0,
        creditLimit: obj.creditLimit ?? 0
    };
}

onMounted(async () => {
    await loadAccount();
});

async function saveAccount() {
    submitted.value = true;
    if (!account.value.name?.trim()) return;

    if (account.value.iban && !isValidIban(account.value.iban)) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'IBAN formatı geçersiz', life: 3000 });
        return;
    }
    if (account.value.taxNumber && !isValidTaxNumber(account.value.taxNumber)) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Vergi No / TC formatı geçersiz', life: 3000 });
        return;
    }
    if (account.value.authorizedGsm && !isValidGsm(account.value.authorizedGsm)) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Yetkili GSM formatı geçersiz', life: 3000 });
        return;
    }
    if (account.value.phone && !isValidGsm(account.value.phone)) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Telefon formatı geçersiz', life: 3000 });
        return;
    }

    const acc = Account.create({
        id: account.value.id || crypto.randomUUID(),
        companyId: account.value.companyId || authStore.user?.companyId || '',
        accountType: account.value.accountType,
        name: account.value.name.trim(),
        taxNumber: account.value.taxNumber,
        taxOffice: account.value.taxOffice,
        email: account.value.email,
        phone: account.value.phone,
        authorizedPerson: account.value.authorizedPerson,
        authorizedGsm: account.value.authorizedGsm,
        address: account.value.address,
        city: account.value.city,
        district: account.value.district,
        country: account.value.country,
        bankName: account.value.bankName,
        accountOwner: account.value.accountOwner,
        iban: account.value.iban,
        description: account.value.description,
        isDealer: account.value.isDealer,
        dealerDiscount1: account.value.dealerDiscount1,
        dealerDiscount2: account.value.dealerDiscount2,
        dealerDiscount3: account.value.dealerDiscount3,
        creditLimit: account.value.creditLimit,
        isActive: account.value.isActive,
        createdAt: account.value.createdAt || new Date(),
        updatedAt: new Date()
    });

    const result = await financeStore.saveAccount(acc);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Cari hesap güncellendi', life: 3000 });
        router.push('/finance/accounts');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function normalizeDigits(value: string): string {
    return value.replace(/\D+/g, '');
}

function isValidGsm(value: string): boolean {
    const digits = normalizeDigits(value);
    return digits.length === 10 || digits.length === 11;
}

function isValidTaxNumber(value: string): boolean {
    const digits = normalizeDigits(value);
    return digits.length === 10 || digits.length === 11;
}

function isValidIban(value: string): boolean {
    const raw = value.replace(/\s+/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(raw)) return false;
    const rearranged = raw.slice(4) + raw.slice(0, 4);
    const expanded = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
    let mod = 0;
    for (let i = 0; i < expanded.length; i += 1) {
        mod = (mod * 10 + Number(expanded[i])) % 97;
    }
    return mod === 1;
}

function formatIban(value?: string): string | undefined {
    if (!value) return value;
    const raw = value.replace(/\s+/g, '').toUpperCase();
    const grouped = raw.replace(/(.{4})/g, '$1 ').trim();
    return grouped || value;
}

function onIbanBlur() {
    if (account.value.iban) {
        account.value.iban = formatIban(account.value.iban);
    }
}

function goBack() {
    router.push('/finance/accounts');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-6 min-h-32 flex flex-col gap-0">
            <h4 class="m-0 text-xl font-bold"> {{ account.name }}</h4>
            <div class="text-surface-600 dark:text-surface-400">
                <p>Değişiklikleri tamamladıktan sonra "Güncelle" butonu ile kaydedebilirsiniz.</p>
            </div>
        </div>

                <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="name" class="block font-bold mb-3">Adı - Ünvanı</label>
                            <InputText id="name" v-model.trim="account.name" required="true" :invalid="submitted && !account.name" fluid />
                            <small v-if="submitted && !account.name" class="text-red-500">Ad zorunludur.</small>
                        </div>

                        <div>
                            <label for="type" class="block font-bold mb-3">Hesap Tipi</label>
                            <Select id="type" v-model="account.accountType" :options="accountTypes" optionLabel="label" optionValue="value" fluid />
                        </div>

                        <div>
                            <label for="taxNumber" class="block font-bold mb-3">Vergi No - TC</label>
                            <InputText id="taxNumber" v-model.trim="account.taxNumber" fluid />
                        </div>

                        <div>
                            <label for="taxOffice" class="block font-bold mb-3">Vergi Dairesi</label>
                            <InputText id="taxOffice" v-model.trim="account.taxOffice" fluid />
                        </div>

                        <div>
                            <label for="email" class="block font-bold mb-3">E-posta</label>
                            <InputText id="email" v-model.trim="account.email" fluid />
                        </div>

                        <div>
                            <label for="phone" class="block font-bold mb-3">Telefon</label>
                            <InputText id="phone" v-model.trim="account.phone" fluid />
                        </div>

                        <div>
                            <label for="authorizedPerson" class="block font-bold mb-3">Yetkili Kişi</label>
                            <InputText id="authorizedPerson" v-model.trim="account.authorizedPerson" fluid />
                        </div>

                        <div>
                            <label for="authorizedGsm" class="block font-bold mb-3">Yetkili GSM</label>
                            <InputText id="authorizedGsm" v-model.trim="account.authorizedGsm" fluid />
                        </div>
                    </div>
                </div>

                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="bankName" class="block font-bold mb-3">Çalıştığı Banka</label>
                            <InputText id="bankName" v-model.trim="account.bankName" fluid />
                        </div>
                        <div>
                            <label for="accountOwner" class="block font-bold mb-3">Hesap Sahibi</label>
                            <InputText id="accountOwner" v-model.trim="account.accountOwner" fluid />
                        </div>
                        <div>
                            <label for="iban" class="block font-bold mb-3">IBAN</label>
                            <InputText id="iban" v-model.trim="account.iban" fluid @blur="onIbanBlur" />
                        </div>
                        <div>
                            <label for="creditLimit" class="block font-bold mb-3">Kredi Limiti</label>
                            <InputNumber id="creditLimit" v-model="account.creditLimit" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                    </div>
                </div>

                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="dealer" class="block font-bold mb-3">Bayi</label>
                            <Select id="dealer" v-model="account.isDealer" :options="dealerOptions" optionLabel="label" optionValue="value" placeholder="Seçin" fluid />
                        </div>

                        <div>
                            <label for="dealerDiscount1" class="block font-bold mb-3">Bayi İskontosu (1)</label>
                            <InputNumber id="dealerDiscount1" v-model="account.dealerDiscount1" :min="0" :max="100" :minFractionDigits="2" suffix="%" fluid />
                        </div>

                        <div>
                            <label for="dealerDiscount2" class="block font-bold mb-3">Bayi İskontosu (2)</label>
                            <InputNumber id="dealerDiscount2" v-model="account.dealerDiscount2" :min="0" :max="100" :minFractionDigits="2" suffix="%" fluid />
                        </div>

                        <div>
                            <label for="dealerDiscount3" class="block font-bold mb-3">Bayi İskontosu (3)</label>
                            <InputNumber id="dealerDiscount3" v-model="account.dealerDiscount3" :min="0" :max="100" :minFractionDigits="2" suffix="%" fluid />
                        </div>
                    </div>
                </div>

                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        <div>
                            <label for="address" class="block font-bold mb-3">Adres</label>
                            <Textarea id="address" v-model="account.address" rows="3" fluid />
                        </div>
                        <div>
                            <label for="description" class="block font-bold mb-3">Açıklama</label>
                            <Textarea id="description" v-model="account.description" rows="3" fluid />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <div>
                            <label for="city" class="block font-bold mb-3">İl</label>
                            <InputText id="city" v-model.trim="account.city" fluid />
                        </div>
                        <div>
                            <label for="district" class="block font-bold mb-3">İlçe</label>
                            <InputText id="district" v-model.trim="account.district" fluid />
                        </div>
                        <div>
                            <label for="country" class="block font-bold mb-3">Ülke</label>
                            <InputText id="country" v-model.trim="account.country" fluid />
                        </div>
                        <div>
                            <label for="status" class="block font-bold mb-3">Durum</label>
                            <Select id="status" v-model="account.isActive" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Seçin" fluid />
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Güncelle" icon="pi pi-check" class="w-full" @click="saveAccount" />
                </div>
            </div>
        </div>
    </div>
</template>

