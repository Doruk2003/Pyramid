<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { useExchangeRateStore } from '@/modules/finance/application/exchange-rate.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import '@/modules/finance/assets/css/invoice-pdf.css';
import { CurrencyConversionService } from '@/modules/finance/domain/currency-conversion.service';
import { Invoice, type DocumentCategory, type InvoiceType, type PaymentType } from '@/modules/finance/domain/invoice.entity';
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
import type { InvoiceFormModel, InvoiceLineForm } from './invoice-form.types';
import InvoiceFormHeader from './InvoiceFormHeader.vue';
import InvoiceFormLines from './InvoiceFormLines.vue';
import InvoiceFormSummary from './InvoiceFormSummary.vue';
import InvoiceFormPdfTemplate from './InvoiceFormPdfTemplate.vue';

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

// InvoiceLineForm ve InvoiceFormModel tipleri invoice-form.types.ts'e taşındı

const stockWarning = ref({
    visible: false,
    title: '',
    message: '',
    severity: 'warn' as 'warn' | 'error',
    canContinue: true,
    lastQuantity: 1,
    targetLine: null as InvoiceLineForm | null
});

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
        // Otomatik Fatura No Oluştur — DB'den güvenli şekilde al (race condition riski yok)
        if (settingsStore.settings) {
            const serial = settingsStore.settings.invoiceSerial || 'ABC';
            const startingNo = settingsStore.settings.invoiceStartingNumber || 1;

            // DB'ye doğrudan sorgu: son seri numarasını parse edip +1 yapar.
            // Eski yöntem (store.invoices.filter().length) race condition'a yol açıyordu.
            const nextNumber = await financeStore.fetchNextInvoiceNumber(serial, startingNo);
            if (nextNumber) {
                invoice.value.invoiceNumber = nextNumber;
            }
            // nextNumber null ise alan boş kalır; kullanıcı manuel girebilir.
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

        // Ayarlardan varsayılan depoyu uygula (henüz depo atanmamışsa)
        if (!invoice.value.warehouseId && settingsStore.settings) {
            const isPurchaseType = invoice.value.invoiceType === 'purchase' || invoice.value.invoiceType === 'return_purchase';
            invoice.value.warehouseId = isPurchaseType
                ? (settingsStore.settings.defaultPurchaseWarehouseId || '')
                : (settingsStore.settings.defaultSalesWarehouseId || '');
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
const isForeignCurrency = computed<boolean>(() => !!invoice.value.currency && invoice.value.currency !== 'TRY');
const isExport = computed<boolean>(() => invoice.value.documentCategory === 'export' || invoice.value.documentCategory === 'export_registered');

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

// Alt bileşen ref — openLastProductSelect() çağırmak için
const linesComponent = ref<InstanceType<typeof InvoiceFormLines> | null>(null);

function getStock(productId: string, warehouseId?: string) {
    if (!productId) return 0;
    const targetWarehouse = warehouseId || invoice.value.warehouseId;
    if (!targetWarehouse) return 0;
    
    const balance = inventoryStore.balances.find(
        (b) => b.productId === productId && b.warehouseId === targetWarehouse
    );
    return balance ? balance.balance : 0;
}

function checkStock(line: InvoiceLineForm) {
    if (!line.productId) return;
    
    const product = productStore.products.find(p => p.id === line.productId);
    if (!product) return;

    const warehouseId = line.warehouseId || invoice.value.warehouseId;
    const currentStock = getStock(line.productId, warehouseId);
    const requestedQty = line.quantity;
    const minStock = product.minStock || 0;
    const remainingStock = currentStock - requestedQty;

    if (remainingStock < 0) {
        const allowNegative = settingsStore.settings?.allowNegativeStock ?? false;
        stockWarning.value = {
            visible: true,
            title: 'Negatif Stok Uyarısı',
            message: `${product.name} ürünü için seçilen miktar stok bakiyesini negatife düşürüyor. \n\nMevcut Stok: ${currentStock} \nİstenen Miktar: ${requestedQty} \nKalan Bakiye: ${remainingStock}`,
            severity: allowNegative ? 'warn' : 'error',
            canContinue: allowNegative,
            lastQuantity: requestedQty,
            targetLine: line
        };
    } else if (remainingStock < minStock) {
        stockWarning.value = {
            visible: true,
            title: 'Kritik Stok Seviyesi',
            message: `${product.name} ürünü için kritik stok eşiğine ulaşıldı veya altına düşüldü. \n\nMevcut Stok: ${currentStock} \nİstenen Miktar: ${requestedQty} \nKalan Bakiye: ${remainingStock} \nKritik Eşik: ${minStock}`,
            severity: 'warn',
            canContinue: true,
            lastQuantity: requestedQty,
            targetLine: line
        };
    }
}

function closeStockWarning(confirm: boolean) {
    if (!confirm && stockWarning.value.targetLine) {
        // Eğer kullanıcı vazgeçerse miktarı 1'e veya eski haline çekebiliriz? 
        // Kullanıcı genelde miktarı düzeltmek ister.
    }
    stockWarning.value.visible = false;
}

function addLine(autoOpen = false) {
    invoice.value.lines.push({
        id: crypto.randomUUID(),
        productId: '',
        warehouseId: invoice.value.warehouseId,
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
    // InvoiceFormLines bileşeni dropdown açmayı kendi yönetir
    if (autoOpen) {
        nextTick(() => linesComponent.value?.openLastProductSelect());
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
        
        // Stok Kontrolü
        checkStock(line);
        
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
        <InvoiceFormHeader
            :isEdit="isEdit"
            :invoiceNumber="invoice.invoiceNumber"
            :invoiceType="invoice.invoiceType"
            :documentCategory="invoice.documentCategory"
            :sourceType="invoice.sourceType"
            :isForeignCurrency="isForeignCurrency"
            :currency="invoice.currency"
            :exchangeRate="invoice.exchangeRate"
            @export-pdf="exportToPDF"
        />

        <div class="card">
            <div class="flex flex-col gap-4 mb-4">
                <div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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

                <InvoiceFormLines
                    ref="linesComponent"
                    :lines="invoice.lines"
                    :warehouses="inventoryStore.warehouses"
                    :products="productStore.products"
                    :taxRates="taxRates"
                    :discountLabel1="settingsStore.settings?.discountLabel1 || 'İskonto 1'"
                    :discountLabel2="settingsStore.settings?.discountLabel2 || 'İskonto 2'"
                    :discountLabel3="settingsStore.settings?.discountLabel3 || 'İskonto 3'"
                    @remove-line="removeLine"
                    @product-changed="onProductChange"
                    @quantity-blurred="checkStock"
                >
                    <template #add-button>
                        <Button id="btnAddLine" label="Kalem Ekle" icon="pi pi-plus" text size="small" @click="() => addLine(true)" />
                    </template>
                </InvoiceFormLines>


                <InvoiceFormSummary
                    :totals="totals"
                    :totalsTRY="totalsTRY"
                    :isForeignCurrency="isForeignCurrency"
                    :isExport="isExport"
                    :currency="invoice.currency"
                    :exchangeRate="invoice.exchangeRate"
                    :discountRate="invoice.discountRate"
                    :notes="invoice.notes"
                    :totalAsWords="totalAsWords"
                    @update:notes="invoice.notes = $event"
                    @update:discountRate="invoice.discountRate = $event"
                />
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

    <InvoiceFormPdfTemplate
        :invoice="invoice"
        :totals="totals"
        :totalAsWords="totalAsWords"
        :settings="settingsStore.settings"
        :accounts="financeStore.accounts"
        :products="productStore.products"
    />

    <!-- Stok Uyarı Dialog -->
    <Dialog v-model:visible="stockWarning.visible" :header="stockWarning.title" modal :style="{ width: '450px' }" :closable="stockWarning.severity === 'warn'">
        <div class="flex items-center gap-4 py-4">
            <i :class="stockWarning.severity === 'error' ? 'pi pi-exclamation-circle text-red-500' : 'pi pi-exclamation-triangle text-amber-500'" style="font-size: 3rem"></i>
            <div class="flex flex-col gap-2">
                <p class="whitespace-pre-line m-0 leading-relaxed">{{ stockWarning.message }}</p>
                <div v-if="stockWarning.severity === 'error'" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm mt-2">
                    <i class="pi pi-info-circle mr-2"></i>
                    Sistem ayarları gereği negatif stokla işlem yapılmasına izin verilmemektedir. Lütfen miktarı azaltın veya stok girişi yapın.
                </div>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-end gap-2">
                <Button v-if="stockWarning.severity === 'warn'" label="Anladım, Devam Et" icon="pi pi-check" severity="warning" @click="closeStockWarning(true)" />
                <Button v-else label="Tamam" icon="pi pi-check" severity="danger" @click="closeStockWarning(false)" />
            </div>
        </template>
    </Dialog>
</template>




