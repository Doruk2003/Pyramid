<script setup lang="ts">
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { Payment } from '@/modules/finance/domain/payment.entity';
import { useAuthStore } from '@/core/auth/auth.store';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const router = useRouter();
const route = useRoute();
const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();

const submitted = ref(false);
const loading = ref(false);

// Edit modunu belirle: route'da :id parametresi varsa düzenleme modundayız
const editId = computed(() => route.params.id as string | undefined);
const isEditMode = computed(() => !!editId.value);

// Orijinal payment verisi (düzenleme modunda korunacak alanlar için)
const originalPayment = ref<Payment | null>(null);

const transactionForm = ref({
    accountId: '',
    paymentType: 'collection' as 'collection' | 'payment' | 'debit_note' | 'credit_note',
    paymentMethod: 'cash' as 'cash' | 'bank' | 'check' | 'credit_card',
    cashRegisterId: '',
    amount: 0,
    paymentDate: new Date(),
    documentNumber: '',
    dueDate: null as Date | null,
    description: ''
});

const typeOptions = [
    { label: 'Tahsilat (Cari Alacak)', value: 'collection' },
    { label: 'Ödeme / Tediye (Cari Borç)', value: 'payment' },
    { label: 'Borç Dekontu (Cariyi Borçlandır)', value: 'debit_note' },
    { label: 'Alacak Dekontu (Cariyi Alacaklandır)', value: 'credit_note' }
];

const methodOptions = [
    { label: 'Nakit', value: 'cash' },
    { label: 'Banka Transferi / Havale', value: 'bank' },
    { label: 'Kredi Kartı', value: 'credit_card' },
    { label: 'Çek / Senet', value: 'check' }
];

onMounted(async () => {
    await financeStore.fetchAccounts();
    await financeStore.fetchCashRegisters();

    // Düzenleme modunda mevcut işlemi yükle
    if (isEditMode.value && editId.value) {
        loading.value = true;
        const result = await financeStore.getPaymentById(editId.value);
        loading.value = false;

        if (result.success) {
            const p = result.data;
            originalPayment.value = p;

            // Form alanlarını mevcut değerlerle doldur
            transactionForm.value = {
                accountId: p.accountId || '',
                paymentType: p.paymentType,
                paymentMethod: p.paymentMethod,
                cashRegisterId: p.cashRegisterId || '',
                amount: p.amount,
                paymentDate: new Date(p.paymentDate),
                documentNumber: p.documentNumber || '',
                dueDate: p.dueDate ? new Date(p.dueDate) : null,
                description: p.description || ''
            };
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: 'İşlem bilgileri yüklenemedi.', life: 5000 });
            router.push('/finance/transactions');
        }
    }
});

// Dekont ise Kasa seçimi ve Ödeme Yöntemi gizlenir
const isNote = computed(() => {
    return transactionForm.value.paymentType === 'debit_note' || transactionForm.value.paymentType === 'credit_note';
});

// Ödeme yöntemine göre kasaları filtrele
const filteredRegisters = computed(() => {
    if (isNote.value) return [];
    
    const method = transactionForm.value.paymentMethod;
    const registerTypeMap: Record<string, string> = {
        cash: 'cash',
        bank: 'bank',
        credit_card: 'credit_card',
        check: 'check_note'
    };
    const targetType = registerTypeMap[method];
    return (financeStore.cashRegisters ?? []).filter(c => c.type === targetType && c.isActive);
});

// Kasa filtresi değiştiğinde:
// - Yeni modda: ilk kasayı otomatik seç
// - Düzenleme modunda: sadece mevcut cashRegisterId geçerli değilse güncelle
watch(filteredRegisters, (newVal) => {
    if (isEditMode.value && originalPayment.value) {
        // Düzenleme modunda, mevcut kasa seçimi yeni filtrede varsa koru
        const stillValid = newVal.some(r => r.id === transactionForm.value.cashRegisterId);
        if (!stillValid) {
            transactionForm.value.cashRegisterId = newVal.length > 0 ? newVal[0].id : '';
        }
    } else {
        // Yeni ekleme modunda ilk kasayı otomatik seç
        if (newVal && newVal.length > 0) {
            transactionForm.value.cashRegisterId = newVal[0].id;
        } else {
            transactionForm.value.cashRegisterId = '';
        }
    }
});

async function saveTransaction() {
    submitted.value = true;
    
    // Doğrulamalar
    if (!transactionForm.value.accountId) return;
    if (transactionForm.value.amount <= 0) return;
    if (!isNote.value && !transactionForm.value.cashRegisterId) return;

    const companyId = isEditMode.value && originalPayment.value
        ? originalPayment.value.companyId
        : authStore.user?.companyId || '';
    const userId = authStore.user?.id || '';

    const pay = Payment.create({
        // Düzenleme modunda orijinal id, companyId, createdAt, createdBy ve status korunur
        id: isEditMode.value && originalPayment.value ? originalPayment.value.id : crypto.randomUUID(),
        companyId,
        accountId: transactionForm.value.accountId,
        paymentDate: transactionForm.value.paymentDate,
        amount: transactionForm.value.amount,
        paymentMethod: isNote.value ? 'cash' : transactionForm.value.paymentMethod,
        description: transactionForm.value.description || undefined,
        paymentType: transactionForm.value.paymentType,
        cashRegisterId: isNote.value ? undefined : transactionForm.value.cashRegisterId,
        documentNumber: transactionForm.value.documentNumber || undefined,
        dueDate: transactionForm.value.paymentMethod === 'check' ? (transactionForm.value.dueDate || undefined) : undefined,
        status: isEditMode.value && originalPayment.value ? originalPayment.value.status : 'completed',
        createdBy: isEditMode.value && originalPayment.value ? originalPayment.value.createdBy : userId,
        createdAt: isEditMode.value && originalPayment.value ? originalPayment.value.createdAt : new Date(),
        updatedAt: new Date()
    });

    const result = await financeStore.savePayment(pay);
    if (result.success) {
        const msg = isEditMode.value ? 'İşlem başarıyla güncellendi' : 'İşlem başarıyla kaydedildi';
        toast.add({ severity: 'success', summary: 'Başarılı', detail: msg, life: 3000 });
        router.push('/finance/transactions');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 5000 });
    }
}

function goBack() {
    router.push('/finance/transactions');
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="card p-4 min-h-32 flex flex-col gap-2">
            <div class="flex flex-col gap-1">
                <div class="m-0 text-2xl font-medium">
                    {{ isEditMode ? 'İşlem Düzenle' : 'Yeni Kasa / Cari İşlemi' }}
                </div>
                <div class="text-surface-600 dark:text-surface-400">
                    {{ isEditMode ? 'Mevcut kasa hareketini veya tahsilat/tediye fişini düzenleyebilirsiniz.' : 'Cari tahsilat, ödeme veya virman/dekont fişlerini buradan ekleyebilirsiniz.' }}
                </div>
            </div>
        </div>

        <!-- Yükleniyor göstergesi -->
        <div v-if="loading" class="card p-6 flex items-center justify-center gap-3 text-surface-500">
            <i class="pi pi-spin pi-spinner text-2xl" />
            <span>İşlem bilgileri yükleniyor...</span>
        </div>

        <div v-else class="card p-6">
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">İşlem Tipi</label>
                    <Select v-model="transactionForm.paymentType" :options="typeOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Cari Hesap</label>
                    <Select v-model="transactionForm.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Cari Seçin" filter :invalid="submitted && !transactionForm.accountId" fluid />
                    <small v-if="submitted && !transactionForm.accountId" class="text-red-500">Cari hesap seçimi zorunludur.</small>
                </div>

                <div v-if="!isNote" class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Ödeme Yöntemi</label>
                    <Select v-model="transactionForm.paymentMethod" :options="methodOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <div v-if="!isNote" class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Kasa / Banka Hesabı</label>
                    <Select v-model="transactionForm.cashRegisterId" :options="filteredRegisters" optionLabel="name" optionValue="id" placeholder="Kasa/Banka Seçin" :invalid="submitted && !transactionForm.cashRegisterId" fluid />
                    <small v-if="submitted && !transactionForm.cashRegisterId" class="text-red-500">Kasa/Banka seçimi zorunludur.</small>
                </div>

                <div v-if="transactionForm.paymentMethod === 'check' && !isNote" class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Evrak Vade Tarihi</label>
                    <DatePicker v-model="transactionForm.dueDate" dateFormat="dd.mm.yy" placeholder="Vade Seçin" fluid />
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">İşlem Tarihi</label>
                    <DatePicker v-model="transactionForm.paymentDate" dateFormat="dd.mm.yy" fluid />
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Tutar</label>
                    <InputNumber v-model="transactionForm.amount" mode="currency" currency="TRY" locale="tr-TR" :min="0.01" :invalid="submitted && transactionForm.amount <= 0" fluid />
                    <small v-if="submitted && transactionForm.amount <= 0" class="text-red-500">Tutar 0'dan büyük olmalıdır.</small>
                </div>

                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label class="font-bold">Fiş/Evrak Numarası</label>
                    <InputText v-model.trim="transactionForm.documentNumber" placeholder="Örn: Tah-40293, FT-2023 vb." fluid />
                </div>

                <div class="col-span-12 flex flex-col gap-2">
                    <label class="font-bold">Açıklama</label>
                    <Textarea v-model="transactionForm.description" rows="3" placeholder="İşleme dair açıklama notu..." fluid />
                </div>
            </div>

            <div class="flex gap-4 mt-6">
                <Button label="İptal" icon="pi pi-times" severity="secondary" class="flex-1" outlined @click="goBack" />
                <Button :label="isEditMode ? 'Güncelle' : 'Kaydet'" icon="pi pi-check" class="flex-1" @click="saveTransaction" />
            </div>
        </div>
    </div>
</template>
