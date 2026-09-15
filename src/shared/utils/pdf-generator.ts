import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFReportSummaryCard {
    label: string;
    value: string | number;
    color?: 'danger' | 'warning' | 'success' | 'info' | 'neutral';
}

export interface PDFReportFilter {
    label: string;
    value: string;
}

export interface PDFReportOptions {
    title: string;
    headers: string[];
    rows: any[][];
    alignments?: ('left' | 'center' | 'right')[]; // Custom alignments for each column
    fileName?: string;
    summaryCards?: PDFReportSummaryCard[];
    filters?: PDFReportFilter[];
}

export async function exportReportToPDF(options: PDFReportOptions): Promise<void> {
    const {
        title,
        headers,
        rows,
        alignments = [],
        fileName = 'rapor.pdf',
        summaryCards = [],
        filters = []
    } = options;

    try {
        // Create hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '210mm';
        iframe.style.height = '10px'; // starts small, will grow
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) throw new Error('PDF Iframe oluşturulamadı');

        // General print styling
        const styles = `
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 15mm;
                color: #1f2937;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #3b82f6;
                padding-bottom: 5mm;
                margin-bottom: 6mm;
            }
            .header-title {
                font-size: 20pt;
                font-weight: bold;
                color: #111827;
            }
            .header-subtitle {
                font-size: 10pt;
                color: #6b7280;
                margin-top: 1mm;
            }
            .header-meta {
                text-align: right;
                font-size: 9pt;
                color: #4b5563;
            }
            .filters-section {
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                padding: 3mm 4mm;
                margin-bottom: 6mm;
                font-size: 9pt;
            }
            .filters-title {
                font-weight: bold;
                margin-bottom: 1mm;
                color: #374151;
            }
            .filters-grid {
                display: grid;
                grid-template-cols: repeat(2, 1fr);
                gap: 2mm;
            }
            .filter-item span {
                font-weight: bold;
                color: #4b5563;
            }
            .cards-grid {
                display: grid;
                grid-template-cols: repeat(${Math.max(1, Math.min(4, summaryCards.length))}, 1fr);
                gap: 4mm;
                margin-bottom: 6mm;
            }
            .summary-card {
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 3mm 4mm;
                background-color: #ffffff;
            }
            .summary-card.danger { border-left: 4px solid #ef4444; }
            .summary-card.warning { border-left: 4px solid #f59e0b; }
            .summary-card.success { border-left: 4px solid #10b981; }
            .summary-card.info { border-left: 4px solid #3b82f6; }
            .summary-card.neutral { border-left: 4px solid #6b7280; }
            .card-label {
                font-size: 8pt;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .card-value {
                font-size: 14pt;
                font-weight: bold;
                margin-top: 1mm;
                color: #111827;
            }
            .card-value.danger { color: #dc2626; }
            .card-value.warning { color: #d97706; }
            .card-value.success { color: #059669; }
            .card-value.info { color: #2563eb; }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 9pt;
                margin-bottom: 10mm;
            }
            th {
                background-color: #f3f4f6;
                color: #374151;
                font-weight: bold;
                text-align: left;
                padding: 3mm 2mm;
                border-bottom: 2px solid #d1d5db;
                font-size: 8.5pt;
            }
            td {
                padding: 2.5mm 2mm;
                border-bottom: 1px solid #e5e7eb;
                color: #4b5563;
                word-break: break-word;
            }
            tr:nth-child(even) {
                background-color: #f9fafb;
            }
            .badge {
                display: inline-block;
                padding: 0.5mm 2mm;
                font-size: 7.5pt;
                font-weight: 600;
                border-radius: 9999px;
                text-transform: uppercase;
            }
            .badge.success { background-color: #d1fae5; color: #065f46; }
            .badge.danger { background-color: #fee2e2; color: #991b1b; }
            .badge.warning { background-color: #fef3c7; color: #92400e; }
            .badge.info { background-color: #dbeafe; color: #1e40af; }
            .badge.neutral { background-color: #f3f4f6; color: #374151; }
            .footer-info {
                text-align: center;
                font-size: 8pt;
                color: #9ca3af;
                margin-top: 10mm;
                border-top: 1px solid #f3f4f6;
                padding-top: 4mm;
            }
        `;

        // Build HTML content
        let htmlContent = `
            <div id="pdf-container">
                <div class="header-container">
                    <div>
                        <div class="header-title">${title}</div>
                        <div class="header-subtitle">Pyramid ERP Sistem Raporu</div>
                    </div>
                    <div class="header-meta">
                        <div><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</div>
                        <div><strong>Format:</strong> A4 Raporu</div>
                    </div>
                </div>
        `;

        // Filters list
        if (filters.length > 0) {
            htmlContent += `
                <div class="filters-section">
                    <div class="filters-title">Uygulanan Filtreler</div>
                    <div class="filters-grid">
            `;
            filters.forEach(filter => {
                htmlContent += `
                    <div class="filter-item"><span>${filter.label}:</span> ${filter.value}</div>
                `;
            });
            htmlContent += `
                    </div>
                </div>
            `;
        }

        // Summary Cards
        if (summaryCards.length > 0) {
            htmlContent += `<div class="cards-grid">`;
            summaryCards.forEach(card => {
                const colorClass = card.color || 'neutral';
                htmlContent += `
                    <div class="summary-card ${colorClass}">
                        <div class="card-label">${card.label}</div>
                        <div class="card-value ${colorClass}">${card.value}</div>
                    </div>
                `;
            });
            htmlContent += `</div>`;
        }

        // Table
        htmlContent += `
            <table>
                <thead>
                    <tr>
        `;
        headers.forEach((h, index) => {
            const align = alignments[index] || 'left';
            htmlContent += `<th style="text-align: ${align}">${h}</th>`;
        });
        htmlContent += `
                    </tr>
                </thead>
                <tbody>
        `;

        rows.forEach(row => {
            htmlContent += `<tr>`;
            row.forEach((cell, index) => {
                const align = alignments[index] || 'left';
                let cellHtml = '';

                // Handle styled values or badges
                if (typeof cell === 'object' && cell !== null && cell.isBadge) {
                    cellHtml = `<span class="badge ${cell.severity || 'neutral'}">${cell.text}</span>`;
                } else {
                    cellHtml = cell !== undefined && cell !== null ? String(cell) : '-';
                }

                htmlContent += `<td style="text-align: ${align}">${cellHtml}</td>`;
            });
            htmlContent += `</tr>`;
        });

        htmlContent += `
                </tbody>
            </table>
            <div class="footer-info">
                Bu rapor Pyramid ERP sistemi tarafından otomatik olarak üretilmiştir. © ${new Date().getFullYear()} Pyramid. All rights reserved.
            </div>
        </div>
        `;

        // Write to iframe document
        iframeDoc.head.innerHTML = `<style>${styles}</style>`;
        iframeDoc.body.innerHTML = htmlContent;

        // Auto-resize iframe height to match the whole rendered content so we can capture all rows
        const container = iframeDoc.getElementById('pdf-container');
        if (container) {
            iframe.style.height = `${container.scrollHeight + 100}px`;
        }

        // Slight wait for layout/styles to settle
        await new Promise(resolve => setTimeout(resolve, 350));

        // Generate canvas
        const canvas = await html2canvas(iframeDoc.getElementById('pdf-container')!, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // Remove the iframe
        document.body.removeChild(iframe);

        // Convert canvas to PDF using multi-page splitting
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 190; // width matching margins (A4 is 210mm wide, leaves 10mm margins on left/right)
        const marginX = 10;
        const marginY = 10;
        const pageHeight = 297; // A4 height
        const contentHeight = pageHeight - (2 * marginY); // 277mm for content
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = marginY;

        // Add first page
        pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
        heightLeft -= contentHeight;

        // Add subsequent pages if content overflows A4 height
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + marginY;
            pdf.addPage();
            // Negative position pushes the image up, displaying the next "slice" of the canvas
            pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
            heightLeft -= contentHeight;
        }

        pdf.save(fileName);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
}

export interface PDFReconciliationOptions {
    asOfDate: Date;
    type: 'balance' | 'babs';
    currency: string;
    account: {
        code?: string;
        name: string;
        taxOffice?: string;
        taxNumber?: string;
        phone?: string;
        email?: string;
        address?: string;
        authorizedPerson?: string;
        city?: string;
    };
    company: {
        name: string;
        taxOffice?: string;
        taxNumber?: string;
        phone?: string;
        email?: string;
        address?: string;
    };
    financials: {
        debitTotal: number;
        creditTotal: number;
        balance: number;
        balanceType: string;
        baCount: number;
        baTotal: number;
        bsCount: number;
        bsTotal: number;
    };
    fileName?: string;
}

export async function exportReconciliationToPDF(options: PDFReconciliationOptions): Promise<void> {
    const { asOfDate, type, currency, account, company, financials, fileName = 'cari-mutabakat-formu.pdf' } = options;

    const formattedDate = new Date(asOfDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedBalance = financials.balance.toLocaleString('tr-TR', { style: 'currency', currency });
    const isBabs = type === 'babs';
    const titleText = isBabs ? 'BA / BS FORM MUTABAKAT METNİ' : 'CARİ HESAP BAKİYE MUTABAKAT MEKTUBU';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '10px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('PDF Iframe oluşturulamadı');

    const styles = `
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 15mm;
            color: #111827;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px double #1e3a8a;
            padding-bottom: 4mm;
            margin-bottom: 6mm;
        }
        .company-name {
            font-size: 16pt;
            font-weight: bold;
            color: #1e3a8a;
        }
        .company-sub {
            font-size: 9pt;
            color: #4b5563;
            margin-top: 1mm;
        }
        .meta {
            text-align: right;
            font-size: 9pt;
            color: #374151;
        }
        .title-box {
            text-align: center;
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 3mm;
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 6mm;
            letter-spacing: 0.5px;
        }
        .account-box {
            border: 1px solid #e2e8f0;
            background-color: #fafafa;
            border-radius: 4px;
            padding: 4mm;
            margin-bottom: 6mm;
            font-size: 9.5pt;
        }
        .account-grid {
            display: grid;
            grid-template-cols: repeat(2, 1fr);
            gap: 2mm 4mm;
        }
        .letter-body {
            font-size: 10pt;
            line-height: 1.6;
            color: #1f2937;
            margin-bottom: 6mm;
            text-align: justify;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            margin-bottom: 6mm;
        }
        .data-table th {
            background-color: #1e293b;
            color: #ffffff;
            font-weight: 600;
            padding: 2.5mm 3mm;
            border: 1px solid #0f172a;
            text-align: left;
        }
        .data-table td {
            padding: 2.5mm 3mm;
            border: 1px solid #cbd5e1;
        }
        .confirmation-option {
            border: 1px dashed #94a3b8;
            padding: 4mm;
            margin-bottom: 8mm;
            font-size: 9.5pt;
            background-color: #f8fafc;
        }
        .signatures {
            display: grid;
            grid-template-cols: repeat(2, 1fr);
            gap: 6mm;
            margin-top: 10mm;
        }
        .sig-box {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 4mm;
            height: 35mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .sig-header {
            font-weight: bold;
            font-size: 9pt;
            color: #334155;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2mm;
        }
        .sig-footer {
            text-align: center;
            font-size: 8pt;
            color: #64748b;
        }
    `;

    let htmlContent = `
        <div id="pdf-container">
            <div class="header">
                <div>
                    <div class="company-name">${company.name}</div>
                    <div class="company-sub">${company.address || ''} | Tel: ${company.phone || '-'}</div>
                    <div class="company-sub">Vergi Dairesi: ${company.taxOffice || '-'} | VKN/TCKN: ${company.taxNumber || '-'}</div>
                </div>
                <div class="meta">
                    <div><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</div>
                    <div><strong>Mutabakat Tarihi:</strong> ${formattedDate}</div>
                </div>
            </div>

            <div class="title-box">${titleText}</div>

            <div class="account-box">
                <div style="font-weight: bold; font-size: 10.5pt; margin-bottom: 2mm; color: #0f172a;">
                    SAYIN: ${account.name} ${account.code ? `(${account.code})` : ''}
                </div>
                <div class="account-grid">
                    <div><strong>Yetkili / İlgili:</strong> ${account.authorizedPerson || '-'}</div>
                    <div><strong>Telefon:</strong> ${account.phone || '-'}</div>
                    <div><strong>Vergi Dairesi:</strong> ${account.taxOffice || '-'}</div>
                    <div><strong>VKN / TCKN:</strong> ${account.taxNumber || '-'}</div>
                    <div style="grid-column: span 2;"><strong>Adres:</strong> ${account.address || '-'} ${account.city ? `/ ${account.city}` : ''}</div>
                </div>
            </div>

            <div class="letter-body">
                Şirketimiz nezdindeki cari hesabınızın <strong>${formattedDate}</strong> tarihi itibariyle detayları aşağıda çıkarılmıştır. 
                Kayıtlarımızın karşılaştırarak mutabık olup olmadığınızı aşağıdaki bölümü onaylayarak 
                tarafımıza kaşeli ve imzalı olarak iletmenizi rica ederiz.
            </div>

            ${!isBabs ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Açıklama / Hesap Özeti</th>
                        <th style="text-align: right">Tutar (${currency})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Toplam Borç (Borç Hareketleri Toplamı)</td>
                        <td style="text-align: right">${financials.debitTotal.toLocaleString('tr-TR', { style: 'currency', currency })}</td>
                    </tr>
                    <tr>
                        <td>Toplam Alacak (Alacak Hareketleri Toplamı)</td>
                        <td style="text-align: right">${financials.creditTotal.toLocaleString('tr-TR', { style: 'currency', currency })}</td>
                    </tr>
                    <tr style="font-weight: bold; background-color: #f1f5f9;">
                        <td>Net Bakiye (Bakiye Yönü: ${financials.balanceType})</td>
                        <td style="text-align: right; font-size: 11pt; color: #1e3a8a;">${formattedBalance}</td>
                    </tr>
                </tbody>
            </table>
            ` : `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Form Türü</th>
                        <th style="text-align: center">Belge / Fatura Adedi</th>
                        <th style="text-align: right">Toplam Matrah (${currency})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Form BA</strong> (Tarafınızdan Yapılan Mal/Hizmet Alımları)</td>
                        <td style="text-align: center">${financials.baCount} Adet</td>
                        <td style="text-align: right; font-weight: bold">${financials.baTotal.toLocaleString('tr-TR', { style: 'currency', currency })}</td>
                    </tr>
                    <tr>
                        <td><strong>Form BS</strong> (Tarafınıza Yapılan Mal/Hizmet Satışları)</td>
                        <td style="text-align: center">${financials.bsCount} Adet</td>
                        <td style="text-align: right; font-weight: bold">${financials.bsTotal.toLocaleString('tr-TR', { style: 'currency', currency })}</td>
                    </tr>
                </tbody>
            </table>
            `}

            <div class="confirmation-option">
                <div style="margin-bottom: 2mm;"><strong>[ &nbsp; ] BAKİYEMİZ MUTABIKTIR.</strong></div>
                <div><strong>[ &nbsp; ] BAKİYEMİZ MUTABIK DEĞİLDİR.</strong> (Fark Tutarı: .............................. ${currency})</div>
                <div style="font-size: 8.5pt; color: #64748b; margin-top: 2mm;">
                    * İtiraz durumunda lütfen ekstre detaylarınızı tarafımıza e-posta ile iletiniz.
                </div>
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <div class="sig-header">MUTABAKATI GÖNDEREN FİRMA</div>
                    <div style="text-align: center; font-size: 9pt; font-weight: bold;">${company.name}</div>
                    <div class="sig-footer">Kaşe & İmza</div>
                </div>
                <div class="sig-box">
                    <div class="sig-header">MUTABAKATI ONAYLAYAN CARİ HESAP</div>
                    <div style="text-align: center; font-size: 9pt; font-weight: bold;">${account.name}</div>
                    <div class="sig-footer">Kaşe & İmza / Tarih: ..../..../20....</div>
                </div>
            </div>
        </div>
    `;

    iframeDoc.head.innerHTML = `<style>${styles}</style>`;
    iframeDoc.body.innerHTML = htmlContent;

    const container = iframeDoc.getElementById('pdf-container');
    if (container) iframe.style.height = `${container.scrollHeight + 100}px`;

    await new Promise(resolve => setTimeout(resolve, 350));

    const canvas = await html2canvas(iframeDoc.getElementById('pdf-container')!, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
    });

    document.body.removeChild(iframe);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 10, 10, 190, (canvas.height * 190) / canvas.width);
    pdf.save(fileName);
}

