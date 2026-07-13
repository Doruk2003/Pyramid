<script setup lang="ts">
// Gizli PDF şablonu — html2canvas tarafından yakalanır.
// Tüm veriler prop olarak gelir; iç state tutmaz.
import type { InvoiceFormModel, InvoiceTotals } from './invoice-form.types';

interface Settings {
    logoUrl?: string;
    companyName?: string;
    address?: string;
    taxNumber?: string;
    taxOffice?: string;
    phone?: string;
}

interface AccountSummary {
    id: string;
    name: string;
    address?: string | null;
    taxNumber?: string;
}

interface ProductSummary {
    id: string;
    name: string;
}

interface Props {
    invoice: InvoiceFormModel;
    totals: InvoiceTotals;
    totalAsWords: string;
    settings: Settings | null;
    accounts: AccountSummary[];
    products: ProductSummary[];
}

const props = defineProps<Props>();

const documentCategoryLabels: Record<string, string> = {
    domestic: 'Yurtiçi Faturası',
    export: 'İhracat Faturası',
    export_registered: 'İhraç Kayıtlı Fatura'
};

function getAccount() {
    return props.accounts.find((a) => a.id === props.invoice?.accountId);
}

function getProductName(productId: string) {
    return props.products.find((p) => p.id === productId)?.name ?? '';
}

function fmt(n: number) {
    return (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
}
</script>

<template>
    <!-- PDF Tasarımı (Gizli) — html2canvas bu elementi yakalar -->
    <div
        id="invoice-pdf-template"
        style="display: none; width: 210mm; min-height: 297mm; padding: 5mm; font-family: 'Helvetica', 'Arial', sans-serif; background: #ffffff; color: #444444; position: absolute; left: -9999px;"
    >
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px;">
            <div style="flex: 1;">
                <div v-if="settings?.logoUrl" style="margin-bottom: 15px;">
                    <img :src="settings.logoUrl" style="max-height: 60px; max-width: 200px; object-fit: contain;" />
                </div>
                <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">SAYIN</div>
                <div style="font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 6px;">{{ getAccount()?.name }}</div>
                <div style="font-size: 11px; line-height: 1.5; color: #64748b; max-width: 320px;">
                    {{ getAccount()?.address }}<br />
                    <span v-if="getAccount()?.taxNumber" style="color: #475569; font-weight: 500;">VN/TC: {{ getAccount()?.taxNumber }}</span>
                </div>
            </div>
            <div style="flex: 1; text-align: right;">
                <div style="font-size: 24px; font-weight: 400; color: #1e293b; margin-bottom: 12px; letter-spacing: 2px;">FATURA</div>
                <div style="display: inline-block; text-align: left; font-size: 11px; color: #64748b;">
                    <div style="margin-bottom: 4px;"><span style="color: #94a3b8; width: 45px; display: inline-block;">No:</span> <span style="color: #475569;">{{ invoice?.invoiceNumber || '---' }}</span></div>
                    <div style="margin-bottom: 4px;"><span style="color: #94a3b8; width: 45px; display: inline-block;">Tarih:</span> <span style="color: #475569;">{{ invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString('tr-TR') : '---' }}</span></div>
                    <div style="margin-bottom: 4px;"><span style="color: #94a3b8; width: 45px; display: inline-block;">Tür:</span> <span style="color: #475569;">{{ documentCategoryLabels[invoice?.documentCategory] || '---' }}</span></div>
                </div>
            </div>
        </div>

        <!-- Kalem Tablosu -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9px;">
            <thead>
                <tr style="border-bottom: 1.5px solid #cbd5e1;">
                    <th style="text-align: left; padding: 4px 5px 6px 5px; color: #1e293b; width: 30px; font-weight: 600;">#</th>
                    <th style="text-align: left; padding: 4px 5px 6px 5px; color: #1e293b; font-weight: 600;">Ürün</th>
                    <th style="text-align: center; padding: 4px 5px 6px 5px; color: #1e293b; width: 50px; font-weight: 600;">Miktar</th>
                    <th style="text-align: right; padding: 4px 5px 6px 5px; color: #1e293b; width: 70px; font-weight: 600;">Fiyat</th>
                    <th style="text-align: center; padding: 4px 5px 6px 5px; color: #1e293b; width: 50px; font-weight: 600;">İsk. (%)</th>
                    <th style="text-align: right; padding: 4px 5px 6px 5px; color: #1e293b; width: 80px; font-weight: 600;">Net Tutar</th>
                    <th style="text-align: center; padding: 4px 5px 6px 5px; color: #1e293b; width: 50px; font-weight: 600;">KDV %</th>
                    <th style="text-align: right; padding: 4px 5px 6px 5px; color: #1e293b; width: 80px; font-weight: 600;">Toplam</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(line, index) in invoice?.lines" :key="line.id">
                    <td style="padding: 4px 5px; color: #777; vertical-align: middle;">{{ index + 1 }}</td>
                    <td style="padding: 4px 5px; color: #1e293b; vertical-align: middle;">{{ getProductName(line.productId) }}</td>
                    <td style="text-align: center; padding: 4px 5px; color: #1e293b; vertical-align: middle;">{{ line.quantity }}</td>
                    <td style="text-align: right; padding: 4px 5px; color: #1e293b; vertical-align: middle;">{{ fmt(line.unitPrice || 0) }}</td>
                    <td style="text-align: center; padding: 4px 5px; color: #1e293b; vertical-align: middle;">{{ ((line.discountRate1 || 0) + (line.discountRate2 || 0) + (line.discountRate3 || 0)).toFixed(2) }}</td>
                    <td style="text-align: right; padding: 4px 5px; color: #1e293b; vertical-align: middle;">{{ fmt((line.lineTotal || 0) / (1 + (line.vatRate || 0) / 100)) }}</td>
                    <td style="text-align: center; padding: 4px 5px; color: #1e293b; vertical-align: middle;">{{ line.vatRate }}</td>
                    <td style="text-align: right; padding: 4px 5px; color: #1e293b; vertical-align: middle;">{{ fmt(line.lineTotal || 0) }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Footer: Not + Toplamlar -->
        <div style="border-top: 1.5px solid #cbd5e1; padding-top: 30px; display: flex; justify-content: space-between; align-items: stretch;">
            <div style="flex: 1.5; display: flex; flex-direction: column; justify-content: space-between;">
                <div v-if="invoice?.notes">
                    <div style="font-size: 16px; font-weight: 500; color: #444; margin-bottom: 10px;">Not</div>
                    <div style="font-size: 11px; color: #777; line-height: 1.6; max-width: 450px; white-space: pre-wrap;">{{ invoice.notes }}</div>
                </div>
                <div v-else></div>
                <div style="font-size: 11px; font-weight: 400; color: #64748b; margin-top: auto; font-style: italic;">
                    # {{ totalAsWords }} #
                </div>
            </div>
            <div style="flex: 1; text-align: right;">
                <div style="display: inline-block; width: 100%; max-width: 220px;">
                    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; color: #777;">
                        <span>Ara Toplam:</span><span style="color: #444;">{{ fmt(totals?.grossTotal || 0) }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; color: #777;">
                        <span>Toplam İndirim:</span><span style="color: #444;">{{ fmt(totals?.discountTotal || 0) }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; color: #777;">
                        <span>Net Toplam:</span><span style="color: #444;">{{ fmt(totals?.netSubtotal || 0) }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 6px; color: #777;">
                        <span>Toplam KDV:</span><span style="color: #444;">{{ fmt(totals?.vatTotal || 0) }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 500; color: #111; margin-top: 4px; border-top: 1px solid #1e293b; padding-top: 6px;">
                        <span>GENEL TOPLAM:</span>
                        <span>
                            <span style="font-size: 10px; margin-right: 2px; font-weight: 400;">{{ invoice?.currency === 'TRY' ? '₺' : invoice?.currency }}</span>
                            {{ fmt(totals?.total || 0) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Şirket Bilgisi -->
        <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 2;">
                    <div style="font-size: 13px; color: #1e293b; font-weight: 500; margin-bottom: 5px;">{{ settings?.companyName }}</div>
                    <div style="font-size: 11px; color: #64748b; line-height: 1.5; max-width: 500px;">{{ settings?.address }}</div>
                </div>
                <div style="flex: 1; text-align: right; font-size: 11px; color: #64748b; line-height: 1.6;">
                    <div v-if="settings?.taxNumber">
                        <span style="color: #94a3b8;">VD:</span> {{ settings?.taxOffice }}<br />
                        <span style="color: #94a3b8;">VN:</span> {{ settings?.taxNumber }}
                    </div>
                    <div v-if="settings?.phone" style="margin-top: 4px;">
                        <span style="color: #94a3b8;">Tel:</span> {{ settings?.phone }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Sistem Notu -->
        <div style="position: absolute; bottom: 10mm; left: 15mm; right: 15mm; text-align: center; font-size: 9px; color: #94a3b8; font-style: italic;">
            Bu belge elektronik ortamda oluşturulmuştur.
        </div>
    </div>
</template>
