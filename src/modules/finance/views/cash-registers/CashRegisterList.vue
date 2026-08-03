<script setup lang="ts">
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { CashRegister } from '@/modules/finance/domain/cash-register.entity';
import { useAuthStore } from '@/core/auth/auth.store';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const router = useRouter();
const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();

const registerDialog = ref(false);
const isEdit = ref(false);
const submitted = ref(false);

const registerForm = ref({
    id: '',
    name: '',
    type: 'cash' as 'cash' | 'bank' | 'check_note' | 'credit_card',
    currency: 'TRY',
    description: '',
    isActive: true
});

const typeOptions = [
    { label: 'Kasa (Nakit)', value: 'cash' },
    { label: 'Banka Hesabı', value: 'bank' },
    { label: 'Çek/Senet Kasası', value: 'check_note' },
    { label: 'Kredi Kartı Posu', value: 'credit_card' }
];

const currencyOptions = [
    { label: 'Türk Lirası (TRY)', value: 'TRY' },
    { label: 'Amerikan Doları (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' }
];

onMounted(async () => {
    await financeStore.fetchCashRegisters();
    await financeStore.fetchPayments();
});

const cashRegisters = computed(() => financeStore.cashRegisters ?? []);

function getRegisterBalance(registerId: string): number {
    return (financeStore.payments ?? [])
        .filter(p => p.cashRegisterId === registerId && p.status === 'completed')
        .reduce((sum, p) => {
            if (p.paymentType === 'collection') return sum + p.amount;
            if (p.paymentType === 'payment') return sum - p.amount;
            return sum;
        }, 0);
}

function openNew() {
    registerForm.value = {
        id: '',
        name: '',
        type: 'cash',
        currency: 'TRY',
        description: '',
        isActive: true
    };
    isEdit.value = false;
    submitted.value = false;
    registerDialog.value = true;
}

function editRegister(reg: CashRegister) {
    const obj = reg.toObject();
    registerForm.value = {
        id: obj.id,
        name: obj.name,
        type: obj.type,
        currency: obj.currency,
        description: obj.description || '',
        isActive: obj.isActive
    };
    isEdit.value = true;
    submitted.value = false;
    registerDialog.value = true;
}

async function saveRegister() {
    submitted.value = true;
    if (!registerForm.value.name.trim()) return;

    const companyId = authStore.user?.companyId || '';
    const reg = CashRegister.create({
        id: registerForm.value.id || crypto.randomUUID(),
        companyId,
        name: registerForm.value.name,
        type: registerForm.value.type,
        currency: registerForm.value.currency,
        description: registerForm.value.description || undefined,
        isActive: registerForm.value.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const result = await financeStore.saveCashRegister(reg);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: isEdit.value ? 'Kasa güncellendi' : 'Kasa oluşturuldu', life: 3000 });
        registerDialog.value = false;
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 5000 });
    }
}

function viewStatement(reg: CashRegister) {
    router.push(`/finance/cash-registers/statement/${reg.id}`);
}

function formatCurrency(val: number, curr: string): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: curr }).format(val);
}
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Kasa & Banka Yönetimi</div>
            </div>

            <Toolbar>
                <template #start>
                    <Button label="Yeni Kasa/Banka Tanımla" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <DataTable :value="cashRegisters" dataKey="id" :paginator="true" :rows="10">
                <template #empty>
                    <div class="text-center py-6 text-surface-500">
                        <i class="pi pi-wallet text-4xl mb-3 text-surface-400 block" />
                        Tanımlı Kasa veya Banka hesabı bulunamadı.
                    </div>
                </template>
                <Column field="name" header="Hesap Adı" sortable></Column>
                <Column field="type" header="Hesap Türü" sortable>
                    <template #body="slotProps">
                        <span v-if="slotProps.data.type === 'cash'"><i class="pi pi-money-bill mr-1.5 text-green-500" />Nakit Kasa</span>
                        <span v-else-if="slotProps.data.type === 'bank'"><i class="pi pi-building mr-1.5 text-blue-500" />Banka Hesabı</span>
                        <span v-else-if="slotProps.data.type === 'check_note'"><i class="pi pi-file mr-1.5 text-orange-500" />Çek/Senet Kasası</span>
                        <span v-else-if="slotProps.data.type === 'credit_card'"><i class="pi pi-credit-card mr-1.5 text-purple-500" />Pos Cihazı</span>
                    </template>
                </Column>
                <Column field="currency" header="Para Birimi" sortable></Column>
                <Column header="Bakiye" sortable>
                    <template #body="slotProps">
                        <span class="font-bold" :class="getRegisterBalance(slotProps.data.id) >= 0 ? 'text-green-600' : 'text-red-600'">
                            {{ formatCurrency(getRegisterBalance(slotProps.data.id), slotProps.data.currency) }}
                        </span>
                    </template>
                </Column>
                <Column field="description" header="Açıklama"></Column>
                <Column field="isActive" header="Durum">
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.isActive ? 'success' : 'secondary'" :value="slotProps.data.isActive ? 'Aktif' : 'Pasif'" />
                    </template>
                </Column>
                <Column header="İşlemler" style="min-width: 150px">
                    <template #body="slotProps">
                        <Button icon="pi pi-list" label="Ekstre" outlined size="small" class="mr-2" @click="viewStatement(slotProps.data)" />
                        <Button icon="pi pi-pencil" severity="secondary" outlined size="small" @click="editRegister(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Kasa / Banka Form Dialogu -->
        <Dialog v-model:visible="registerDialog" :style="{ width: '450px' }" :header="isEdit ? 'Hesap Düzenle' : 'Yeni Kasa/Banka Hesabı'" :modal="true">
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-2">
                    <label for="name" class="font-bold">Hesap/Kasa Adı</label>
                    <InputText id="name" v-model="registerForm.name" placeholder="Örn: TR Merkez Kasa, Garanti TL vb." :invalid="submitted && !registerForm.name.trim()" fluid />
                    <small v-if="submitted && !registerForm.name.trim()" class="text-red-500">Ad alanı zorunludur.</small>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-bold">Hesap Türü</label>
                    <Select v-model="registerForm.type" :options="typeOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-bold">Para Birimi</label>
                    <Select v-model="registerForm.currency" :options="currencyOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="description" class="font-bold">Açıklama</label>
                    <Textarea id="description" v-model="registerForm.description" rows="3" fluid />
                </div>

                <div class="flex items-center gap-2">
                    <Checkbox v-model="registerForm.isActive" :binary="true" inputId="isActive" />
                    <label for="isActive">Aktif Hesap</label>
                </div>
            </div>

            <template #footer>
                <Button label="Vazgeç" icon="pi pi-times" text severity="secondary" @click="registerDialog = false" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveRegister" />
            </template>
        </Dialog>
    </div>
</template>
