# 📊 Finans & Muhasebe Modülü Kapsamlı Analiz Raporu

**Proje:** Pyramid ERP  
**Modül:** Finans & Muhasebe (FIN)  
**Tarih:** 8 Eylül 2026  
**Hazırlayan:** Antigravity AI Code Assistant  

---

## 1. 🔍 Giriş ve Mevcut Mimarinin Değerlendirilmesi

Finans modülü, Pyramid ERP sisteminin cari hesap dengesini, faturalandırma süreçlerini, nakit akışını ve finansal raporlamayı yöneten merkez modülüdür. 

### Mevcut Mimari Yapı
* **Domain & Application Katmanı:** Domain-Driven Design (DDD) prensiplerine uygun olarak zengin entity yapısı (`Invoice`, `Account`, `Payment`, `CashRegister`, `Project`) ve immutability esaslı domain servisleri (`CurrencyConversionService`) kurulmuştur.
* **Veritabanı Katmanı (Supabase / PostgreSQL):**
  * `invoices`, `invoice_lines`, `accounts`, `payments`, `cash_registers` tabloları ve RLS (Row Level Security) izolasyonu.
  * Atomik fatura kaydı için `save_invoice_with_lines` RPC fonksiyonu.
  * Cari bakiye hesaplaması için `account_balances` view'ı ve ekstre için `get_account_statement` RPC fonksiyonu.
* **Öne Çıkan Başarılı Kurgular:**
  * Fatura kaydında atomik veritabanı işlemleri (RPC) ile yarış durumlarının (race condition) önlenmesi.
  * Seri ve numara üretiminde veritabanı seviyesinde dizi kontrolü.
  * Soft-delete mekanizması ile yasal fatura ve cari verilerinin korunması.

---

## 2. 🚀 Modern ERP Uygulamalarında Olması Gereken / Geliştirilmesi Gereken İşlevler

Mevcut finans modülü şu an **Ön Muhasebe (Cari / Fatura / Kasa)** seviyesindedir. Kurumsal seviyede modern bir ERP deneyimi sunabilmek için aşağıdaki işlevlerin eklenmesi gerekmektedir:

### 2.1. Genel Muhasebe & Tek Düzen Hesap Planı (TDHP)
* **Hesap Planı (Chart of Accounts):** 100 Kasa, 102 Banka, 120 Alıcılar, 320 Satıcılar, 391 Hesaplanan KDV, 191 İndirilecek KDV gibi ana ve alt hesap kod yapısı.
* **Yevmiye Fişleri (Journal Entries):** Mahsup, Tahsil, Tediye fişi oluşturma ve çift taraflı kayıt (Double-Entry Bookkeeping) altyapısı.
* **Mali Tablolar:** Bilanço, Gelir Tablosu ve Defter-i Kebir / Yevmiye Defteri dökümleri.

### 2.2. e-Dönüşüm Entegrasyonları (GİB e-Fatura / e-Arşiv / e-İrsaliye)
* **e-Fatura / e-Arşiv Gönderim & Alım:** GİB Özel Entegratör API bağlantıları ile UBL-TR 1.2 formatında XML üretimi, dijital imzalama, GİB durum sorgulama (Draft -> Sent -> Approved -> Cancelled).
* **Gelen e-Fatura İthalatı:** Tedarikçilerden gelen e-Faturaların otomatik olarak sisteme Alış Faturası olarak aktarılması ve cari eşleştirme.

### 2.3. Banka Entegrasyonu & Otomatik Mutabakat (Open Banking / Bank Reconciliation)
* **Online Banka Ekstreleri:** Bankalardan MT940 / CAMT.053 formatında veya API üzerinden anlık hesap hareketlerinin çekilmesi.
* **Otomatik Eşleştirme:** Gelen havale/EFT işlemlerinin açıklama veya tutar bazlı cari hesap ve açık faturalarla otomatik eşleştirilmesi.

### 2.4. Gelişmiş Çek & Senet Portföy Yönetimi
* **Çek/Senet Yaşama Döngüsü:** Çek/senet işlemleri şu an sadece bir ödeme yöntemi string'idir. Gerçek ERP'de Çek Bordroları, Ciranta takibi, Bankaya Takasa Veriliş, Portföyde, Tahsil Edildi, Karşılıksız / Protestolu ve İade statü geçişleri yönetilmelidir.

### 2.5. Yasal Vergi Kurguları (KDV Tevkifatı, Stopaj, ÖTV)
* **KDV Tevkifatı:** 5/10, 9/10 oranlarında KDV tevkifatlı fatura düzenleme ve tevkifatlı KDV raporu.
* **Serbest Meslek & Makbuz Stopajı:** %20 stopaj kesintili gider pusulası ve serbest meslek makbuzu yönetimi.

### 2.6. Kur Farkı Faturası & Dönem Sonu Revalüasyon (FX Valuation)
* Dövizli carilerin ve kasaların dönem sonu TCMB kurları ile yeniden değerlenmesi, otomatik Kur Farkı Kar/Zarar tespiti ve tek tıkla Kur Farkı Faturası / Fişi oluşturulması.

### 2.7. Onay İş Akışları (Approval Workflows)
* Belirli tutarların (örneğin 50.000 TL üzeri) üzerindeki fatura ve tediye ödemelerinde yönetici onay mekanizması (Pending Approval -> Approved).

---

## 3. ⚠️ Kısa Vadede Sorun Oluşturabilecek Kodlama ve Kurgu Hataları

### 🔴 3.1. Kuruş Yuvarlama ve Floating Point Hassasiyet Riskleri
* **Kod Yeri:** `src/modules/finance/domain/invoice.entity.ts` (`calculateTotals`)
* **Hata:** JavaScript native `Math.round(val * 100) / 100` kullanımı ondalık hassasiyet kayıplarına (`0.1 + 0.2 = 0.30000000000000004`) yol açabilir.
* **Risk:** Çok satırlı ve bileşik indirimli faturalarda dip KDV ile satır KDV toplamları arasında 1-2 kuruşluk uyumsuzluklar oluşabilir ve fatura toplamı yasal fatura matrahıyla çelişebilir.
* **Çözüm:** Finansal hesaplamalar için `Big.js` veya `Decimal.js` kütüphanesi kullanılmalı veya tüm hesaplamalar kuruş cinsinden (integer/cents) yapılmalıdır.

### 🔴 3.2. Kur Çevrimli Ödemelerde Otomatik Kur Farkı Oluşmaması
* **Kod Yeri:** `src/modules/finance/infra/supabase-finance.repository.ts` (`savePayment`)
* **Hata:** Fatura kesildiği tarihteki kur (ör. 1 USD = 30 TL, Fatura: 100 USD = 3.000 TL) ile ödemenin yapıldığı tarihteki kur (ör. 1 USD = 35 TL, Ödeme: 100 USD = 3.500 TL) arasında 500 TL kur farkı doğmaktadır. Ancak `savePayment` sadece `amount` kaydetmekte, 500 TL'lik kur farkını cari hesaba kar/zarar hareketi olarak işleyen otomatik mekanizma bulunmamaktadır.
* **Risk:** Müşterinin döviz borcu kapanmış görünürken TL cari ekstresinde 500 TL bakiye açık kalacaktır.

### 🔴 3.3. Fatura İptal (Cancelled) Durumunda Tahsilat/Ödeme Kilidi Olmaması
* **Kod Yeri:** `src/modules/finance/infra/supabase-finance.repository.ts` (`updateInvoiceStatus`)
* **Hata:** İçerisinde ödemesi veya tahsilatı olan bir fatura `cancelled` statüsüne çekildiğinde veritabanı ilgili ödeme kayıtlarını engellememekte veya uyarmamaktadır.
* **Risk:** İptal edilen faturaya bağlı payments kayıtları aktif kaldığı için cari bakiye ve kasa bakiyesi hatalı hesaplanacaktır.

### 🔴 3.4. Stok Hareketleri - Fatura İptali Arasındaki Entegrasyon Bağı
* Fatura 'issued' durumuna geçtiğinde stok düşmekte/girmektedir (`invoice_warehouse_sync` trigger). Ancak fatura 'cancelled' yapıldığında stok hareketinin otomatik ters kayıtla sıfırlanıp sıfırlanmadığı tüm senaryolarda (iade faturaları dahil) sıkı bir integration test ile doğrulanmalıdır.

---

## 4. 🛑 Uzun Vadede Oluşabilecek Mimari, Performans ve Yasal Riskler

### 💣 4.1. Çift Taraflı Kayıt (Double-Entry GL) Olmaması (En Büyük Mimari Risk)
* **Risk:** Şu anda cari bakiyeler `account_balances` view'ı üzerinden `invoices` ve `payments` tablolarının anlık `SUM()` birleştirmesi ile hesaplanmaktadır.
* **Sonuç:**
  1. Veri hacmi 100.000+ faturaya ulaştığında cari bakiye ve ekstre sorguları yavaşlayacaktır.
  2. Finansal verinin tarihsel immutability (değiştirilemezlik) güvencesi yoktur. Geçmişe dönük bir fatura değiştirildiğinde tüm cari bakiyeler sessizce değişir. Muhasebe standartlarında (IFRS/GAAP) geçmiş dönem kapatıldıktan sonra veri değiştirilemez, ancak düzeltme fişi kesilebilir.

### 💣 4.2. Mali Yıl Kapanışı ve Dönem Devri (Period Closing) Eksikliği
* **Risk:** Veritabanında mali yıl kapatma (örneğin 2026 yılı kapanış devri) kurgusu yoktur.
* **Sonuç:** Sistem kurulduğu ilk günden itibaren tüm verileri tek bir havuzda toplar. 5 yıl sonra cari ekstre istendiğinde sistem 5 yıllık tüm faturaları baştan sona taramak zorunda kalır.

### 💣 4.3. Çapraz Dövizli (Multi-Currency) Cari Bakiye Takibi Eksikliği
* **Risk:** `account_balances` sorgusunda dövizli faturalar kaydolduğu andaki `exchange_rate` ile çarpılıp doğrudan TL tutar olarak toplanmaktadır.
* **Sonuç:** Bir carinin hem USD hem EUR hem TRY hareketi varsa, cari ekstresinde tek bir TL bakiye görünmektedir. Ancak ticari hayatta müşteri hesabı döviz bazlı takip edilir (Örn: "Müşterinin 5.000 USD alacağı var"). Döviz bazlı ayrı sub-ledger tutulmaması cari mutabakatlarını imkansız hale getirecektir.

### 💣 4.4. E-Fatura UBL-TR Veri Şeması Uyumsuzluğu
* **Risk:** `invoices` ve `invoice_lines` tablolarında e-Fatura zorunlu alanları (Vergi Muafiyet Sebebi Kodları, GTIP Kodları, İrsaliye Numarası & Tarihi bağlantıları, TCKN/VKN Ayrımı, Şahıs Şirketi Ad/Soyad alanları) eksiktir.
* **Sonuç:** İleride e-Fatura entegrasyonu yapılmak istendiğinde veri tabanı şemasında büyük kırıcı değişiklikler (breaking changes) yapmak gerekecektir.

---

## 5. 🗺️ Önerilen Yol Haritası ve Çözüm Tavsiyeleri

### 🎯 Kısa Vadeli Aksiyonlar (1 - 4 Hafta)
1. **Decimal Precision Kütüphanesi:** Frontend ve Backend finansal hesaplamalarında kuruş farkı hatalarını önlemek için `decimal.js` veya benzeri hassas kütüphaneye geçilmesi.
2. **Fatura İptal Validasyonu:** İçinde tamamlanmış ödeme bulunan faturaların iptal edilmesini engelleyen veritabanı kısıtı (Check Constraint / Trigger) eklenmesi.
3. **Tahsilat/Ödeme Kur Farkı Modülü:** Dövizli ödemelerde fatura kuru ile ödeme kuru arasındaki farkın otomatik "Kur Farkı İşlemi" olarak kaydedilmesi.

### 🚀 Orta Vadeli Aksiyonlar (1 - 3 Ay)
1. **Çoklu Dövizli Cari Ekstre:** Cari bakiye yapısının para birimi bazında ayrıştırılması (`TRY Balance`, `USD Balance`, `EUR Balance`).
2. **Çek/Senet Portföy Modülü:** Çek/senetlerin fiziki durumunu (Portföyde, Ciro, Takas, Tahsil) takip eden bordro altyapısının kurulması.
3. **e-Fatura Şema Hazırlığı:** Veritabanına E-Fatura/E-Arşiv için gerekli UBL-TR meta verilerinin (VKN/TCKN, Senaryo, Muafiyet Kodları) eklenmesi.

### 🏛️ Uzun Vadeli Aksiyonlar (3 - 6 Ay)
1. **Genel Muhasebe Katmanı (GL):** Tek Düzen Hesap Planı ve Yevmiye Fişi (Journal Entry) mimarisine geçiş yapılarak Ön Muhasebe verilerinin arka planda otomatik muhasebeleşmesi.
2. **Mali Yıl Devri (Period Closing):** Yıl sonlarında hesapların kapatılıp yeni yıla açılış/devir fişleri ile başlanması altyapısının kurulması.
3. **Banka & GİB Entegrasyonları:** e-Fatura entegratör API ve Banka MT940 otomatik ekstre alım entegrasyonlarının tamamlanması.

---
*Bu rapor Pyramid ERP Finans Modülü mimari kalitesini artırmak ve gelecekteki yasal/teknik riskleri önlemek amacıyla hazırlanmıştır.*
