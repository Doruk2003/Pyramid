<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import '@/modules/finance/assets/css/invoice-pdf.css';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';
import { Invoice, type DocumentCategory, type InvoiceStatus, type InvoiceType, type PaymentType } from '@/modules/finance/domain/invoice.entity';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { useLookupStore } from '@/modules/inventory/application/lookup.store';
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useSalesStore } from '@/modules/sales/application/sales.store'; // Yeni eklendi
import { getErrorMessage } from '@/shared/utils/error';
import { numberToWords } from '@/shared/utils/number-to-words';
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
const salesStore = useSalesStore(); // Yeni eklendi
const exchangeRateStore = useExchangeRateStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const settingsStore = useSettingsStore();

const invoiceId = route.params.id as string;
const isEdit = !!invoiceId;

interface InvoiceLineForm {
    id: string;
    productId: string;
    warehouseId?: string; // Yeni eklendi
    description?: string;
    quantity: number;
    unitPrice: number;
    originalPrice?: number;
    originalCurrency?: string;
    vatRate: number;
    discountRate1: number;
    discountRate2: number;
    discountRate3: number;
    lineTotal: number;
    sourceLineId?: string; // Yeni eklendi
}

interface InvoiceFormModel {
    invoiceType: InvoiceType;
    documentCategory: DocumentCategory;
    invoiceNumber: string;
    accountId: string;
    warehouseId: string;
    projectId: string;          // PRJ entegrasyonu
    paymentType: PaymentType;
    issueDate: Date;
    dueDate: Date | null;
    status: InvoiceStatus;
    currency: string;
    exchangeRate: number;
    discountRate: number;
    notes: string;
    lines: InvoiceLineForm[];
    paidAmount?: number;
    sourceType?: 'quote' | 'order'; // Yeni eklendi
    sourceIds?: string[];           // Yeni eklendi
    createdAt?: Date;
}

const invoice = ref<InvoiceFormModel>({
    invoiceType: 'sale',
    documentCategory: 'domestic',
    invoiceNumber: '',
    accountId: '',
    warehouseId: '',
    projectId: '',              // PRJ entegrasyonu
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

const invoiceTypes: Array<{ label: string; value: InvoiceType }> = [
    { label: 'Satış', value: 'sale' },
    { label: 'Alış', value: 'purchase' },
    { label: 'Satış İade', value: 'return_sale' },
    { label: 'Alış İade', value: 'return_purchase' }
];

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

const taxRates = [
    { label: '%0', value: 0 },
    { label: '%1', value: 1 },
    { label: '%8', value: 8 },
    { label: '%10', value: 10 },
    { label: '%20', value: 20 }
];

onMounted(async () => {
    await financeStore.fetchAccounts();
    if (productStore.products.length === 0) await productStore.fetchProducts();
    if (inventoryStore.warehouses.length === 0) await inventoryStore.fetchWarehouses();
    if (lookupStore.currencies.length === 0) await lookupStore.fetchAll();
    await exchangeRateStore.fetchCurrentRates();
    await projectStore.fetchProjects();   // Proje dropdown için
    await settingsStore.fetchSettings();
    await inventoryStore.fetchBalances();

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
        addLine(false);
        // Otomatik Fatura No Oluştur
        if (settingsStore.settings) {
            const serial = settingsStore.settings.invoiceSerial || 'ABC';
            const startingNo = settingsStore.settings.invoiceStartingNumber || 1;
            
            await financeStore.fetchInvoices();
            // Aynı seri ile başlayan faturaları say
            const count = financeStore.invoices.filter(i => i.invoiceNumber.startsWith(serial)).length;
            const nextNo = startingNo + count;
            invoice.value.invoiceNumber = `${serial}-${new Date().getFullYear()}-${String(nextNo).padStart(6, '0')}`;
        }

        // --- Kaynak Belgeden (Sipariş/Teklif) Aktarım Mantığı ---
        const sourceIdsQuery = route.query.sourceIds as string;
        const sourceTypeQuery = route.query.sourceType as 'quote' | 'order';

        if (sourceIdsQuery && sourceTypeQuery) {
            invoice.value.sourceType = sourceTypeQuery;
            invoice.value.sourceIds = sourceIdsQuery.split(',');
            invoice.value.lines = []; // Varsayılan boş satırı temizle

            if (sourceTypeQuery === 'order') {
                await salesStore.fetchOrders();
                const selectedOrders = salesStore.orders.filter(o => invoice.value.sourceIds?.includes(o.id));
                
                if (selectedOrders.length > 0) {
                    // İlk siparişten genel bilgileri al
                    const first = selectedOrders[0];
                    invoice.value.accountId = first.accountId;
                    invoice.value.currency = first.currency;
                    invoice.value.exchangeRate = first.exchangeRate;
                    invoice.value.projectId = first.projectId || '';
                    invoice.value.warehouseId = first.lines[0]?.warehouseId || ''; // Varsa ilk satırdaki depoyu al
                    
                    // Notlara sipariş numaralarını ekle
                    const orderNumbers = selectedOrders.map(o => o.orderNumber).join(', ');
                    invoice.value.notes = `${orderNumbers} nolu siparişlere istinaden düzenlenmiştir. \n` + (first.notes || '');

                    // Tüm sipariş satırlarını (bekleyen miktar kadar) ekle
                    selectedOrders.forEach(order => {
                        order.lines.forEach(line => {
                            const pendingQty = line.quantity - (line.invoicedQuantity || 0);
                            if (pendingQty > 0) {
                                invoice.value.lines.push({
                                    id: crypto.randomUUID(),
                                    productId: line.productId,
                                    warehouseId: line.warehouseId || invoice.value.warehouseId,
                                    description: line.description,
                                    quantity: pendingQty,
                                    unitPrice: line.unitPrice,
                                    vatRate: line.vatRate,
                                    discountRate1: line.discountRate1 || 0,
                                    discountRate2: line.discountRate2 || 0,
                                    discountRate3: line.discountRate3 || 0,
                                    lineTotal: 0, // Computed tarafından hesaplanacak
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
                    invoice.value.notes = `${quoteNumbers} nolu tekliflere istinaden düzenlenmiştir. \n` + (first.notes || '');

                    selectedQuotes.forEach(quote => {
                        quote.lines.forEach(line => {
                            const pendingQty = line.quantity - (line.orderedQuantity || 0); // Teklif için orderQty kontrolü
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

// Döviz değiştiğinde güncel kuru otomatik doldur ve satırları yeniden hesapla
watch(
    () => invoice.value.currency,
    (newCode) => {
        if (!newCode || newCode === 'TRY') {
            invoice.value.exchangeRate = 1;
        } else {
            const rate = exchangeRateStore.getRateByCode(newCode);
            if (rate > 0) invoice.value.exchangeRate = rate;
        }
        // Tüm satırları yeni dövize göre güncelle
        invoice.value.lines.forEach(line => convertLinePrice(line));
    }
);

// Kur manuel değiştiğinde de satırları yeniden hesapla
watch(
    () => invoice.value.exchangeRate,
    () => {
        invoice.value.lines.forEach(line => convertLinePrice(line));
    }
);

// TRY karşılığı toplamlar (yabancı dövizli faturalar için)
const isForeignCurrency = computed(() => invoice.value.currency && invoice.value.currency !== 'TRY');
const isExport = computed(() => invoice.value.documentCategory === 'export' || invoice.value.documentCategory === 'export_registered');

const totalsTRY = computed(() => {
    if (!isForeignCurrency.value) return null;
    const rate = invoice.value.exchangeRate || 1;
    return {
        grossTotal: CurrencyConversionService.toTRY(totals.value.grossTotal, rate),
        discountTotal: CurrencyConversionService.toTRY(totals.value.discountTotal, rate),
        subtotal: CurrencyConversionService.toTRY(totals.value.subtotal, rate),
        vatTotal: CurrencyConversionService.toTRY(totals.value.vatTotal, rate),
        total: CurrencyConversionService.toTRY(totals.value.total, rate)
    };
});

const productSelectRefs = ref<any[]>([]);

function setProductSelectRef(el: any, index: number) {
    if (el) {
        productSelectRefs.value[index] = el;
    }
}

function focusAddLineButton() {
    const btn = document.getElementById('btnAddLine');
    if (btn) {
        btn.focus();
    }
}

function getStock(productId: string, warehouseId?: string) {
    if (!productId) return 0;
    const targetWarehouse = warehouseId || invoice.value.warehouseId;
    if (!targetWarehouse) return 0;
    
    const balance = inventoryStore.balances.find(
        (b) => b.productId === productId && b.warehouseId === targetWarehouse
    );
    return balance ? balance.balance : 0;
}

function addLine(autoOpenSelect = false) {
    const shouldOpen = autoOpenSelect === true;
    invoice.value.lines.push({
        id: crypto.randomUUID(),
        productId: '',
        warehouseId: invoice.value.warehouseId, // Header'daki depoyu varsayılan yap
        description: '',
        quantity: 1,
        unitPrice: 0,
        originalPrice: 0,
        originalCurrency: '',
        vatRate: 20,
        discountRate1: 0,
        discountRate2: 0,
        discountRate3: 0,
        lineTotal: 0
    });

    if (shouldOpen) {
        nextTick(() => {
            const lastIndex = invoice.value.lines.length - 1;
            const lastSelect = productSelectRefs.value[lastIndex];
            if (lastSelect) {
                if (lastSelect.show) {
                    lastSelect.show();
                } else if (lastSelect.$el) {
                    lastSelect.$el.click();
                }
            }
        });
    }
}

function removeLine(index: number) {
    invoice.value.lines.splice(index, 1);
}

function convertLinePrice(line: InvoiceLineForm) {
    if (!line.originalPrice || !line.originalCurrency) return;
    
    const invoiceCurrency = invoice.value.currency || 'TRY';
    const invoiceRate = invoice.value.exchangeRate || 1;
    
    // Ürünün orijinal döviz kurunu al
    const productRate = exchangeRateStore.getRateByCode(line.originalCurrency);
    
    if (line.originalCurrency === invoiceCurrency) {
        line.unitPrice = line.originalPrice;
    } else {
        // Çapraz kur dönüşümü (Product Currency -> TRY -> Invoice Currency)
        line.unitPrice = CurrencyConversionService.crossConvert(
            line.originalPrice,
            productRate,
            invoiceRate
        );
    }
}

function onProductChange(line: InvoiceLineForm) {
    const product = productStore.products.find((p) => p.id === line.productId);
    if (product) {
        line.originalPrice = product.price || 0;
        line.originalCurrency = lookupStore.currencies.find(c => c.id === product.currencyId)?.code || 'TRY';
        
        // Döviz dönüşümünü yap
        convertLinePrice(line);
        
        line.vatRate = product.taxRate || 20;

        // İskontoları sıfırla
        line.discountRate1 = 0;
        line.discountRate2 = 0;
        line.discountRate3 = 0;

        // Ürünün İskonto Tipine göre Cari'nin ilgili indirim oranını al
        const account = financeStore.accounts.find((a: any) => a.id === invoice.value.accountId);
        if (account) {
            let discountType = product.categoryDiscount || 0;

            // Eğer üründe açıkça iskonto tipi belirtilmemişse, kategori adı ile ayarları eşleştir
            if (!discountType && product.categoryId && settingsStore.settings) {
                const category = lookupStore.categories.find(c => c.id === product.categoryId);
                if (category && category.name) {
                    const matchCategory = (label: string, categoryName: string) => {
                        if (!label || label.toLocaleLowerCase('tr-TR').startsWith('bayi')) return false;
                        const l = label.toLocaleLowerCase('tr-TR').trim();
                        const c = categoryName.toLocaleLowerCase('tr-TR').trim();
                        if (l.includes(c) || c.includes(l)) return true;
                        const w = l.split(' ')[0];
                        if (w && w.length > 2 && c.includes(w)) return true;
                        return false;
                    };

                    const l1 = settingsStore.settings.discountLabel1 || '';
                    const l2 = settingsStore.settings.discountLabel2 || '';
                    const l3 = settingsStore.settings.discountLabel3 || '';

                    if (matchCategory(l1, category.name)) {
                        discountType = 1;
                    } else if (matchCategory(l2, category.name)) {
                        discountType = 2;
                    } else if (matchCategory(l3, category.name)) {
                        discountType = 3;
                    }
                }
            }

            if (discountType === 1) {
                line.discountRate1 = account.dealerDiscount1 || 0;
            } else if (discountType === 2) {
                line.discountRate2 = account.dealerDiscount2 || 0;
            } else if (discountType === 3) {
                line.discountRate3 = account.dealerDiscount3 || 0;
            }
        }
    }
}


const totals = computed(() => {
    let grossTotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;

    const isExport = invoice.value.documentCategory === 'export' || invoice.value.documentCategory === 'export_registered';

    invoice.value.lines.forEach((line) => {
        const lineGross = line.quantity * (line.unitPrice || 0);
        
        // Bileşik İndirim Uygula (3 seviyeli)
        const d1 = 1 - (line.discountRate1 || 0) / 100;
        const d2 = 1 - (line.discountRate2 || 0) / 100;
        const d3 = 1 - (line.discountRate3 || 0) / 100;
        
        const lineSubtotal = lineGross * d1 * d2 * d3;
        const lineDiscount = lineGross - lineSubtotal;
        // İhracat/İhraç Kayıtlı ise KDV 0
        const lineVat = isExport ? 0 : lineSubtotal * (line.vatRate / 100);
        
        line.lineTotal = Math.round((lineSubtotal + lineVat) * 100) / 100;

        grossTotal += lineGross;
        discountTotal += lineDiscount;
        vatTotal += lineVat;
    });

    const linesSubtotal = Math.round((grossTotal - discountTotal) * 100) / 100;
    
    // Fatura Geneli İndirim (Peşin ödeme vb.)
    const globalDiscountRate = invoice.value.discountRate || 0;
    const globalDiscountAmount = Math.round((linesSubtotal * (globalDiscountRate / 100)) * 100) / 100;
    const netSubtotal = Math.round((linesSubtotal - globalDiscountAmount) * 100) / 100;
    
    // KDV orantılaması (Genel indirim sonrası KDV matrahı düştüğü için)
    // İhracat durumunda vatTotal zaten 0
    const finalVatTotal = linesSubtotal > 0 ? Math.round((vatTotal * (netSubtotal / linesSubtotal)) * 100) / 100 : 0;

    return {
        grossTotal: Math.round(grossTotal * 100) / 100,
        discountTotal: Math.round((discountTotal + globalDiscountAmount) * 100) / 100,
        linesDiscount: Math.round(discountTotal * 100) / 100,
        globalDiscount: globalDiscountAmount,
        subtotal: linesSubtotal,
        netSubtotal: netSubtotal,
        vatTotal: finalVatTotal,
        total: Math.round((netSubtotal + finalVatTotal) * 100) / 100
    };
});

const totalAsWords = computed(() => {
    return numberToWords(totals.value.total, invoice.value.currency);
});

const exportToPDF = async () => {
    const element = document.getElementById('invoice-pdf-template');
    if (!element) return;

    try {
        toast.add({ severity: 'info', summary: 'Hazırlanıyor', detail: 'PDF oluşturuluyor...', life: 2000 });
        
        // Create a hidden iframe for isolation
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '210mm';
        iframe.style.height = '1000mm'; // Large enough for content
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) throw new Error('IFrame oluşturulamadı');

        // Copy styles - ONLY the PDF specific CSS
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = new URL('@/modules/finance/assets/css/invoice-pdf.css', import.meta.url).href;
        
        // Manual style injection to ensure no oklch leaks from global styles
        const styleReset = `
            body { margin: 0; padding: 0; background: white; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `;
        
        iframeDoc.head.innerHTML = `
            <style>${styleReset}</style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
        `;

        // Wait for styles to load is tricky with raw HTML, let's just clone the element's innerHTML
        // and apply the classes manually or use inline styles (which we already have in the template)
        iframeDoc.body.innerHTML = `
            <div id="pdf-content" style="width: 210mm; padding: 20mm; font-family: 'Arial', sans-serif; background: #ffffff; color: #000000;">
                ${element.innerHTML}
            </div>
        `;

        // Wait for images to load
        const images = iframeDoc.getElementsByTagName('img');
        await Promise.all(Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        }));

        // Additional delay for font/layout
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(iframeDoc.getElementById('pdf-content')!, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        // Cleanup
        document.body.removeChild(iframe);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        const account = financeStore.accounts.find((a: any) => a.id === invoice.value.accountId);
        const fileName = `${account?.name || 'Fatura'}_${invoice.value.invoiceNumber || 'No'}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
        
        pdf.save(fileName);
        
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'PDF kaydedildi', life: 3000 });
    } catch (error: any) {
        console.error('PDF Error:', error);
        toast.add({ severity: 'error', summary: 'Hata', detail: `PDF Hatası: ${error.message || 'Bilinmeyen hata'}`, life: 5000 });
    }
};

async function saveInvoice() {
    if (!invoice.value.accountId || !invoice.value.invoiceNumber || !invoice.value.warehouseId || invoice.value.lines.length === 0) {
        toast.add({ severity: 'warn', summary: 'Doğrulama', detail: 'Lütfen zorunlu alanları (Cari, Fatura No, Depo ve Kalemler) doldurun', life: 3000 });
        return;
    }

    const t = totals.value;
    const inv = Invoice.create({
        ...invoice.value,
        paymentType: invoice.value.paymentType,
        documentCategory: invoice.value.documentCategory,
        discountRate: invoice.value.discountRate || 0,
        projectId: invoice.value.projectId || undefined,  // PRJ entegrasyonu
        dueDate: invoice.value.dueDate || undefined,
        id: invoiceId || crypto.randomUUID(),
        companyId: authStore.user?.companyId || '',
        subtotal: t.subtotal,
        discountAmount: t.globalDiscount,
        vatTotal: t.vatTotal,
        total: t.total,
        paidAmount: invoice.value.paidAmount || 0,
        createdAt: invoice.value.createdAt || new Date(),
        updatedAt: new Date(),
        lines: invoice.value.lines.map((l) => ({
            ...l,
            invoiceId: invoiceId || ''
        }))
    });

    const result = await financeStore.saveInvoice(inv);
    if (result.success) {
        // --- Kaynak Belge Miktarlarını Güncelle ---
        if (invoice.value.sourceType && invoice.value.sourceIds && invoice.value.sourceIds.length > 0) {
            await salesStore.updateSourceQuantities(invoice.value.sourceType, invoice.value.sourceIds);
        }
        
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Fatura kaydedildi', life: 3000 });
        router.push('/finance/invoices');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
}

function goBack() {
    router.push('/finance/invoices');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-6 min-h-32 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="m-0 text-2xl font-medium">{{ isEdit ? 'Faturayı Düzenle' : 'Yeni Fatura' }}</div>
                
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-3">
                        <!-- Fatura Numarası -->
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-hashtag text-primary text-sm"></i>
                            <span class="text-xl font-mono font-bold text-primary leading-none">{{ invoice.invoiceNumber || '---' }}</span>
                        </div>

                        <!-- Fatura Türü Badge -->
                        <div class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-file text-surface-500 text-sm"></i>
                            <span class="text-base font-bold text-surface-700 dark:text-surface-300">
                                {{ documentCategories.find(c => c.value === invoice.documentCategory)?.label || '---' }}
                            </span>
                        </div>

                        <!-- Kaynak Belge Badge -->
                        <div v-if="invoice.sourceType" class="flex items-center gap-2 px-3 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <i class="pi pi-link text-blue-500 text-sm"></i>
                            <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Kaynak {{ invoice.sourceType === 'order' ? 'Sipariş' : 'Teklif' }} Bağlı
                            </span>
                        </div>

                        <!-- Döviz Kuru (Yabancı döviz ise) -->
                        <div v-if="isForeignCurrency" class="flex items-center gap-2 px-3 h-10 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                            <i class="pi pi-money-bill text-surface-500 text-sm"></i>
                            <div class="text-base font-medium leading-none">
                                1 {{ invoice.currency }} = <span class="font-bold text-primary">{{ invoice.exchangeRate.toFixed(4) }}</span> ₺
                            </div>
                        </div>
                    </div>

                    <!-- PDF ve Yazdır Butonları -->
                    <div class="flex items-center gap-2">
                        <Button icon="pi pi-file-pdf" label="PDF" severity="secondary" outlined size="small" @click="exportToPDF" />
                        <Button icon="pi pi-print" label="YAZDIR" severity="secondary" outlined size="small" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="flex flex-col gap-8 mb-6">
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label for="date" class="block font-bold mb-3">Tarih</label>
                            <DatePicker id="date" v-model="invoice.issueDate" dateFormat="dd.mm.yy" fluid />
                        </div>
                        <div>
                            <label for="type" class="block font-bold mb-3">Fatura Tipi</label>
                            <Select id="type" v-model="invoice.invoiceType" :options="invoiceTypes" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="category" class="block font-bold mb-3">Fatura Türü</label>
                            <Select id="category" v-model="invoice.documentCategory" :options="documentCategories" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="dueDate" class="block font-bold mb-3">Vade Tarihi</label>
                            <DatePicker id="dueDate" v-model="invoice.dueDate" dateFormat="dd.mm.yy" fluid />
                        </div>
                        <div>
                            <label for="warehouse" class="block font-bold mb-3">Depo (Varsayılan)</label>
                            <Select id="warehouse" v-model="invoice.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo Seçin" fluid />
                        </div>


                        <div>
                            <label for="account" class="block font-bold mb-3">Cari Hesap</label>
                            <Select id="account" v-model="invoice.accountId" :options="financeStore.accounts" optionLabel="name" optionValue="id" placeholder="Hesap Seçin" filter fluid />
                        </div>
                        <div>
                            <label for="project" class="block font-bold mb-3">Proje
                                <span class="text-surface-400 font-normal ml-1">(opsiyonel)</span>
                            </label>
                            <Select
                                id="project"
                                v-model="invoice.projectId"
                                :options="projectStore.projects"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Proje seçin"
                                showClear
                                filter
                                fluid
                            >
                                <template #option="{ option }">
                                    <span class="font-mono text-xs text-surface-400 mr-2">{{ option.code }}</span>
                                    {{ option.name }}
                                </template>
                            </Select>
                        </div>
                                                <div>
                            <label for="currency" class="block font-bold mb-3">Döviz</label>
                            <Select
                                id="currency"
                                v-model="invoice.currency"
                                :options="lookupStore.currencies"
                                optionLabel="code"
                                optionValue="code"
                                fluid
                            >
                                <template #option="slotProps">
                                    <span>
                                        <Tag severity="info" :value="slotProps.option.code" class="mr-2" />
                                        {{ slotProps.option.name }}
                                    </span>
                                </template>
                            </Select>
                        </div>
                        <div>
                            <label for="paymentType" class="block font-bold mb-3">Ödeme Tipi</label>
                            <Select id="paymentType" v-model="invoice.paymentType" :options="paymentTypes" optionLabel="label" optionValue="value" fluid />
                        </div>
                        <div>
                            <label for="discountRate" class="block font-bold mb-3">Genel İndirim %</label>
                            <InputNumber id="discountRate" v-model="invoice.discountRate" :min="0" :max="100" fluid />
                        </div>

                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-4">
                        <h6 class="font-normal m-0">Fatura Kalemleri</h6>
                        <Button id="btnAddLine" label="Kalem Ekle" icon="pi pi-plus" text size="small" @click="() => addLine(true)" />
                    </div>
                    <DataTable :value="invoice.lines" class="p-datatable-sm">
                        <Column header="Ürün" style="width: 25%">
                            <template #body="slotProps">
                                <div class="flex flex-col gap-1">
                                    <Select :ref="(el) => setProductSelectRef(el, slotProps.index)" v-model="slotProps.data.productId" :options="productStore.products" optionLabel="name" optionValue="id" @change="onProductChange(slotProps.data)" fluid filter />
                                    <div v-if="slotProps.data.productId" class="flex items-center gap-1.5 px-1">
                                        <i class="pi pi-box text-[10px]" :class="getStock(slotProps.data.productId, slotProps.data.warehouseId) > 0 ? 'text-green-500' : 'text-red-500'"></i>
                                        <span class="text-[10px] font-medium" :class="getStock(slotProps.data.productId, slotProps.data.warehouseId) > 0 ? 'text-green-600' : 'text-red-600'">
                                            Mevcut Stok: {{ getStock(slotProps.data.productId, slotProps.data.warehouseId) }} Adet
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </Column>
                        <Column header="Depo" style="width: 8%">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.warehouseId" :options="inventoryStore.warehouses" optionLabel="name" optionValue="id" placeholder="Depo" fluid />
                            </template>
                        </Column>
                        <Column header="Miktar" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.quantity" :min="1" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="Birim Fiyat" style="width: 8%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.unitPrice" :minFractionDigits="2" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="Döviz" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputText :value="slotProps.data.originalCurrency || '-'" readonly fluid class="text-right" />
                            </template>
                        </Column>
                        <Column header="KDV %" style="width: 6%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <Select v-model="slotProps.data.vatRate" :options="taxRates" optionLabel="label" optionValue="value" fluid />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel1 || 'İskonto 1'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate1" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel2 || 'İskonto 2'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate2" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column :header="settingsStore.settings?.discountLabel3 || 'İskonto 3'" style="width: 4%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputNumber v-model="slotProps.data.discountRate3" :min="0" :max="100" fluid inputClass="text-right" />
                            </template>
                        </Column>
                        <Column header="Toplam" style="width: 10%" headerClass="text-right" :pt="{ headerContent: { class: 'justify-end' } }">
                            <template #body="slotProps">
                                <InputText :value="slotProps.data.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })" readonly fluid class="font-bold text-right" @keydown.tab.exact.prevent="focusAddLineButton" />
                            </template>
                        </Column>
                        <Column style="width: 1%">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" text rounded tabindex="-1" @click="removeLine(slotProps.index)" />
                            </template>
                        </Column>
                    </DataTable>
                </div>

                <div class="flex flex-col lg:flex-row justify-between gap-6">
                    <div class="w-full lg:w-6/12">
                        
                        <Textarea id="notes" v-model="invoice.notes" rows="6" placeholder="Fatura notu ekleyin..." fluid />
                        
                        <div class="mt-3 p-3 bg-surface-50 dark:bg-surface-900 rounded-lg border border-dashed border-surface-300 dark:border-surface-600">
                            <div class="text-xs text-surface-500 uppercase font-bold mb-1">
                                {{ invoice.currency === 'TRY' ? 'Yazıyla Genel Toplam:' : 'Total in Words:' }}
                            </div>
                            <div class="text-sm font-medium italic text-primary">#{{ totalAsWords }}#</div>
                        </div>
                    </div>

                    <div class="w-full lg:w-6/12">
                        <div class="flex flex-col gap-4 p-4 bg-surface-50 dark:bg-surface-900 rounded">
                                <div class="flex justify-between">
                                    <span>{{ isExport ? 'Gross Total:' : 'Brüt Toplam:' }}</span>
                                    <span class="font-medium">{{ totals.grossTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between text-red-500">
                                    <span>{{ isExport ? 'Total Discount:' : 'İskonto Toplamı:' }}</span>
                                    <span class="font-medium">- {{ totals.discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between border-t pt-2 mt-1">
                                    <span>{{ isExport ? 'Subtotal:' : 'Ara Toplam:' }}</span>
                                    <span class="font-medium">{{ totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div v-if="invoice.discountRate > 0" class="flex justify-between text-red-500">
                                    <span>{{ isExport ? 'Global Discount' : 'Genel İndirim' }} (%{{ invoice.discountRate }}):</span>
                                    <span class="font-medium">- {{ totals.globalDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div v-if="invoice.discountRate > 0" class="flex justify-between font-bold border-t pt-2">
                                    <span>{{ isExport ? 'Net Subtotal:' : 'Net Ara Toplam:' }}</span>
                                    <span class="font-medium">{{ totals.netSubtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>{{ isExport ? 'VAT Total:' : 'KDV Toplam:' }}</span>
                                    <span class="font-medium">{{ totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <div class="flex justify-between text-medium font-semibold border-t pt-4">
                                    <span>{{ isExport ? 'Grand Total:' : 'Genel Toplam:' }}</span>
                                    <span>{{ totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ invoice.currency }}</span>
                                </div>
                                <!-- TRY karşılığı (yabancı döviz ise göster) -->
                                <div v-if="isForeignCurrency && totalsTRY" class="border-t pt-3 mt-1">
                                    <div class="text-surface-500 text-sm mb-1">{{ isExport ? 'TRY Equivalent' : 'TRY Karşılığı' }} (Kur: {{ invoice.exchangeRate }})</div>
                                    <div class="flex justify-between font-bold text-primary">
                                        <span>≈ {{ isExport ? 'Total TRY:' : 'TRY Toplam:' }}</span>
                                        <span>{{ totalsTRY.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            <!-- Butonlar -->
            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Kaydet" icon="pi pi-check" class="w-full" @click="saveInvoice" />
                </div>
            </div>
        </div>
    </div>

    <!-- PDF Tasarımı (Gizli) -->
    <!-- PDF Tasarımı (Minimalist Style) -->
    <!-- PDF Tasarımı (Minimalist Style) -->
    <div id="invoice-pdf-template" style="display: none; width: 210mm; min-height: 297mm; padding: 5mm; font-family: 'Helvetica', 'Arial', sans-serif; background: #ffffff; color: #444444; position: absolute; left: -9999px;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px;">
            <div style="flex: 1;">
                <div v-if="settingsStore.settings?.logoUrl" style="margin-bottom: 15px;">
                    <img :src="settingsStore.settings.logoUrl" style="max-height: 60px; max-width: 200px; object-fit: contain;" />
                </div>
                <div style="font-size: 14px; font-weight: 500; color: #111; margin-bottom: 5px;">{{ financeStore.accounts.find((a: any) => a.id === invoice?.accountId)?.name }}</div>
                <div style="font-size: 12px; line-height: 1.4; color: #777; max-width: 300px;">
                    {{ financeStore.accounts.find((a: any) => a.id === invoice?.accountId)?.address }}<br>
                    <span v-if="financeStore.accounts.find((a: any) => a.id === invoice?.accountId)?.taxNumber">VN/TC: {{ financeStore.accounts.find((a: any) => a.id === invoice?.accountId)?.taxNumber }}</span>
                </div>
            </div>
            <div style="flex: 1; text-align: right;">
                <div style="font-size: 32px; font-weight: 400; color: #1e293b; margin-bottom: 10px; line-height: 1;">FATURA</div>
                <div style="display: inline-block; text-align: left; font-size: 13px; color: #777;">
                    <div><span style="color: #64748b; width: 50px; display: inline-block;">No:</span> <span style="color: #111; font-weight: 400;">{{ invoice?.invoiceNumber || '---' }}</span></div>
                    <div><span style="color: #64748b; width: 50px; display: inline-block;">Tarih:</span> <span style="color: #111; font-weight: 400;">{{ invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString('tr-TR') : '---' }}</span></div>
                    <div><span style="color: #64748b; width: 50px; display: inline-block;">Tür:</span> <span style="color: #111; font-weight: 400;">{{ documentCategories.find(c => c.value === invoice?.documentCategory)?.label || '---' }}</span></div>
                </div>
            </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 11px;">
            <thead>
                <tr style="border-bottom: 2px solid #999;">
                    <th style="text-align: left; padding: 10px 5px; color: #111; width: 30px; font-weight: 400;">#</th>
                    <th style="text-align: left; padding: 10px 5px; color: #111; font-weight: 400;">Ürün</th>
                    <th style="text-align: center; padding: 10px 5px; color: #111; width: 50px; font-weight: 400;">Miktar</th>
                    <th style="text-align: right; padding: 10px 5px; color: #111; width: 70px; font-weight: 400;">Fiyat</th>
                    <th style="text-align: right; padding: 10px 5px; color: #111; width: 50px; font-weight: 400;">İsk. (%)</th>
                    <th style="text-align: right; padding: 10px 5px; color: #111; width: 70px; font-weight: 400;">İsk.Fiyat</th>
                    <th style="text-align: right; padding: 10px 5px; color: #111; width: 80px; font-weight: 400;">Net Tutar</th>
                    <th style="text-align: center; padding: 10px 5px; color: #111; width: 50px; font-weight: 400;">KDV %</th>
                    <th style="text-align: right; padding: 10px 5px; color: #111; width: 80px; font-weight: 400;">Toplam</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(line, index) in invoice?.lines" :key="line.id" style="border-bottom: 1px solid #f9f9f9;">
                    <td style="padding: 12px 5px; color: #777;">{{ index + 1 }}</td>
                    <td style="padding: 12px 5px; color: #111; font-weight: 500;">{{ productStore.products.find(p => p.id === line.productId)?.name }}</td>
                    <td style="text-align: center; padding: 12px 5px; color: #111;">{{ line.quantity }}</td>
                    <td style="text-align: right; padding: 12px 5px; color: #111;">{{ (line.unitPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</td>
                    <td style="text-align: right; padding: 12px 5px; color: #111;">{{ ((line.discountRate1 || 0) + (line.discountRate2 || 0) + (line.discountRate3 || 0)).toFixed(2) }}</td>
                    <td style="text-align: right; padding: 12px 5px; color: #111; font-weight: 500;">{{ ((line.lineTotal || 0) / (1 + (line.vatRate || 0) / 100) / (line.quantity || 1)).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</td>
                    <td style="text-align: right; padding: 12px 5px; color: #111;">{{ ((line.lineTotal || 0) / (1 + (line.vatRate || 0) / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</td>
                    <td style="text-align: center; padding: 12px 5px; color: #111;">{{ line.vatRate }}</td>
                    <td style="text-align: right; padding: 12px 5px; color: #111; font-weight: 500;">{{ (line.lineTotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Footer Section -->
        <div style="border-top: 2px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; align-items: stretch;">
            <!-- Left: Notes -->
            <div style="flex: 1.5; display: flex; flex-direction: column; justify-content: space-between;">
                <div v-if="invoice?.notes">
                    <div style="font-size: 16px; font-weight: 500; color: #444; margin-bottom: 10px;">Not</div>
                    <div style="font-size: 11px; color: #777; line-height: 1.6; max-width: 450px; white-space: pre-wrap;">
                        {{ invoice.notes }}
                    </div>
                </div>
                <div v-else></div> <!-- Spacer -->
                
                <div style="font-size: 12px; font-weight: 400; color: #444; margin-top: auto;">
                    # {{ totalAsWords }} #
                </div>
            </div>

            <!-- Right: Totals -->
            <div style="flex: 1; text-align: right;">
                <div style="display: inline-block; width: 100%; max-width: 220px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #777;">
                        <span>Ara Toplam:</span>
                        <span style="color: #444;">{{ (totals?.grossTotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #777;">
                        <span>Toplam İndirim:</span>
                        <span style="color: #444;">{{ (totals?.discountTotal + totals?.globalDiscount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #777;">
                        <span>Net Toplam:</span>
                        <span style="color: #444;">{{ (totals?.netSubtotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; color: #777;">
                        <span>Toplam KDV:</span>
                        <span style="color: #444;">{{ (totals?.vatTotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</span>
                    </div>
                    <div style="font-size: 24px; font-weight: 300; color: #111; margin-top: 10px;">
                        {{ invoice?.currency === 'TRY' ? '₺' : invoice?.currency }} {{ (totals?.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Gönderici Bilgisi (Şirket) -->
        <div style="margin-top: 60px; border-top: 1px solid #eee; padding-top: 15px;">
            <div style="font-size: 12px; color: #111; font-weight: 500;">{{ settingsStore.settings?.companyName }}</div>
            <div style="font-size: 11px; color: #777; margin-top: 2px; max-width: 600px;">
                {{ settingsStore.settings?.address }}
            </div>
            <div style="font-size: 11px; color: #777; margin-top: 2px;">
                <span v-if="settingsStore.settings?.taxNumber">VD: {{ settingsStore.settings?.taxOffice }} | VN: {{ settingsStore.settings?.taxNumber }}</span>
                <span v-if="settingsStore.settings?.phone" style="margin-left: 10px;">P: {{ settingsStore.settings?.phone }}</span>
            </div>
        </div>

        <!-- System Footer -->
        <div style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; font-size: 9px; color: #bbb; border-top: 1px solid #f5f5f5; padding-top: 10px;">
            Bu belge elektronik ortamda oluşturulmuştur. NOKTA
        </div>
    </div>
</template>




