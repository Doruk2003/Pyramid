<script setup lang="ts">
import { DocumentTotals } from '@/shared/utils/document-calculator';

defineProps<{
    totals: DocumentTotals;
    currency: string;
    notes?: string;
}>();

const emit = defineEmits(['update:notes']);
</script>

<template>
    <div class="flex flex-col lg:flex-row justify-between gap-8 mt-6">
        <!-- Notes & Words -->
        <div class="w-full lg:w-6/12 flex flex-col gap-3">
            <Textarea 
                id="notes" 
                :model-value="notes" 
                @update:model-value="val => emit('update:notes', val)" 
                rows="6" 
                placeholder="Belge notu ekleyin..." 
                fluid 
                class="!bg-surface-0 dark:!bg-surface-950"
            />
            <div class="p-3 bg-surface-50 dark:bg-surface-900 rounded-lg border border-dashed border-surface-300 dark:border-surface-600">
                <div class="text-xs text-surface-500 uppercase font-bold mb-1">
                    {{ currency === 'TRY' ? 'Yazıyla Genel Toplam:' : 'Total in Words:' }}
                </div>
                <div class="text-sm font-medium italic text-primary"># {{ totals.totalAsWords }} #</div>
            </div>
        </div>

        <!-- Totals Card -->
        <div class="w-full lg:w-6/12">
            <div class="flex flex-col gap-4 p-4 bg-surface-50 dark:bg-surface-900 rounded">
                <div class="flex justify-between items-center text-sm">
                    <span class="text-surface-700">Brüt Toplam:</span>
                    <span class="font-medium text-surface-900 dark:text-surface-0">{{ totals.grossTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>
                
                <div v-if="totals.discountTotal > 0" class="flex justify-between items-center text-sm text-red-500">
                    <span class="font-medium">İskonto Toplamı:</span>
                    <span class="font-medium">- {{ totals.discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>

                <div class="flex justify-between items-center text-sm border-t border-surface-200 dark:border-surface-700 pt-2 mt-1">
                    <span class="text-surface-700">Ara Toplam:</span>
                    <span class="font-medium text-surface-900 dark:text-surface-0">{{ totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>

                <div class="flex justify-between items-center text-sm">
                    <span class="text-surface-700">KDV Toplam:</span>
                    <span class="font-medium text-surface-900 dark:text-surface-0">{{ totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>

                <div class="flex justify-between items-center text-lg font-semibold border-t border-surface-300 dark:border-surface-600 pt-4 mt-2">
                    <span class="text-surface-900 dark:text-surface-0">Genel Toplam:</span>
                    <span class="text-surface-900 dark:text-surface-0">{{ totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
