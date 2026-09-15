<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import type { AccountReconciliationData } from '@/modules/finance/domain/finance.repository';
import { exportReconciliationToPDF } from '@/shared/utils/pdf-generator';
import { useToast } from 'primevue/usetoast';

const financeStore = useFinanceStore();
const toast = useToast();

const selectedAccountId = ref<string>('');
const asOfDate = ref<Date>(new Date());
const reconciliationType = ref<'balance' | 'babs'>('balance');
const selectedCurrency = ref<string>('TRY');

const loading = ref(false);
const pdfGenerating = ref(false);
const reconciliationData = ref<AccountReconciliationData | null>(null);

const currencyOptions = [
    { label: 'Türk Lirası (TRY)', value: 'TRY' },
    { label: 'Amerikan Doları (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'İngiliz Sterlini (GBP)', value: 'GBP' }
];

const typeOptions = [
    { label: 'Bakiye Mutabakat Mektubu', value: 'balance' },
    { label: 'BA / BS Form Mutabakatı', value: 'babs' }
];

onMounted(async () => {
    await financeStore.fetchAccounts();
    if (financeStore.accounts.length > 0) {
        selectedAccountId.value = financeStore.accounts[0].id;
    }
});

async function loadReconciliation() {
    if (!selectedAccountId.value) return;
    loading.value = true;
    try {
        const res = await financeStore.fetchAccountReconciliation(
            selectedAccountId.value,
            asOfDate.value,
            selectedCurrency.value
        );
        if (res.success) {
            reconciliationData.value = res.data;
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: res.error.message, life: 4000 });
        }
    } finally {
        loading.value = false;
    }
}

watch([selectedAccountId, asOfDate, selectedCurrency], () => {
    loadReconciliation();
}, { immediate: true });

function formatCurrency(val: number, curr = 'TRY') {
    return val.toLocaleString('tr-TR', { style: 'currency', currency: curr });
}

function formatDate(d?: Date) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR');
}

async function handlePDFExport() {
    if (!reconciliationData.value) return;
    pdfGenerating.value = true;
    try {
        const d = reconciliationData.value;
        const accNameSlug = d.account.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await exportReconciliationToPDF({
            asOfDate: d.asOfDate,
            type: reconciliationType.value,
            currency: d.currency,
            account: d.account,
            company: d.company,
            financials: d.financials,
            fileName: `mutabakat-${accNameSlug}-${d.asOfDate.toISOString().slice(0, 10)}.pdf`
        });
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Mutabakat PDF belgesi başarıyla indirildi.', life: 3000 });
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'PDF oluşturulamadı: ' + err.message, life: 4000 });
    } finally {
        pdfGenerating.value = false;
    }
}

function copySummaryText() {
    if (!reconciliationData.value) return;
    const d = reconciliationData.value;
    const isBabs = reconciliationType.value === 'babs';
    let text = `MUTABAKAT METNİ - ${d.company.name}\n`;
    text += `Sayın: ${d.account.name}\nTarih: ${formatDate(d.asOfDate)}\n\n`;

    if (!isBabs) {
        text += `03.12.2026 tarihi itibariyle hesabınızda ${formatCurrency(d.financials.balance, d.currency)} (${d.financials.balanceType}) bakiye bulunmaktadır.\n`;
    } else {
        text += `Form BA (Alış): ${d.financials.baCount} Adet - Toplam: ${formatCurrency(d.financials.baTotal, d.currency)}\n`;
        text += `Form BS (Satış): ${d.financials.bsCount} Adet - Toplam: ${formatCurrency(d.financials.bsTotal, d.currency)}\n`;
    }

    text += `\nLütfen mutabakat durumunuzu teyit ediniz.`;
    navigator.clipboard.writeText(text);
    toast.add({ severity: 'info', summary: 'Kopyalandı', detail: 'Mutabakat metni panoya kopyalandı.', life: 2500 });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="card p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
                <div class="text-2xl font-bold flex items-center gap-2">
                    <i class="pi pi-file-edit text-primary"></i>
                    Cari Hesap Borç / Alacak Mutabakat Formu
                </div>
                <div class="text-surface-500 text-sm mt-1">
                    Cari hesaplar için bakiye ve BA/BS mutabakat mektubu oluşturma, canlı önizleme ve ıslak imzalı PDF çıktısı
                </div>
            </div>
            <div class="flex gap-2">
                <Button
                    label="Metni Kopyala"
                    icon="pi pi-copy"
                    severity="secondary"
                    outlined
                    @click="copySummaryText"
                />
                <Button
                    label="PDF İndir"
                    icon="pi pi-file-pdf"
                    severity="danger"
                    :loading="pdfGenerating"
                    @click="handlePDFExport"
                />
            </div>
        </div>

        <!-- Filtre Kartı -->
        <div class="card p-4">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                    <label class="block text-sm font-semibold mb-2">Cari Hesap Seçin</label>
                    <Select
                        v-model="selectedAccountId"
                        :options="financeStore.accounts"
                        optionLabel="name"
                        optionValue="id"
                        filter
                        placeholder="Cari hesap seçin..."
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Mutabakat Tarihi</label>
                    <DatePicker
                        v-model="asOfDate"
                        dateFormat="dd.mm.yy"
                        showIcon
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Mutabakat Türü</label>
                    <Select
                        v-model="reconciliationType"
                        :options="typeOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">Para Birimi</label>
                    <Select
                        v-model="selectedCurrency"
                        :options="currencyOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
            </div>
        </div>

        <!-- Yükleniyor -->
        <div v-if="loading" class="card flex items-center justify-center py-20">
            <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
        </div>

        <!-- Canlı Belge Önizleme Kartı (A4 Mektup Görünümü) -->
        <div v-else-if="reconciliationData" class="flex justify-center">
            <div class="card w-full max-w-4xl p-8 border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-lg text-surface-900 dark:text-surface-0 font-sans">
                <!-- Firma Üst Başlık -->
                <div class="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-6">
                    <div>
                        <div class="text-xl font-bold text-blue-900 dark:text-blue-400">
                            {{ reconciliationData.company.name }}
                        </div>
                        <div class="text-xs text-surface-500 mt-1">
                            {{ reconciliationData.company.address || 'Firma Adresi Kayıtlı Değil' }}
                        </div>
                        <div class="text-xs text-surface-500">
                            Vergi D.: {{ reconciliationData.company.taxOffice || '-' }} | VKN: {{ reconciliationData.company.taxNumber || '-' }} | Tel: {{ reconciliationData.company.phone || '-' }}
                        </div>
                    </div>
                    <div class="text-right text-xs text-surface-600 dark:text-surface-400">
                        <div><strong>Düzenleme Tarihi:</strong> {{ formatDate(new Date()) }}</div>
                        <div><strong>Mutabakat Tarihi:</strong> {{ formatDate(reconciliationData.asOfDate) }}</div>
                    </div>
                </div>

                <!-- Belge Başlığı -->
                <div class="text-center bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 py-3 font-bold text-lg tracking-wide rounded mb-6">
                    {{ reconciliationType === 'babs' ? 'BA / BS FORM MUTABAKAT METNİ' : 'CARİ HESAP BAKİYE MUTABAKAT MEKTUBU' }}
                </div>

                <!-- Cari Hesap Alıcı Bilgileri -->
                <div class="bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 p-4 rounded mb-6">
                    <div class="font-bold text-base mb-2 text-primary">
                        SAYIN: {{ reconciliationData.account.name }}
                        <span v-if="reconciliationData.account.code" class="text-xs font-mono text-surface-500">({{ reconciliationData.account.code }})</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div><strong>Yetkili / İlgili:</strong> {{ reconciliationData.account.authorizedPerson || '-' }}</div>
                        <div><strong>Telefon:</strong> {{ reconciliationData.account.phone || '-' }}</div>
                        <div><strong>Vergi Dairesi:</strong> {{ reconciliationData.account.taxOffice || '-' }}</div>
                        <div><strong>VKN / TCKN:</strong> {{ reconciliationData.account.taxNumber || '-' }}</div>
                        <div class="col-span-2"><strong>Adres:</strong> {{ reconciliationData.account.address || '-' }} {{ reconciliationData.account.city ? `/ ${reconciliationData.account.city}` : '' }}</div>
                    </div>
                </div>

                <!-- Mektup Metni -->
                <div class="text-sm leading-relaxed mb-6 text-justify">
                    Şirketimiz nezdindeki cari hesabınızın <strong>{{ formatDate(reconciliationData.asOfDate) }}</strong> tarihi itibariyle detayları aşağıda çıkarılmıştır.
                    Kayıtlarınızı karşılaştırarak mutabık olup olmadığınızı aşağıdaki bölümü onaylayarak tarafımıza kaşeli ve imzalı olarak iletmenizi rica ederiz.
                </div>

                <!-- Tablo: Bakiye Mutabakatı -->
                <table v-if="reconciliationType === 'balance'" class="w-full border-collapse text-sm mb-6 border border-surface-300 dark:border-surface-700">
                    <thead>
                        <tr class="bg-surface-800 text-white dark:bg-surface-950">
                            <th class="p-3 text-left border">Açıklama / Hesap Özeti</th>
                            <th class="p-3 text-right border">Tutar ({{ reconciliationData.currency }})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="p-3 border">Toplam Borç (Borç Hareketleri Toplamı)</td>
                            <td class="p-3 text-right border font-mono">{{ formatCurrency(reconciliationData.financials.debitTotal, reconciliationData.currency) }}</td>
                        </tr>
                        <tr>
                            <td class="p-3 border">Toplam Alacak (Alacak Hareketleri Toplamı)</td>
                            <td class="p-3 text-right border font-mono">{{ formatCurrency(reconciliationData.financials.creditTotal, reconciliationData.currency) }}</td>
                        </tr>
                        <tr class="font-bold bg-surface-100 dark:bg-surface-800 text-blue-900 dark:text-blue-300">
                            <td class="p-3 border">Net Bakiye (Bakiye Yönü: {{ reconciliationData.financials.balanceType }})</td>
                            <td class="p-3 text-right border font-mono text-base">{{ formatCurrency(reconciliationData.financials.balance, reconciliationData.currency) }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Tablo: BA / BS Mutabakatı -->
                <table v-else class="w-full border-collapse text-sm mb-6 border border-surface-300 dark:border-surface-700">
                    <thead>
                        <tr class="bg-surface-800 text-white dark:bg-surface-950">
                            <th class="p-3 text-left border">Form Türü</th>
                            <th class="p-3 text-center border">Belge / Fatura Adedi</th>
                            <th class="p-3 text-right border">Toplam Matrah ({{ reconciliationData.currency }})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="p-3 border"><strong>Form BA</strong> (Tarafınızdan Yapılan Mal/Hizmet Alımları)</td>
                            <td class="p-3 text-center border">{{ reconciliationData.financials.baCount }} Adet</td>
                            <td class="p-3 text-right border font-mono font-bold">{{ formatCurrency(reconciliationData.financials.baTotal, reconciliationData.currency) }}</td>
                        </tr>
                        <tr>
                            <td class="p-3 border"><strong>Form BS</strong> (Tarafınıza Yapılan Mal/Hizmet Satışları)</td>
                            <td class="p-3 text-center border">{{ reconciliationData.financials.bsCount }} Adet</td>
                            <td class="p-3 text-right border font-mono font-bold">{{ formatCurrency(reconciliationData.financials.bsTotal, reconciliationData.currency) }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Onay Seçeneği Kutusu -->
                <div class="border border-dashed border-surface-400 p-4 rounded bg-surface-50 dark:bg-surface-800/30 text-xs mb-8">
                    <div class="mb-2 font-bold">[ &nbsp; ] BAKİYEMİZ MUTABIKTIR.</div>
                    <div class="font-bold">[ &nbsp; ] BAKİYEMİZ MUTABIK DEĞİLDİR. (Fark Tutarı: .............................. {{ reconciliationData.currency }})</div>
                    <div class="text-surface-400 mt-2">* İtiraz durumunda lütfen ekstre detaylarınızı tarafımıza e-posta ile iletiniz.</div>
                </div>

                <!-- Çift Taraflı İmza Kutuları -->
                <div class="grid grid-cols-2 gap-6 mt-8">
                    <div class="border border-surface-300 dark:border-surface-700 p-4 rounded h-32 flex flex-col justify-between">
                        <div class="text-center font-bold text-xs text-surface-600 dark:text-surface-400 border-b pb-2">
                            MUTABAKATI GÖNDEREN FİRMA
                        </div>
                        <div class="text-center font-bold text-xs">{{ reconciliationData.company.name }}</div>
                        <div class="text-center text-xs text-surface-400">Kaşe & İmza</div>
                    </div>
                    <div class="border border-surface-300 dark:border-surface-700 p-4 rounded h-32 flex flex-col justify-between">
                        <div class="text-center font-bold text-xs text-surface-600 dark:text-surface-400 border-b pb-2">
                            MUTABAKATI ONAYLAYAN CARİ HESAP
                        </div>
                        <div class="text-center font-bold text-xs">{{ reconciliationData.account.name }}</div>
                        <div class="text-center text-xs text-surface-400">Kaşe & İmza / Tarih: ..../..../20....</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
