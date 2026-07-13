<script setup lang="ts">
import type { DocumentCategory, InvoiceType } from '@/modules/finance/domain/invoice.entity';

// Fatura başlık bilgilerini gösteren salt-okunur bileşen
// Tüm veriler prop olarak gelir, iç state tutmaz
interface Props {
    isEdit: boolean;
    invoiceNumber: string;
    invoiceType: InvoiceType;
    documentCategory: DocumentCategory;
    sourceType?: 'quote' | 'order';
    isForeignCurrency: boolean;
    currency: string;
    exchangeRate: number;
}

defineProps<Props>();
const emit = defineEmits<{ 'export-pdf': [] }>();

const invoiceTypeLabels: Record<string, string> = {
    sale: 'Satış',
    purchase: 'Alış',
    return_sale: 'Satış İade',
    return_purchase: 'Alış İade'
};

const documentCategoryLabels: Record<string, string> = {
    domestic: 'Yurtiçi Faturası',
    export: 'İhracat Faturası',
    export_registered: 'İhraç Kayıtlı Fatura'
};
</script>

<template>
    <div class="card p-4 min-h-32 flex flex-col gap-2">
        <div class="flex flex-col gap-1">
            <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Faturayı Düzenle' : 'Yeni Fatura' }}</div>

            <div class="flex items-center justify-between mt-2">
                <div class="flex items-center gap-3">
                    <!-- Fatura Numarası -->
                    <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                        <i class="pi pi-hashtag text-primary text-sm"></i>
                        <span class="text-xl font-mono font-bold text-primary leading-none">{{ invoiceNumber || '---' }}</span>
                    </div>

                    <!-- Fatura Tipi Badge -->
                    <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                        <i class="pi pi-tag text-surface-500 text-sm"></i>
                        <span class="text-base font-bold text-surface-700 dark:text-surface-300">
                            {{ invoiceTypeLabels[invoiceType] || '---' }}
                        </span>
                    </div>

                    <!-- Fatura Türü Badge -->
                    <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                        <i class="pi pi-file text-surface-500 text-sm"></i>
                        <span class="text-base font-bold text-surface-700 dark:text-surface-300">
                            {{ documentCategoryLabels[documentCategory] || '---' }}
                        </span>
                    </div>

                    <!-- Kaynak Belge Badge -->
                    <div v-if="sourceType" class="flex items-center gap-2 px-3 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <i class="pi pi-link text-blue-500 text-sm"></i>
                        <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Kaynak {{ sourceType === 'order' ? 'Sipariş' : 'Teklif' }} Bağlı
                        </span>
                    </div>

                    <!-- Döviz Kuru (Yabancı döviz ise) -->
                    <div v-if="isForeignCurrency" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                        <i class="pi pi-money-bill text-surface-500 text-sm"></i>
                        <div class="text-base font-medium leading-none">
                            1 {{ currency }} = <span class="font-bold text-primary">{{ exchangeRate.toFixed(4) }}</span> ₺
                        </div>
                    </div>
                </div>

                <!-- PDF ve Yazdır Butonları -->
                <div class="flex items-center gap-2">
                    <Button icon="pi pi-file-pdf" label="PDF" severity="secondary" outlined size="small" @click="emit('export-pdf')" />
                    <Button icon="pi pi-print" label="YAZDIR" severity="secondary" outlined size="small" />
                </div>
            </div>
        </div>
    </div>
</template>
