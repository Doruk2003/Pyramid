<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { StockMovement, type MovementType } from '@/modules/inventory/domain/stock-movement.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MovementItemsTable from '../components/MovementItemsTable.vue';

const toast = useToast();
const router = useRouter();
const invStore = useInventoryStore();
const productStore = useProductStore();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const header = ref({
    movementType: 'in' as MovementType,
    warehouseId: '',
    targetWarehouseId: '',
    note: '',
    issueDate: new Date()
});

const lines = ref<any[]>([]);
const submitted = ref(false);
const isGeneratingPdf = ref(false);
const pdfTemplate = ref<HTMLElement | null>(null);

const movementTypes = [
    { label: 'Giriş', value: 'in' },
    { label: 'Çıkış', value: 'out' },
    { label: 'Transfer', value: 'transfer' },
    { label: 'Düzeltme', value: 'adjustment' }
];

async function generateNextReceiptNo(): Promise<string> {
    const prefix = 'STK';
    const num = Math.floor(100000 + Math.random() * 900000); // Simple random for now
    return `${prefix}-${num}`;
}

const receiptNo = ref('');

onMounted(async () => {
    invStore.fetchWarehouses();
    invStore.fetchBalances();
    if (productStore.products.length === 0) productStore.fetchProducts();
    if (settingsStore.settings === null) settingsStore.fetchSettings();
    
    receiptNo.value = await generateNextReceiptNo();
    // Add first line by default
    addLine();
});

function addLine() {
    lines.value.push({
        id: crypto.randomUUID(),
        productId: '',
        description: '',
        quantity: 1,
        unitCost: 0,
        note: ''
    });
}

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { nextTick } from 'vue';

async function generatePdf() {
    if (!pdfTemplate.value) return;
    isGeneratingPdf.value = true;
    await nextTick();
    
    try {
        const canvas = await html2canvas(pdfTemplate.value, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${header.value.movementType.toUpperCase()}_${receiptNo.value}.pdf`);
    } catch (error) {
        console.error('PDF Error:', error);
        toast.add({ severity: 'error', summary: 'Hata', detail: 'PDF oluşturulamadı' });
    } finally {
        isGeneratingPdf.value = false;
    }
}

async function saveMovement(print = false) {
    submitted.value = true;

    if (!header.value.warehouseId || lines.value.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları doldurun', life: 3000 });
        return;
    }

    const validLines = lines.value.filter(l => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'En az bir adet geçerli ürün kalemi girilmelidir', life: 3000 });
        return;
    }

    if (header.value.movementType === 'transfer' && !header.value.targetWarehouseId) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Hedef depo seçilmelidir', life: 3000 });
        return;
    }

    const companyId = authStore.user?.companyId || '';
    const userId = authStore.user?.id || '';
    const movementsToSave: StockMovement[] = [];

    validLines.forEach(line => {
        if (header.value.movementType === 'transfer') {
            // OUT Movement from source
            movementsToSave.push(StockMovement.create({
                id: crypto.randomUUID(),
                companyId,
                productId: line.productId,
                warehouseId: header.value.warehouseId,
                movementType: 'out',
                quantity: line.quantity,
                referenceType: 'manual',
                referenceId: receiptNo.value,
                note: `Transfer (Hedef: ${invStore.warehouses.find(w => w.id === header.value.targetWarehouseId)?.name}) - ${line.note || header.value.note || ''}`,
                createdBy: userId,
                createdAt: header.value.issueDate
            }));

            // IN Movement to target
            movementsToSave.push(StockMovement.create({
                id: crypto.randomUUID(),
                companyId,
                productId: line.productId,
                warehouseId: header.value.targetWarehouseId,
                movementType: 'in',
                quantity: line.quantity,
                referenceType: 'manual',
                referenceId: receiptNo.value,
                note: `Transfer (Kaynak: ${invStore.warehouses.find(w => w.id === header.value.warehouseId)?.name}) - ${line.note || header.value.note || ''}`,
                createdBy: userId,
                createdAt: header.value.issueDate
            }));
        } else {
            movementsToSave.push(StockMovement.create({
                id: crypto.randomUUID(),
                companyId,
                productId: line.productId,
                warehouseId: header.value.warehouseId,
                movementType: header.value.movementType,
                quantity: line.quantity,
                unitCost: line.unitCost || 0,
                referenceType: 'manual',
                referenceId: receiptNo.value,
                note: line.note || header.value.note || '',
                createdBy: userId,
                createdAt: header.value.issueDate
            }));
        }
    });

    const result = await invStore.addMovements(movementsToSave);

    if (result.success) {
        if (print) {
            await generatePdf();
        }
        toast.add({ severity: 'success', summary: 'Başarılı', detail: `${movementsToSave.length} adet hareket başarıyla kaydedildi`, life: 3000 });
        setTimeout(() => router.push('/inventory/movements'), 500);
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/inventory/movements');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-6 min-h-32 flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <div class="flex flex-col gap-1">
                    <div class="m-0 text-2xl font-medium">Yeni Depo Fişi - {{ receiptNo }}</div>
                    <div class="text-surface-600 dark:text-surface-400">Toplu stok girişi, çıkışı veya depo transferlerini buradan yapabilirsiniz.</div>
                </div>
                <div class="flex items-center gap-2">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" outlined @click="goBack" />
                    <Button label="Kaydet & Yazdır" icon="pi pi-print" severity="info" outlined @click="saveMovement(true)" :loading="isGeneratingPdf" />
                    <Button label="Sadece Kaydet" icon="pi pi-check" @click="saveMovement(false)" />
                </div>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <!-- Header Info -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                    <div>
                        <label class="block font-bold mb-3">Hareket Tipi</label>
                        <Select v-model="header.movementType" :options="movementTypes" optionLabel="label" optionValue="value" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Tarih</label>
                        <DatePicker v-model="header.issueDate" dateFormat="dd.mm.yy" showIcon fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">
                            {{ header.movementType === 'transfer' ? 'Kaynak Depo' : 'Depo' }}
                        </label>
                        <Select v-model="header.warehouseId" :options="invStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                        <small v-if="submitted && !header.warehouseId" class="text-red-500">Depo zorunludur.</small>
                    </div>
                    <div v-if="header.movementType === 'transfer'">
                        <label class="block font-bold mb-3">Hedef Depo</label>
                        <Select v-model="header.targetWarehouseId" :options="invStore.warehouses" optionLabel="name" optionValue="id" placeholder="Hedef Depo Seçin" fluid />
                        <small v-if="submitted && !header.targetWarehouseId" class="text-red-500">Hedef depo zorunludur.</small>
                    </div>
                </div>

                <!-- Bulk Items Table -->
                <MovementItemsTable 
                    :lines="lines" 
                    :warehouseId="header.warehouseId" 
                    :movementType="header.movementType" 
                    @change="() => {}"
                />

                <!-- Footer Note -->
                <div>
                    <label for="mainNote" class="block font-bold mb-3">Genel Not</label>
                    <Textarea id="mainNote" v-model="header.note" rows="2" placeholder="Tüm kalemler için geçerli ortak not..." fluid />
                </div>
            </div>
        </div>

        <!-- Hidden PDF Template for Warehouse Receipt -->
        <div style="position: absolute; left: -9999px; top: -9999px;">
            <div ref="pdfTemplate" class="invoice-pdf-container" style="width: 210mm; min-height: 297mm; padding: 20mm; background: white; font-family: sans-serif;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                    <div>
                        <h2 style="margin: 0; color: #333;">{{ settingsStore.settings?.companyName || 'PYRAMID' }}</h2>
                        <p style="margin: 5px 0; color: #666;">Depo Hareket Fişi</p>
                    </div>
                    <div style="text-align: right;">
                        <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">{{ header.movementType === 'transfer' ? 'SEVK FİŞİ' : 'STOК FİŞİ' }}</h1>
                        <p style="margin: 5px 0;"><strong>No:</strong> {{ receiptNo }}</p>
                        <p style="margin: 5px 0;"><strong>Tarih:</strong> {{ new Date(header.issueDate).toLocaleDateString('tr-TR') }}</p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                    <div>
                        <h3 style="font-size: 14px; color: #999; text-transform: uppercase; margin-bottom: 5px;">{{ header.movementType === 'transfer' ? 'Kaynak Depo' : 'Depo' }}</h3>
                        <p style="margin: 0; font-weight: bold; font-size: 16px;">{{ invStore.warehouses.find(w => w.id === header.warehouseId)?.name }}</p>
                        <p style="margin: 0; color: #666; font-size: 14px;">{{ invStore.warehouses.find(w => w.id === header.warehouseId)?.location }}</p>
                    </div>
                    <div v-if="header.movementType === 'transfer'">
                        <h3 style="font-size: 14px; color: #999; text-transform: uppercase; margin-bottom: 5px;">Hedef Depo</h3>
                        <p style="margin: 0; font-weight: bold; font-size: 16px;">{{ invStore.warehouses.find(w => w.id === header.targetWarehouseId)?.name }}</p>
                        <p style="margin: 0; color: #666; font-size: 14px;">{{ invStore.warehouses.find(w => w.id === header.targetWarehouseId)?.location }}</p>
                    </div>
                    <div v-else>
                         <h3 style="font-size: 14px; color: #999; text-transform: uppercase; margin-bottom: 5px;">İşlem Tipi</h3>
                         <p style="margin: 0; font-weight: bold; font-size: 16px;">{{ movementTypes.find(t => t.value === header.movementType)?.label }}</p>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #333; text-align: left; font-size: 12px;">
                            <th style="padding: 10px 5px;">Ürün Kodu / Adı</th>
                            <th style="padding: 10px 5px; text-align: center;">Miktar</th>
                            <th style="padding: 10px 5px;">Not</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="line in lines.filter(l => l.productId)" :key="line.id" style="border-bottom: 1px solid #eee; font-size: 12px;">
                            <td style="padding: 10px 5px;">
                                <div style="font-weight: bold;">{{ productStore.products.find(p => p.id === line.productId)?.code }}</div>
                                <div>{{ productStore.products.find(p => p.id === line.productId)?.name }}</div>
                            </td>
                            <td style="padding: 10px 5px; text-align: center; font-size: 14px; font-weight: bold;">{{ line.quantity }}</td>
                            <td style="padding: 10px 5px;">{{ line.note }}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="font-size: 12px; color: #999; margin-bottom: 5px;">AÇIKLAMA / NOT</p>
                    <p style="font-size: 12px;">{{ header.note }}</p>
                </div>

                <div style="margin-top: 60px; display: flex; justify-content: space-around; text-align: center;">
                    <div style="width: 200px; border-top: 1px solid #333; padding-top: 10px; font-size: 12px;">
                        TESLİM EDEN<br>(İmza)
                    </div>
                    <div style="width: 200px; border-top: 1px solid #333; padding-top: 10px; font-size: 12px;">
                        TESLİM ALAN<br>(İmza)
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>


