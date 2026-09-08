<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { ChequeNote, type ChequeNoteDirection, type ChequeNoteStatus, type ChequeNoteType } from '@/modules/finance/domain/cheque-note.entity';
import { useAuthStore } from '@/core/auth/auth.store';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const route = useRoute();
const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(false);
const submitted = ref(false);

const editId = computed(() => route.params.id as string | undefined);
const isEditMode = computed(() => !!editId.value);
const originalItem = ref<ChequeNote | null>(null);

const form = ref({
    type: 'cheque' as ChequeNoteType,
    direction: 'received' as ChequeNoteDirection,
    serialNumber: '',
    bankName: '',
    bankBranch: '',
    accountNumber: '',
    drawer: '',
    accountId: '',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Varsayılan +30 gün vade
    amount: 0,
    currency: 'TRY',
    status: 'portfolio' as ChequeNoteStatus,
    notes: ''
});

const directionOptions = [
    { label: 'Alınan Çek / Senet (Müşteriden)', value: 'received' },
    { label: 'Verilen Çek / Senet (Borç Çekimiz)', value: 'issued' }
];

const typeOptions = [
    { label: 'Çek', value: 'cheque' },
    { label: 'Senet', value: 'note' }
];

const currencyOptions = [
    { label: 'Türk Lirası (TRY)', value: 'TRY' },
    { label: 'Amerikan Doları (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' }
];

const statusOptions = [
    { label: 'Portföyde', value: 'portfolio' },
    { label: 'Ciro Edildi', value: 'endorsed' },
    { label: 'Takasta', value: 'bank_clearing' },
    { label: 'Teminatta', value: 'bank_collateral' },
    { label: 'Tahsil Edildi', value: 'collected' },
    { label: 'Ödendi', value: 'paid' },
    { label: 'Karşılıksız / Protestolu', value: 'unpaid' },
    { label: 'İade Edildi', value: 'returned' }
];

onMounted(async () => {
    await financeStore.fetchAccounts();

    if (isEditMode.value && editId.value) {
        loading.value = true;
        const res = await financeStore.getChequeNoteById(editId.value);
        loading.value = false;

        if (res.success) {
            const item = res.data;
            originalItem.value = item;
            form.value = {
                type: item.type,
                direction: item.direction,
                serialNumber: item.serialNumber,
                bankName: item.bankName || '',
                bankBranch: item.bankBranch || '',
                accountNumber: item.accountNumber || '',
                drawer: item.drawer || '',
                accountId: item.accountId || '',
                issueDate: new Date(item.issueDate),
                dueDate: new Date(item.dueDate),
                amount: item.amount,
                currency: item.currency,
                status: item.status,
                notes: item.notes || ''
            };
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: 'Evrak yüklenemedi.', life: 4000 });
            router.push('/finance/cheques-notes');
        }
    }
});

async function saveForm() {
    submitted.value = true;

    if (!form.value.serialNumber.trim()) return;
    if (form.value.amount <= 0) return;

    const companyId = isEditMode.value && originalItem.value ? originalItem.value.companyId : authStore.user?.companyId || '';
    const userId = authStore.user?.id || '';

    const entity = ChequeNote.create({
        id: isEditMode.value && originalItem.value ? originalItem.value.id : crypto.randomUUID(),
        companyId,
        type: form.value.type,
        direction: form.value.direction,
        serialNumber: form.value.serialNumber,
        bankName: form.value.bankName || undefined,
        bankBranch: form.value.bankBranch || undefined,
        accountNumber: form.value.accountNumber || undefined,
        drawer: form.value.drawer || undefined,
        accountId: form.value.accountId || undefined,
        issueDate: form.value.issueDate,
        dueDate: form.value.dueDate,
        amount: form.value.amount,
        currency: form.value.currency,
        status: form.value.status,
        notes: form.value.notes || undefined,
        createdBy: isEditMode.value && originalItem.value ? originalItem.value.createdBy : userId,
        createdAt: isEditMode.value && originalItem.value ? originalItem.value.createdAt : new Date(),
        updatedAt: new Date()
    });

    const res = await financeStore.saveChequeNote(entity);
    if (res.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Çek/Senet evrakı kaydedildi.', life: 3000 });
        router.push('/finance/cheques-notes');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: res.error.message, life: 4000 });
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="card p-4 flex flex-col gap-1">
            <div class="text-2xl font-bold">
                {{ isEditMode ? 'Çek / Senet Evrakı Düzenle' : 'Yeni Çek / Senet Girişi' }}
            </div>
            <div class="text-surface-500 text-sm">
                {{ isEditMode ? 'Mevcut evrakın detay ve vade bilgilerini güncelleyebilirsiniz.' : 'Alınan veya verilen yeni çek/senet kaydı oluşturun.' }}
            </div>
        </div>

        <div v-if="loading" class="card p-6 text-center text-surface-500">
            <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
            <div>Yükleniyor...</div>
        </div>

        <div v-else class="card p-6">
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Evrak Yönü</label>
                    <Select v-model="form.direction" :options="directionOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Evrak Türü</label>
                    <Select v-model="form.type" :options="typeOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Seri / Çek No</label>
                    <InputText v-model.trim="form.serialNumber" placeholder="Örn: CK-402931" :invalid="submitted && !form.serialNumber" fluid />
                    <small v-if="submitted && !form.serialNumber" class="text-red-500">Seri numarası zorunludur.</small>
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">İlgili Cari Hesap</label>
                    <Select v-model="form.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" filter placeholder="Cari Seçiniz" fluid />
                </div>

                <div class="col-span-12 md:col-span-4 flex flex-col gap-2">
                    <label class="font-bold">Banka Adı</label>
                    <InputText v-model="form.bankName" placeholder="Örn: Garanti BBVA" fluid />
                </div>

                <div class="col-span-12 md:col-span-4 flex flex-col gap-2">
                    <label class="font-bold">Şube</label>
                    <InputText v-model="form.bankBranch" placeholder="Örn: Kadıköy Şubesi" fluid />
                </div>

                <div class="col-span-12 md:col-span-4 flex flex-col gap-2">
                    <label class="font-bold">Hesap No / IBAN</label>
                    <InputText v-model="form.accountNumber" placeholder="Hesap No" fluid />
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Keşideci / Borçlu İsim-Ünvan</label>
                    <InputText v-model="form.drawer" placeholder="Çeki kesen / senet borçlusu" fluid />
                </div>

                <div class="col-span-12 md:col-span-3 flex flex-col gap-2">
                    <label class="font-bold">Keşide / Düzenleme Tarihi</label>
                    <DatePicker v-model="form.issueDate" dateFormat="dd.mm.yy" fluid />
                </div>

                <div class="col-span-12 md:col-span-3 flex flex-col gap-2">
                    <label class="font-bold">Vade Tarihi</label>
                    <DatePicker v-model="form.dueDate" dateFormat="dd.mm.yy" fluid />
                </div>

                <div class="col-span-12 md:col-span-4 flex flex-col gap-2">
                    <label class="font-bold">Tutar</label>
                    <InputNumber v-model="form.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" :min="0.01" :invalid="submitted && form.amount <= 0" fluid />
                    <small v-if="submitted && form.amount <= 0" class="text-red-500">Tutar 0'dan büyük olmalıdır.</small>
                </div>

                <div class="col-span-12 md:col-span-4 flex flex-col gap-2">
                    <label class="font-bold">Para Birimi</label>
                    <Select v-model="form.currency" :options="currencyOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 md:col-span-4 flex flex-col gap-2">
                    <label class="font-bold">Portföy Durumu</label>
                    <Select v-model="form.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 flex flex-col gap-2">
                    <label class="font-bold">Açıklama / Notlar</label>
                    <Textarea v-model="form.notes" rows="3" placeholder="Evraka dair açıklama..." fluid />
                </div>
            </div>

            <div class="flex gap-3 mt-6 justify-end">
                <Button label="İptal" icon="pi pi-times" severity="secondary" outlined @click="router.push('/finance/cheques-notes')" />
                <Button :label="isEditMode ? 'Güncelle' : 'Kaydet'" icon="pi pi-check" @click="saveForm" />
            </div>
        </div>
    </div>
</template>
