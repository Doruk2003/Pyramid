<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const closingDialogVisible = ref(false);
const selectedYear = ref<number>(new Date().getFullYear() - 1);
const closingProcessing = ref(false);

const currentYear = new Date().getFullYear();
const yearOptions = computed(() => {
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
        years.push({ label: `${y} Mali Yılı`, value: y });
    }
    return years;
});

async function loadData() {
    loading.value = true;
    try {
        await financeStore.fetchFiscalYears();
    } finally {
        loading.value = false;
    }
}

onMounted(loadData);

const fiscalYearsList = computed(() => financeStore.fiscalYears || []);

const closedYearsCount = computed(() => fiscalYearsList.value.filter(fy => fy.status === 'closed').length);

function openCloseDialog() {
    selectedYear.value = currentYear - 1;
    closingDialogVisible.value = true;
}

async function handleCloseYear() {
    closingProcessing.value = true;
    try {
        const result = await financeStore.closeFiscalYear(selectedYear.value, authStore.user?.id);
        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Mali Yıl Kapatıldı',
                detail: result.data.message,
                life: 5000
            });
            closingDialogVisible.value = false;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Hata',
                detail: result.error.message,
                life: 5000
            });
        }
    } finally {
        closingProcessing.value = false;
    }
}

function confirmReopen(year: number) {
    confirm.require({
        message: `${year} mali yılının kapanışını iptal edip yeniden açmak istediğinize emin misiniz? Devir açılış kayıtları kaldırılacaktır.`,
        header: 'Mali Yıl Kapanış İptali',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        acceptLabel: 'Evet, Yeniden Aç',
        rejectLabel: 'İptal',
        accept: async () => {
            const result = await financeStore.reopenFiscalYear(year);
            if (result.success) {
                toast.add({
                    severity: 'success',
                    summary: 'Başarılı',
                    detail: `${year} mali yılı yeniden açıldı.`,
                    life: 3000
                });
            } else {
                toast.add({
                    severity: 'error',
                    summary: 'Hata',
                    detail: result.error.message,
                    life: 4000
                });
            }
        }
    });
}

function formatDate(d?: Date) {
    if (!d) return '-';
    return new Date(d).toLocaleString('tr-TR');
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <ConfirmDialog />

        <!-- Header -->
        <div class="card p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
                <div class="text-2xl font-bold flex items-center gap-2">
                    <i class="pi pi-calendar-times text-primary"></i>
                    Mali Yıl Kapanış & Devir İşlemleri
                </div>
                <div class="text-surface-500 text-sm mt-1">
                    Dönem sonu hesap kapanışları, veritabanı kilitleri ve yeni mali yıla devir açılış bakiyesi aktarımı
                </div>
            </div>
            <div class="flex gap-2">
                <Button
                    label="Mali Yıl Kapanışı ve Devri Yap"
                    icon="pi pi-lock"
                    severity="primary"
                    @click="openCloseDialog"
                />
            </div>
        </div>

        <!-- KPI Özet Kartlar -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="card p-4 flex items-center gap-3 border-l-4 border-blue-500">
                <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <i class="pi pi-calendar text-blue-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ currentYear }}</div>
                    <div class="text-xs text-surface-500">Cari Çalışma Mali Yılı</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-amber-500">
                <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <i class="pi pi-lock text-amber-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-amber-600 dark:text-amber-400">{{ closedYearsCount }} Dönem</div>
                    <div class="text-xs text-surface-500">Kapatılmış Mali Yıl</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-green-500">
                <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <i class="pi pi-sync text-green-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-green-600 dark:text-green-400">Otomatik Devir</div>
                    <div class="text-xs text-surface-500">01 Ocak Açılış Fişi Aktivasyonu</div>
                </div>
            </div>
            <div class="card p-4 flex items-center gap-3 border-l-4 border-surface-400">
                <div class="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <i class="pi pi-shield text-surface-500"></i>
                </div>
                <div>
                    <div class="text-xl font-bold text-surface-700 dark:text-surface-200">Kapanış Korumalı</div>
                    <div class="text-xs text-surface-500">Geriye Dönük Veri Güvenliği</div>
                </div>
            </div>
        </div>

        <!-- Mali Yıllar Tablosu -->
        <div class="card p-0 dt-compact">
            <DataTable
                :value="fiscalYearsList"
                :loading="loading || financeStore.loadingFiscalYears"
                stripedRows
                size="small"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-12 text-surface-400">
                        <i class="pi pi-inbox text-5xl mb-3 text-surface-300"></i>
                        <span>Henüz kayıtlı bir mali yıl kapanış işlemi bulunmamaktadır.</span>
                    </div>
                </template>

                <Column field="year" header="Mali Yıl" sortable style="width: 15%">
                    <template #body="{ data }">
                        <span class="font-bold text-lg text-surface-900 dark:text-surface-0">{{ data.year }}</span>
                    </template>
                </Column>

                <Column header="Dönem Tarih Aralığı" style="width: 25%">
                    <template #body="{ data }">
                        <span class="font-mono text-sm">
                            01.01.{{ data.year }} - 31.12.{{ data.year }}
                        </span>
                    </template>
                </Column>

                <Column field="status" header="Kapanış Durumu" sortable style="width: 20%">
                    <template #body="{ data }">
                        <Tag
                            :value="data.status === 'closed' ? 'KAPATILDI (DEVİR TAMAM)' : 'AÇIK DÖNEM'"
                            :severity="data.status === 'closed' ? 'danger' : 'success'"
                            :icon="data.status === 'closed' ? 'pi pi-lock' : 'pi pi-unlock'"
                        />
                    </template>
                </Column>

                <Column field="closedAt" header="Kapanış Tarihi" sortable style="width: 25%">
                    <template #body="{ data }">
                        <span class="text-sm text-surface-600 dark:text-surface-400">{{ formatDate(data.closedAt) }}</span>
                    </template>
                </Column>

                <Column header="İşlemler" style="width: 15%; text-align: center">
                    <template #body="{ data }">
                        <Button
                            v-if="data.status === 'closed'"
                            label="Yeniden Aç"
                            icon="pi pi-refresh"
                            severity="warn"
                            text
                            size="small"
                            @click="confirmReopen(data.year)"
                        />
                        <span v-else class="text-xs text-surface-400">Açık Dönem</span>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Mali Yıl Kapanış Dialog -->
        <Dialog v-model:visible="closingDialogVisible" header="Mali Yıl Kapanışı ve Devir İşlemi" modal style="width: 500px">
            <div class="flex flex-col gap-4 py-2">
                <div class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
                    <i class="pi pi-exclamation-triangle text-xl mt-0.5 text-amber-500"></i>
                    <div>
                        <strong>Önemli Bilgilendirme:</strong><br />
                        Kapatılan mali yıla ait tüm fatura, ödeme ve çek/senet işlemleri kilitlenecektir. 
                        Tüm cari hesapların dönem sonu bakiyeleri otomatik olarak <strong>01.01.{{ selectedYear + 1 }}</strong> tarihine 
                        <strong>Açılış Devir Kaydı</strong> olarak aktarılacaktır.
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-semibold">Kapatılacak Mali Yıl</label>
                    <Select
                        v-model="selectedYear"
                        :options="yearOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
            </div>

            <template #footer>
                <Button label="İptal" severity="secondary" outlined @click="closingDialogVisible = false" />
                <Button
                    label="Kapanışı ve Devri Tamamla"
                    icon="pi pi-check-circle"
                    severity="danger"
                    :loading="closingProcessing"
                    @click="handleCloseYear"
                />
            </template>
        </Dialog>
    </div>
</template>
