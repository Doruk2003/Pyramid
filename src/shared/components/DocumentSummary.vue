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
    <div class="flex flex-col lg:flex-row justify-between gap-6">
        <!-- Notes & Words -->
        <div class="w-full lg:w-7/12">
            <label for="notes" class="block font-bold mb-3">Notlar</label>
            <Textarea 
                id="notes" 
                :model-value="notes" 
                @update:model-value="val => emit('update:notes', val)" 
                rows="6" 
                placeholder="Belge notu ekleyin..." 
                fluid 
            />
            <div class="mt-4 p-4 bg-surface-50 dark:bg-surface-900 rounded border border-surface-200 dark:border-surface-700 italic text-surface-600 dark:text-surface-400 text-sm">
                {{ totals.totalAsWords }}
            </div>
        </div>

        <!-- Totals Card -->
        <div class="w-full lg:w-4/12">
            <div class="flex flex-col gap-3 p-5 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                <div class="flex justify-between items-center text-sm font-medium">
                    <span class="text-surface-500 uppercase tracking-wider">Brüt Toplam</span>
                    <span>{{ totals.grossTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>
                
                <div v-if="totals.discountTotal > 0" class="flex justify-between items-center text-sm">
                    <span class="text-red-500 font-medium">Toplam İndirim</span>
                    <span class="text-red-500 font-bold">-{{ totals.discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>

                <div class="flex justify-between items-center font-bold border-t border-surface-100 dark:border-surface-800 pt-3">
                    <span class="text-surface-700 dark:text-surface-200">Ara Toplam</span>
                    <span>{{ totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>

                <div class="flex justify-between items-center text-sm">
                    <span class="text-surface-500">KDV Toplam</span>
                    <span>{{ totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>

                <div class="flex justify-between items-center text-2xl font-black text-primary border-t-2 border-primary pt-3 mt-2">
                    <span>Genel Toplam</span>
                    <span>{{ totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ currency }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
