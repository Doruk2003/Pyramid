<script setup lang="ts">
// Fatura özet paneli: notlar + brüt/iskonto/KDV/toplam gösterimi
// Tüm veriler prop; notes için v-model desteği var
import type { InvoiceTotals } from './invoice-form.types';

interface TotalsTRY {
    grossTotal: number;
    discountTotal: number;
    subtotal: number;
    vatTotal: number;
    total: number;
}

interface Props {
    totals: InvoiceTotals;
    totalsTRY: TotalsTRY | null;
    isForeignCurrency: boolean;
    isExport: boolean;
    currency: string;
    exchangeRate: number;
    discountRate: number;
    notes: string;
    totalAsWords: string;
}

defineProps<Props>();
defineEmits<{
    'update:notes': [value: string];
    'update:discountRate': [value: number];
}>();

// Sayısal formatlama yardımcısı (TR locale, 2 ondalık)
function fmt(n: number) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
    <div class="flex flex-col lg:flex-row justify-between gap-6">
        <!-- Sol: Notlar + Yazıyla Tutar -->
        <div class="w-full lg:w-6/12">
            <Textarea
                id="notes"
                :value="notes"
                rows="6"
                placeholder="Fatura notu ekleyin..."
                fluid
                @input="(e: Event) => $emit('update:notes', (e.target as HTMLTextAreaElement).value)"
            />
            <div class="mt-3 p-3 bg-surface-50 dark:bg-surface-900 rounded-lg border border-dashed border-surface-300 dark:border-surface-600">
                <div class="text-xs text-surface-500 uppercase font-bold mb-1">
                    {{ currency === 'TRY' ? 'Yazıyla Genel Toplam:' : 'Total in Words:' }}
                </div>
                <div class="text-sm font-medium italic text-primary">#{{ totalAsWords }}#</div>
            </div>
        </div>

        <!-- Sağ: Toplam Kutusu -->
        <div class="w-full lg:w-6/12">
            <div class="flex flex-col gap-4 p-4 bg-surface-50 dark:bg-surface-900 rounded">
                <div class="flex justify-between">
                    <span>{{ isExport ? 'Gross Total:' : 'Brüt Toplam:' }}</span>
                    <span class="font-medium">{{ fmt(totals.grossTotal) }} {{ currency }}</span>
                </div>
                <div class="flex justify-between text-red-500">
                    <span>{{ isExport ? 'Total Discount:' : 'İskonto Toplamı:' }}</span>
                    <span class="font-medium">- {{ fmt(totals.discountTotal) }} {{ currency }}</span>
                </div>
                <div class="flex justify-between border-t pt-2 mt-1">
                    <span>{{ isExport ? 'Subtotal:' : 'Ara Toplam:' }}</span>
                    <span class="font-medium">{{ fmt(totals.subtotal) }} {{ currency }}</span>
                </div>
                <div v-if="discountRate > 0" class="flex justify-between text-red-500">
                    <span>{{ isExport ? 'Global Discount' : 'Genel İndirim' }} (%{{ discountRate }}):</span>
                    <span class="font-medium">- {{ fmt(totals.globalDiscount) }} {{ currency }}</span>
                </div>
                <div v-if="discountRate > 0" class="flex justify-between font-bold border-t pt-2">
                    <span>{{ isExport ? 'Net Subtotal:' : 'Net Ara Toplam:' }}</span>
                    <span class="font-medium">{{ fmt(totals.netSubtotal) }} {{ currency }}</span>
                </div>
                <div class="flex justify-between">
                    <span>{{ isExport ? 'VAT Total:' : 'KDV Toplam:' }}</span>
                    <span class="font-medium">{{ fmt(totals.vatTotal) }} {{ currency }}</span>
                </div>
                <div class="flex justify-between text-medium font-semibold border-t pt-4">
                    <span>{{ isExport ? 'Grand Total:' : 'Genel Toplam:' }}</span>
                    <span>{{ fmt(totals.total) }} {{ currency }}</span>
                </div>

                <!-- TRY karşılığı (yabancı döviz ise göster) -->
                <div v-if="isForeignCurrency && totalsTRY" class="border-t pt-3 mt-1">
                    <div class="text-surface-500 text-sm mb-1">
                        {{ isExport ? 'TRY Equivalent' : 'TRY Karşılığı' }} (Kur: {{ exchangeRate }})
                    </div>
                    <div class="flex justify-between font-bold text-primary">
                        <span>≈ {{ isExport ? 'Total TRY:' : 'TRY Toplam:' }}</span>
                        <span>{{ fmt(totalsTRY.total) }} ₺</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
