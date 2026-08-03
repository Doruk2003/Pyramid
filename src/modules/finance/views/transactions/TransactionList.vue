<script setup lang="ts">
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { Payment } from '@/modules/finance/domain/payment.entity';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const router = useRouter();
const financeStore = useFinanceStore();
const toast = useToast();

const cancelDialog = ref(false);
const paymentToCancel = shallowRef<Payment | null>(null);

onMounted(async () => {
    await financeStore.fetchPayments();
});

const payments = computed(() => financeStore.payments ?? []);

function openNew() {
    router.push('/finance/transactions/create');
}

function confirmCancelPayment(payment: Payment) {
    paymentToCancel.value = payment;
    cancelDialog.value = true;
}

async function cancelPayment() {
    if (!paymentToCancel.value?.id) return;
    const result = await financeStore.deletePayment(paymentToCancel.value.id);
    cancelDialog.value = false;
    if (result.success) {
        toast.add({ severity: 'success', summary: 'İptal Edildi', detail: 'Kasa fişi iptal edildi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 5000 });
    }
    paymentToCancel.value = null;
}

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('tr-TR');
}

function getTypeLabel(type: string): string {
    const map: Record<string, string> = {
        collection: 'Tahsilat',
        payment: 'Tediye (Ödeme)',
        debit_note: 'Borç Dekontu',
        credit_note: 'Alacak Dekontu'
    };
    return map[type] || type;
}

function getTypeSeverity(type: string): 'success' | 'danger' | 'info' | 'warn' | 'secondary' {
    const map: Record<string, 'success' | 'danger' | 'info' | 'warn' | 'secondary'> = {
        collection: 'success',
        payment: 'danger',
        debit_note: 'info',
        credit_note: 'warn'
    };
    return map[type] || 'secondary';
}

function getMethodLabel(method: string): string {
    const map: Record<string, string> = {
        cash: 'Nakit',
        bank: 'Banka Transferi',
        check: 'Çek/Senet',
        credit_card: 'Kredi Kartı'
    };
    return map[method] || method;
}
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Kasa & Cari Fişleri</div>
            </div>

            <Toolbar>
                <template #start>
                    <Button label="Yeni Kasa İşlemi Ekle" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <DataTable :value="payments" dataKey="id" :paginator="true" :rows="10">
                <template #empty>
                    <div class="text-center py-6 text-surface-500">
                        <i class="pi pi-history text-4xl mb-3 text-surface-400 block" />
                        Herhangi bir kasa hareketi veya tahsilat/tediye kaydı bulunamadı.
                    </div>
                </template>
                <Column header="Tarih" sortable>
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.paymentDate) }}
                    </template>
                </Column>
                <Column field="documentNumber" header="Evrak/Belge No" sortable>
                    <template #body="slotProps">
                        {{ slotProps.data.documentNumber || '—' }}
                    </template>
                </Column>
                <Column field="paymentType" header="İşlem Tipi" sortable>
                    <template #body="slotProps">
                        <Tag :severity="getTypeSeverity(slotProps.data.paymentType)" :value="getTypeLabel(slotProps.data.paymentType)" />
                    </template>
                </Column>
                <Column field="accountName" header="Cari Hesap" sortable>
                    <template #body="slotProps">
                        {{ slotProps.data.accountName || '—' }}
                    </template>
                </Column>
                <Column field="cashRegisterName" header="Kasa / Banka" sortable>
                    <template #body="slotProps">
                        {{ slotProps.data.cashRegisterName || '—' }}
                    </template>
                </Column>
                <Column field="paymentMethod" header="Ödeme Tipi" sortable>
                    <template #body="slotProps">
                        {{ getMethodLabel(slotProps.data.paymentMethod) }}
                    </template>
                </Column>
                <Column field="amount" header="Tutar" sortable>
                    <template #body="slotProps">
                        <span class="font-bold">
                            {{ formatCurrency(slotProps.data.amount) }}
                        </span>
                    </template>
                </Column>
                <Column field="status" header="Durum">
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.status === 'completed' ? 'success' : slotProps.data.status === 'pending' ? 'warn' : 'danger'"
                             :value="slotProps.data.status === 'completed' ? 'Tamamlandı' : slotProps.data.status === 'pending' ? 'Bekliyor' : 'İptal Edildi'" />
                    </template>
                </Column>
                <Column field="description" header="Açıklama"></Column>
                <Column header="İşlemler" style="min-width: 80px">
                    <template #body="slotProps">
                        <Button v-if="slotProps.data.status !== 'cancelled'" icon="pi pi-trash" severity="danger" text rounded
                                v-tooltip.top="'İşlemi İptal Et'" @click="confirmCancelPayment(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- İşlem İptal Etme Onay Dialogu -->
        <Dialog v-model:visible="cancelDialog" :style="{ width: '420px' }" header="Fiş İptal Onayı" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-4xl text-red-500" />
                <div>
                    <p class="font-semibold mb-1">Bu kasa fişini iptal etmek istediğinize emin misiniz?</p>
                    <p class="text-surface-600 dark:text-surface-400 text-sm">
                        Bu işlem geri alınamaz. Kasa bakiyeleri ve cari borç/alacak toplamları yeniden hesaplanacaktır.
                    </p>
                </div>
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text severity="secondary" @click="cancelDialog = false" />
                <Button label="Evet, İptal Et" icon="pi pi-check" severity="danger" @click="cancelPayment" />
            </template>
        </Dialog>
    </div>
</template>
