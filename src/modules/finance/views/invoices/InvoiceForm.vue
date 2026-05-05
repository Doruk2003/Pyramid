<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import '@/modules/finance/assets/css/invoice-pdf.css';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';
import { Invoice, type DocumentCategory, type PaymentType } from '@/modules/finance/domain/invoice.entity';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useSalesStore } from '@/modules/sales/application/sales.store';
import { DocumentCalculator } from '@/shared/utils/document-calculator';
import { DocumentLogicService } from '@/shared/utils/document-logic.service';
import { getErrorMessage } from '@/shared/utils/error';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from 'primevue/usetoast';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const financeStore = useFinanceStore();
const projectStore = useProjectStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const lookupStore = useLookupStore();
const salesStore = useSalesStore();
const exchangeRateStore = useExchangeRateStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const settingsStore = useSettingsStore();

const invoiceId = route.params.id as string;
const isEdit = !!invoiceId;

const invoice = ref<any>({
    invoiceType: 'sale',
    documentCategory: 'domestic',
    invoiceNumber: '',
    accountId: '',
    warehouseId: '',
    projectId: '',
    paymentType: 'cash',
    issueDate: new Date(),
    dueDate: null,
    status: 'draft',
    currency: 'TRY',
    exchangeRate: 1,
    discountRate: 0,
    notes: '',
    sourceType: undefined,
    sourceIds: [],
    lines: []
});

const documentCategories: Array<{ label: string; value: DocumentCategory }> = [
    { label: 'Yurtiçi Faturası', value: 'domestic' },
    { label: 'İhracat Faturası', value: 'export' },
    { label: 'İhraç Kayıtlı Fatura', value: 'export_registered' }
];

const paymentTypes: Array<{ label: string; value: PaymentType }> = [
    { label: 'Peşin', value: 'cash' },
    { label: 'Çek', value: 'check' },
    { label: 'Senet', value: 'note' },
    { label: 'Açık Hesap', value: 'open_account' },
    { label: 'Kredi Kartı', value: 'credit_card' }
];

onMounted(async () => {
    await Promise.all([
        financeStore.fetchAccounts(),
        productStore.fetchProducts(),
        inventoryStore.fetchWarehouses(),
        lookupStore.fetchAll(),
        exchangeRateStore.fetchCurrentRates(),
        projectStore.fetchProjects(),
        settingsStore.fetchSettings(),
        inventoryStore.fetchBalances()
    ]);

    if (isEdit) {
        await financeStore.fetchInvoices();
        const found = financeStore.invoices.find((i) => i.id === invoiceId);
        if (found) {
            const obj = found.toObject();
            invoice.value = {
                ...obj,
                warehouseId: obj.warehouseId || '',
                projectId: obj.projectId || '',
                notes: obj.notes || '',
                issueDate: new Date(obj.issueDate),
                dueDate: obj.dueDate ? new Date(obj.dueDate) : null
            };
        }
    } else {
        if (settingsStore.settings) {
            const serial = settingsStore.settings.invoiceSerial || 'ABC';
            const startingNo = settingsStore.settings.invoiceStartingNumber || 1;
            await financeStore.fetchInvoices();
            const count = financeStore.invoices.filter(i => i.invoiceNumber.startsWith(serial)).length;
            const nextNo = startingNo + count;
            invoice.value.invoiceNumber = `${serial}-${new Date().getFullYear()}-${String(nextNo).padStart(6, '0')}`;
        }

        const sourceIdsQuery = route.query.sourceIds as string;
        const sourceTypeQuery = route.query.sourceType as 'quote' | 'order';

        if (sourceIdsQuery && sourceTypeQuery) {
            invoice.value.sourceType = sourceTypeQuery;
            invoice.value.sourceIds = sourceIdsQuery.split(',');
            invoice.value.lines = []; 

            if (sourceTypeQuery === 'order') {
                await salesStore.fetchOrders();
                const selectedOrders = salesStore.orders.filter(o => invoice.value.sourceIds?.includes(o.id));
                if (selectedOrders.length > 0) {
                    const first = selectedOrders[0];
                    invoice.value.accountId = first.accountId;
                    invoice.value.currency = first.currency;
                    invoice.value.exchangeRate = first.exchangeRate;
                    invoice.value.projectId = first.projectId || '';
                    invoice.value.warehouseId = first.lines[0]?.warehouseId || '';
                    const orderNumbers = selectedOrders.map(o => o.orderNumber).join(', ');
                    invoice.value.notes = `${orderNumbers} nolu siparişlere istinaden düzenlenmiştir.\n` + (first.notes || '');

                    selectedOrders.forEach(order => {
                        order.lines.forEach(line => {
                            const pendingQty = line.quantity - (line.invoicedQuantity || 0);
                            if (pendingQty > 0) {
                                invoice.value.lines.push({
                                    id: crypto.randomUUID(),
                                    productId: line.productId,
                                    description: line.description,
                                    quantity: pendingQty,
                                    unitPrice: line.unitPrice,
                                    vatRate: line.vatRate,
                                    discountRate1: line.discountRate1 || 0,
                                    discountRate2: line.discountRate2 || 0,
                                    discountRate3: line.discountRate3 || 0,
                                    lineTotal: 0,
                                    sourceLineId: line.id
                                });
                            }
                        });
                    });
                }
            } else if (sourceTypeQuery === 'quote') {
                await salesStore.fetchQuotes();
                const selectedQuotes = salesStore.quotes.filter(q => invoice.value.sourceIds?.includes(q.id));
                if (selectedQuotes.length > 0) {
                    const first = selectedQuotes[0];
                    invoice.value.accountId = first.accountId;
                    invoice.value.currency = first.currency;
                    invoice.value.exchangeRate = first.exchangeRate;
                    const quoteNumbers = selectedQuotes.map(q => q.quoteNumber).join(', ');
                    invoice.value.notes = `${quoteNumbers} nolu tekliflere istinaden düzenlenmiştir.\n` + (first.notes || '');

                    selectedQuotes.forEach(quote => {
                        quote.lines.forEach(line => {
                            const pendingQty = line.quantity - (line.orderedQuantity || 0);
                            if (pendingQty > 0) {
                                invoice.value.lines.push({
                                    id: crypto.randomUUID(),
                                    productId: line.productId,
                                    description: line.description,
                                    quantity: pendingQty,
                                    unitPrice: line.unitPrice,
                                    vatRate: line.vatRate,
                                    discountRate1: line.discountRate1 || 0,
                                    discountRate2: line.discountRate2 || 0,
                                    discountRate3: line.discountRate3 || 0,
                                    lineTotal: 0,
                                    sourceLineId: line.id
                                });
                            }
                        });
                    });
                }
            }
        }
    }
});

watch(() => invoice.value.currency, (newCode) => {
    if (!newCode || newCode === 'TRY') {
        invoice.value.exchangeRate = 1;
    } else {
        const rate = exchangeRateStore.getRateByCode(newCode || '');
        if (rate > 0) invoice.value.exchangeRate = rate;
    }
});

const isExport = computed(() => invoice.value.documentCategory === 'export' || invoice.value.documentCategory === 'export_registered');

const totals = computed(() => {
    return DocumentCalculator.calculateTotals(
        invoice.value.lines, 
        invoice.value.discountRate, 
        invoice.value.currency,
        isExport.value
    );
});

async function saveInvoice() {
    if (!invoice.value.accountId || !invoice.value.invoiceNumber || invoice.value.lines.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları doldurun', life: 3000 });
        return;
    }

    // Stok Kontrolü (Satış Faturaları için)
    if (invoice.value.invoiceType === 'sale' && invoice.value.warehouseId) {
        for (const line of invoice.value.lines) {
            const product = productStore.products.find(p => p.id === line.productId);
            if (product && product.inventoryStatus === 'TRACKED') {
                const currentBalance = inventoryStore.getTotalBalance(line.productId); // TODO: check specific warehouse balance?
                // For now, check general balance or if we want stricter, check specific warehouse
                const warehouseBalance = inventoryStore.balances.find(b => b.productId === line.productId && b.warehouseId === invoice.value.warehouseId)?.balance || 0;
                
                if (warehouseBalance < line.quantity) {
                    toast.add({ 
                        severity: 'error', 
                        summary: 'Stok Yetersiz', 
                        detail: `${line.description} için seçili depoda yeterli stok yok (Mevcut: ${warehouseBalance}, Gerekli: ${line.quantity})`, 
                        life: 5000 
                    });
                    return;
                }
            }
        }
    }

    const t = totals.value;
    const invId = invoiceId || crypto.randomUUID();
    const inv = Invoice.create({
        ...invoice.value,
        id: invId,
        companyId: authStore.user?.companyId || '',
        subtotal: t.subtotal,
        vatTotal: t.vatTotal,
        total: t.total,
        createdAt: invoice.value.createdAt || new Date(),
        updatedAt: new Date(),
        lines: invoice.value.lines.map((l: any) => ({
            ...l,
            invoiceId: invId
        }))
    });

    const result = await financeStore.saveInvoice(inv);
    if (result.success) {
        // Stok Hareketi Oluştur
        if (invoice.value.warehouseId) {
            const { StockMovement } = await import('@/modules/inventory/domain/stock-movement.entity');
            const movements = invoice.value.lines.map((line: any) => 
                StockMovement.create({
                    id: crypto.randomUUID(),
                    companyId: authStore.user?.companyId || '',
                    productId: line.productId,
                    warehouseId: invoice.value.warehouseId,
                    movementType: invoice.value.invoiceType === 'sale' ? 'out' : 'in',
                    quantity: line.quantity,
                    unitCost: invoice.value.invoiceType === 'purchase' ? line.unitPrice : 0,
                    referenceType: 'invoice',
                    referenceId: invId,
                    note: `${invoice.value.invoiceNumber} nolu fatura ile ${invoice.value.invoiceType === 'sale' ? 'çıkış' : 'giriş'}`,
                    createdBy: authStore.user?.id || '',
                    createdAt: invoice.value.issueDate
                })
            );

            if (movements.length > 0) {
                await inventoryStore.addMovements(movements);
            }
        }

        if (invoice.value.sourceType && invoice.value.sourceIds.length > 0) {
            await salesStore.updateSourceQuantities(invoice.value.sourceType, invoice.value.sourceIds);
        }
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Fatura kaydedildi ve stok hareketleri işlendi', life: 3000 });
        router.push('/finance/invoices');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/finance/invoices');
}

const pdfTemplate = ref<HTMLElement | null>(null);
const isGeneratingPdf = ref(false);

async function generatePdf() {
    if (!pdfTemplate.value) return;
    isGeneratingPdf.value = true;
    await nextTick();
    try {
        const canvas = await html2canvas(pdfTemplate.value, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`FATURA-${invoice.value.invoiceNumber}.pdf`);
    } catch (e) {
        console.error('PDF error:', e);
    } finally {
        isGeneratingPdf.value = false;
    }
}

const barcodeInput = ref('');
const barcodeInputRef = ref<HTMLInputElement | null>(null);

function handleBarcodeScan() {
    const code = barcodeInput.value.trim();
    if (!code) return;

    const product = productStore.products.find(p => p.barcode === code || p.code === code);
    
    if (product) {
        const existingLine = invoice.value.lines.find((l: any) => l.productId === product.id);
        
        if (existingLine) {
            existingLine.quantity += 1;
            toast.add({ severity: 'success', summary: 'Ürün Eklendi', detail: `${product.name} miktarı artırıldı: ${existingLine.quantity}`, life: 2000 });
        } else {
            const account = financeStore.accounts.find(a => a.id === invoice.value.accountId);
            const category = lookupStore.categories.find(c => c.id === product.categoryId);
            const extendedProduct = { ...product.toObject(), categoryName: category?.name };
            
            const discountType = DocumentLogicService.getProductDiscount(extendedProduct, account, settingsStore.settings);
            const discounts = DocumentLogicService.applyAccountDealerDiscount(discountType, account);

            // Handle Currency Conversion
            const productCurrency = lookupStore.currencies.find(c => c.id === product.currencyId)?.code || 'TRY';
            const targetCurrency = invoice.value.currency || 'TRY';
            let unitPrice = product.price;

            if (productCurrency !== targetCurrency) {
                const productRate = exchangeRateStore.getRateByCode(productCurrency);
                const targetRate = invoice.value.exchangeRate || 1;
                unitPrice = CurrencyConversionService.crossConvert(product.price, productRate, targetRate);
            }

            invoice.value.lines.push({
                id: crypto.randomUUID(),
                productId: product.id,
                description: product.name,
                quantity: 1,
                unitPrice: unitPrice,
                vatRate: product.taxRate || 20,
                discountRate1: discounts.d1,
                discountRate2: discounts.d2,
                discountRate3: discounts.d3,
                lineTotal: 0
            });
            toast.add({ severity: 'success', summary: 'Ürün Eklendi', detail: product.name, life: 2000 });
        }
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Barkod bulunamadı: ' + code, life: 3000 });
    }

    barcodeInput.value = '';
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <!-- Header -->
        <div class="card p-6 min-h-32 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Faturayı Düzenle' : 'Yeni Fatura' }}</div>
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-hashtag text-primary text-sm"></i>
                            <span class="text-xl font-mono font-bold text-primary leading-none">{{ invoice.invoiceNumber || '---' }}</span>
                        </div>
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-tag text-surface-500 text-sm"></i>
                            <span class="text-base font-bold text-surface-700 dark:text-surface-300">{{ invoice.invoiceType === 'sale' ? 'Satış' : 'Alış' }}</span>
                        </div>
                        <div v-if="invoice.currency !== 'TRY'" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-money-bill text-surface-500 text-sm"></i>
                            <div class="text-base font-medium leading-none">1 {{ invoice.currency }} = <span class="font-bold text-primary">{{ invoice.exchangeRate.toFixed(4) }}</span> ₺</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button icon="pi pi-file-pdf" label="PDF" severity="secondary" outlined size="small" @click="generatePdf" :loading="isGeneratingPdf" />
                        <Button icon="pi pi-print" label="YAZDIR" severity="secondary" outlined size="small" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <!-- Top Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label class="block font-bold mb-3">Tarih</label>
                        <DatePicker v-model="invoice.issueDate" dateFormat="dd.mm.yy" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Vade Tarihi</label>
                        <DatePicker v-model="invoice.dueDate" dateFormat="dd.mm.yy" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Kategori</label>
                        <Select v-model="invoice.documentCategory" :options="documentCategories" optionLabel="label" optionValue="value" fluid />
                    </div>
                    <div class="lg:col-span-2">
                        <label class="block font-bold mb-3">Cari Hesap</label>
                        <Select v-model="invoice.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Hesap Seçin" filter fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Depo</label>
                        <Select v-model="invoice.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid filter />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Döviz</label>
                        <Select v-model="invoice.currency" :options="lookupStore.currencies" optionLabel="code" optionValue="code" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Kur</label>
                        <InputNumber v-model="invoice.exchangeRate" :minFractionDigits="4" :disabled="invoice.currency === 'TRY'" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Ödeme Tipi</label>
                        <Select v-model="invoice.paymentType" :options="paymentTypes" optionLabel="label" optionValue="value" fluid />
                    </div>
                    <div>
                        <label class="block font-bold mb-3">Genel İndirim %</label>
                        <InputNumber v-model="invoice.discountRate" :min="0" :max="100" fluid />
                    </div>
                </div>

                <!-- Barcode Scanner Input -->
                <div class="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col md:flex-row items-center gap-4">
                    <div class="flex-shrink-0">
                        <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            <i class="pi pi-barcode text-white text-2xl"></i>
                        </div>
                    </div>
                    <div class="flex-grow">
                        <div class="text-sm font-bold text-primary uppercase mb-1">Hızlı Ürün Ekleme (Barkod)</div>
                        <InputText 
                            ref="barcodeInputRef"
                            v-model="barcodeInput" 
                            placeholder="Barkodu okutun veya ürün kodunu yazıp ENTER'a basın..." 
                            class="w-full text-xl font-mono"
                            @keyup.enter="handleBarcodeScan"
                            autofocus
                        />
                    </div>
                    <div class="hidden md:block text-xs text-surface-400 max-w-[150px]">
                        Barkod okuyucunuzu buraya odaklayarak ürünleri seri şekilde listenize ekleyebilirsiniz.
                    </div>
                </div>

                <!-- Lines Table -->
                <DocumentItemsTable 
                    :lines="invoice.lines" 
                    :currency="invoice.currency" 
                    :exchangeRate="invoice.exchangeRate" 
                    :accountId="invoice.accountId"
                    :warehouseId="invoice.warehouseId"
                    documentType="invoice"
                    @change="() => {}"
                />

                <!-- Summary -->
                <DocumentSummary 
                    :totals="totals" 
                    :currency="invoice.currency" 
                    v-model:notes="invoice.notes" 
                />
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" outlined @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Faturayı Kaydet" icon="pi pi-check" class="w-full" @click="saveInvoice" />
                </div>
            </div>
        </div>

        <!-- Hidden PDF Template -->
        <div style="position: absolute; left: -9999px; top: -9999px;">
            <div ref="pdfTemplate" class="invoice-pdf-container" style="width: 210mm; min-height: 297mm; padding: 20mm; background: white; font-family: sans-serif;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                    <div>
                        <h2 style="margin: 0; color: #333;">{{ settingsStore.settings?.companyName || 'PYRAMID' }}</h2>
                        <p style="margin: 5px 0; color: #666;">{{ authStore.user?.email }}</p>
                    </div>
                    <div style="text-align: right;">
                        <h1 style="margin: 0; font-size: 24px;">FATURA</h1>
                        <p style="margin: 5px 0;"><strong>No:</strong> {{ invoice.invoiceNumber }}</p>
                        <p style="margin: 5px 0;"><strong>Tarih:</strong> {{ new Date(invoice.issueDate).toLocaleDateString('tr-TR') }}</p>
                    </div>
                </div>

                <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                    <h3 style="font-size: 14px; color: #999; text-transform: uppercase;">Müşteri</h3>
                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">{{ financeStore.accounts.find(a => a.id === invoice.accountId)?.name }}</p>
                    <p style="margin: 5px 0; color: #666;">{{ financeStore.accounts.find(a => a.id === invoice.accountId)?.address }}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #333; text-align: left; font-size: 12px;">
                            <th style="padding: 10px 5px;">Ürün</th>
                            <th style="padding: 10px 5px; text-align: center;">Miktar</th>
                            <th style="padding: 10px 5px; text-align: right;">Birim Fiyat</th>
                            <th style="padding: 10px 5px; text-align: right;">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="line in invoice.lines" :key="line.id" style="border-bottom: 1px solid #eee; font-size: 12px;">
                            <td style="padding: 10px 5px;">{{ line.description }}</td>
                            <td style="padding: 10px 5px; text-align: center;">{{ line.quantity }}</td>
                            <td style="padding: 10px 5px; text-align: right;">{{ (line.unitPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</td>
                            <td style="padding: 10px 5px; text-align: right;">{{ (line.lineTotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="display: flex; justify-content: space-between;">
                    <div style="width: 50%;">
                        <p style="font-size: 12px; color: #999; margin-bottom: 5px;">NOTLAR</p>
                        <p style="font-size: 12px; white-space: pre-wrap;">{{ invoice.notes }}</p>
                    </div>
                    <div style="width: 40%;">
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px;">
                            <span>Ara Toplam:</span>
                            <span>{{ totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px;">
                            <span>KDV Toplam:</span>
                            <span>{{ totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; margin-top: 10px; border-top: 2px solid #333; font-weight: bold; font-size: 16px;">
                            <span>GENEL TOPLAM:</span>
                            <span>{{ totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
