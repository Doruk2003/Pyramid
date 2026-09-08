# 🛠️ Finans Modülü Adım Adım Geliştirme & Aksiyon Planı

**Proje:** Pyramid ERP  
**Hedef:** Finans & Muhasebe Modülünü Kurumsal Seviyeye Taşımak  
**Tarih:** 8 Eylül 2026  
**Dosya Amacı:** Adım adım sırayla uygulanacak geliştirme görev takibi.

---

## 📌 Nasıl Kullanılacak?
Bu doküman, finans modülündeki geliştirmeleri aşamalı ve sırayla yapabilmemiz için hazırlanmıştır. Her bir adımı sırayla bana komut vererek (`"Faz 1 Adım 1.1'i uygulayalım"` gibi) başlatabilirsiniz. Tamamlanan adımların işaretleri güncellenecektir.

---

## 🔴 FAZ 1: Acil Düzeltmeler & Güvenlik/Hassasiyet İyileştirmeleri (Kısa Vadeli Buglar)

### `[ ]` Adım 1.1: Finansal Hesaplamalarda Decimal Precision (Kuruş Hassasiyeti)
* **Amaç:** Floating point yuvarlama hatalarını ve satır/dip KDV kuruş kaymalarını önlemek.
* **Yapılacaklar:**
  * `src/modules/finance/domain/invoice.entity.ts` içerisindeki `calculateTotals` mantığına kuruş yuvarlama güvencesi kazandırılması.
  * Satır KDV tutarları ile dip fatura KDV tutarı arasındaki 1 kuruşluk farkların giderilmesi.
  * `CurrencyConversionService` fonksiyonlarının hassasiyet kontrollerinin güçlendirilmesi.

### `[ ]` Adım 1.2: Tahsilatlı/Ödemeli Fatura İptali Güvenlik Kısıtı
* **Amaç:** İçinde ödemesi veya tahsilatı olan faturaların doğrudan iptal edilerek bakiyelerin bozulmasını engellemek.
* **Yapılacaklar:**
  * `SupabaseFinanceRepository.updateInvoiceStatus` metoduna kontrol eklenmesi: Faturaya bağlı tamamlanmış `payments` kaydı varsa iptale izin verilmemesi, kullanıcıya "Önce ilgili tahsilat/ödemeyi iptal ediniz" uyarısı dönmesi.
  * DB seviyesinde trigger/RPC kısıtlaması eklenmesi.

### `[ ]` Adım 1.3: Ödeme & Tahsilatlarda Otomatik Kur Farkı Hesaplama
* **Amaç:** Dövizli faturaların TL ödemelerinde fatura tarihi ile ödeme tarihi arasındaki kur değişiminden doğan tutarın hesaba işlenmesi.
* **Yapılacaklar:**
  * `Payment` kaydı girilirken fatura kuru ile ödeme kuru karşılaştırılarak oluşan kur farkının (Kar/Zarar) tespit edilmesi.
  * Otomatik Kur Farkı işlemi/dekontu kaydının oluşturulması.

---

## 🟡 FAZ 2: Multi-Currency & Cari Hesap Derinleştirmesi (Orta Vadeli)

### `[x]` Adım 2.1: Çapraz Dövizli (Multi-Currency) Cari Bakiye ve Ekstre
* **Amaç:** Cari hesapların bakiyelerini sadece TL değil, TRY, USD, EUR bazında ayrı ayrı (Sub-ledger) takip etmek.
* **Yapılacaklar:**
  * Para birimi kırılımlı `account_currency_balances` veritabanı view'ı eklendi.
  * `get_account_statement` RPC fonksiyonuna `p_currency` parametresi eklenerek döviz bazlı orijinal ekstre çekimi sağlandı.
  * Cari Bakiye Raporu ve Cari Ekstre ekranlarına Para Birimi (`TRY`, `USD`, `EUR`, `GBP`) filtre seçeneği eklendi.


### `[x]` Adım 2.2: Gelişmiş Çek & Senet Portföy Yönetimi Modülü
* **Amaç:** Çek ve senetlerin sadece bir ödeme tipi metni olmaktan çıkarılıp tam yaşam döngülü modüle dönüştürülmesi.
* **Yapılacaklar:**
  * `cheques_notes` veritabanı tablosu ve RLS güvenlik politikaları eklendi ([20260908190000_cheque_note_module.sql](file:///d:/Pyramid/supabase/migrations/20260908190000_cheque_note_module.sql)).
  * `ChequeNote` domain entity'si, repository interface'i ve Supabase altyapı kodları oluşturuldu.
  * Durum yaşam döngüsü (*Portföyde -> Ciro Edildi -> Takasta -> Teminatta -> Tahsil Edildi -> Ödendi -> Karşılıksız/Protestolu -> İade*) kurgulandı.
  * `ChequeNoteList.vue` ve `ChequeNoteForm.vue` ekranları eklendi, `/finance/cheques-notes` rotaları ve sol menü bağlantısı bağlandı.


### `[x]` Adım 2.3: KDV Tevkifatı ve Gelişmiş Vergi Oranları
* **Amaç:** Türkiye yasal mevzuatına uygun tevkifatlı fatura kesebilmek.
* **Yapılacaklar:**
  * `invoices.withholding_total`, `invoice_lines.withholding_rate` ve `withholding_amount` veritabanı sütunları ile `save_invoice_with_lines` RPC güncellemesi eklendi ([20260908200000_vat_withholding_support.sql](file:///d:/Pyramid/supabase/migrations/20260908200000_vat_withholding_support.sql)).
  * `Invoice` entity ve `calculateTotals` metoduna Tevkifat (2/10, 3/10, 5/10, 7/10, 9/10, 10/10) hesaplama ve Net Ödenecek KDV/Genel Toplam mantığı eklendi.
  * Fatura kalemi girme ekranına Tevkifat seçeneği, özet paneline `KDV Tevkifatı (-)` satırı ve PDF şablonuna Tevkifat gösterimi eklendi.


---

## 🟢 FAZ 3: e-Fatura / e-Dönüşüm Şema Uyumlaştırılması

### `[ ]` Adım 3.1: GİB UBL-TR Meta Veri Şemasının Eklenmesi
* **Amaç:** İleride e-Fatura entegratörüne bağlanabilmek için DB şemasını hazır hale getirmek.
* **Yapılacaklar:**
  * `invoices` tablosuna: `gib_scenario` (TICARETFATURA, TEMELFATURA, IHRACAT), `gib_status`, `tax_exemption_code` (Vergi Muafiyet Kodu: 301, 351 vb.) alanlarının eklenmesi.
  * `accounts` tablosuna: TCKN/VKN ayrımı, e-Fatura mükellefiyet sorgulama durum alanı eklenmesi.

### `[ ]` Adım 3.2: e-Fatura UBL-TR XML Oluşturucu Servisi
* **Amaç:** Kesilen faturayı standart GİB UBL-TR 1.2 XML formatına dönüştüren pure domain servisi yazılması.

---

## 🔵 FAZ 4: Genel Muhasebe (Tek Düzen Hesap Planı - GL) Katmanı

### `[ ]` Adım 4.1: Tek Düzen Hesap Planı (Chart of Accounts) Tablosu & Yönetimi
* **Amaç:** 100, 102, 120, 320, 391, 191, 600, 621 gibi ana ve alt muhasebe kodlarının sisteme eklenmesi.
* **Yapılacaklar:**
  * `chart_of_accounts` tablosunun ve varsayılan TDHP ağacının veritabanına yüklenmesi.

### `[ ]` Adım 4.2: Otomatik Yevmiye Fişi (Journal Entry) Kaydı (Double-Entry)
* **Amaç:** Kesilen her faturanın ve yapılan her ödemenin arka planda borç/alacak eşitliği olan Yevmiye Fişi üretmesi.
* **Yapılacaklar:**
  * `journal_entries` ve `journal_lines` tablolarının oluşturulması.
  * Fatura onaylandığında otomatik *120 Borçlu / 600-391 Alacaklı* yevmiye fişinin oluşturulması.

### `[ ]` Adım 4.3: Mali Yıl Kapanış & Devir İşlemleri (Period Closing)
* **Amaç:** Yıl sonlarında hesapların kapatılarak yeni yıla Devir Fişi (Opening Journal Entry) ile başlanması.

---

## 🟣 FAZ 5: Banka Entegrasyonları & Onay İş Akışları

### `[ ]` Adım 5.1: Banka Ekstre / MT940 İthalatı & Otomatik Eşleştirme
* **Amaç:** Banka MT940 veya CAMT.053 ekstre dosyasını yükleyip gelen ödemeleri otomatik cari ile eşleştirmek.

### `[ ]` Adım 5.2: Fatura & Ödeme Çok Kademeli Onay İş Akışı (Approval Workflow)
* **Amaç:** Belirli tutarı geçen alış/satış/tediye kayıtlarının yönetici onayına düşmesi altyapısı.

---

## 🚀 Sonraki Adım:
Hangi faz ve adımdan başlamak isterseniz (Örneğin: **"Faz 1 Adım 1.1 ile başlayalım"**), bana bildirmeniz yeterlidir. Başladığımız adımı uygulayıp listede tamamlandı `[x]` olarak işaretleyeceğiz!
