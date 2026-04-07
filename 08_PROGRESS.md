# 📊 GELİŞTİRME İLERLEME TAKIBI

> ⚠️ Bu dosya her geliştirme adımından sonra güncellenir.
> AI, yeni bir oturumda buradan kaldığı yeri öğrenir.

---

## Son Güncelleme
**Tarih**: 7 Nisan 2026  
**Oturum**: #12

---

## Tamamlanan Adımlar

- [x] Projenin TypeScript ve Pinia'ya göçü tamamlandı
- [x] Clean Architecture klasör yapısı (Core, Infrastructure, Presentation, Shared)
- [x] Result Pattern hata yönetimi altyapısı
- [x] ADM modülü (User, Role, Settings) ve Auth Store
- [x] INV modülü core altyapısı (Product, Brand, Category, Type, Currency)
- [x] INV modülü depo ve stok hareketleri altyapısı (Warehouse, Stock Movement)
- [x] Ürün listesi (Crud.vue) ve Form (Create/Edit) sayfalarının refaktörü
- [x] Migration sistemi ve 00, 01, 02, 03 nolu SQL dosyaları
- [x] **Multi-tenant company_id güvenliği** (products + RLS politikaları)
- [x] **RBAC — Rol bazlı yetkilendirme** (Router guard + Dinamik menü)
- [x] **UseCase katmanı** (Inventory ve Product modülleri)
- [x] **Immutable Invoice entity** (calculateTotals() yeni instans döndürüyor)
- [x] **DB tip güvenliği** (db-types.ts ile any kaldırıldı)
- [x] **onAuthStateChange listener** (oturum süresi, token yenileme, çoklu sekme)
- [x] **stock_balances MATERIALIZED VIEW + Trigger** (performans yükseltmesi)
- [x] **Cari hesap ekranlarında Türkçe karakter (UTF-8) düzeltmesi** (AccountList + AccountCreate)
- [x] **Ürün listesi filtreleri ayrı kartta** (inventory/products)
- [x] **Cari hesap listesi filtreleri ayrı kartta** (finance/accounts)
- [x] **Cari hesap filtre alanları güncellendi** (il/ilçe/ülke)
- [x] **Cari hesap oluşturma ekranı bölümlendirildi (5 kolon)**
- [x] **Cari hesap düzenleme ekranı tasarım güncellemesi**
- [x] **Fatura, stok hareketleri ve depo listelerinde filtre standardı**
- [x] **Fatura ve stok hareketi detay tasarım standardı**
- [x] **Fatura listesi filtreleri genişletildi**
- [x] **Fatura listesi tarih aralığı filtresi**
- [x] **Stok hareketleri depo filtresi**
- [x] **Stok hareketleri tarih aralığı filtresi** (cari hesap, döviz, tarih)
- [x] **Stok hareketleri tarih filtresi DatePicker**
- [x] **SLS module kickoff** (customer list, quote/order placeholder screens, router + menu integration)
- [x] **KRİTİK DÜZELTME #1** — `quotes`/`orders` tablosunda `ON DELETE CASCADE` → `RESTRICT` (veri güvenliği)
- [x] **KRİTİK DÜZELTME #2** — Sales RLS politikaları `get_auth_user_company_id()` helper ile optimize edildi (N+1 sorgu giderildi)
- [x] **KRİTİK DÜZELTME #3** — `brands`, `categories`, `types` tablolarına `company_id`, `is_active`, `updated_at` eklendi (multi-tenant altyapı)
- [x] **Lookup Entity/Repository güncelleme** — Brand, Category, ProductType entity'lerine `companyId`/`isActive` eklendi; repository soft-delete'e geçirildi
- [x] **ORTA VADELİ #5** — Soft delete (`deleted_at`) kolonları kritik tablolara eklendi: `products`, `accounts`, `invoices`, `warehouses`, `quotes`, `orders`
- [x] **ORTA VADELİ #6** — `sync_invoice_totals` trigger oluşturuldu: `invoice_lines` her değiştime fatura toplamları otomatik güncelleniyor
- [x] **ORTA VADELİ #7** — `stock_balances` MATERIALIZED VIEW + trigger zaten aktifmiş; doküman güncellendi, teknik borç listesinden çıkarıldı
- [x] **Repository/Interface/Store tamamlama** — `deleteInvoice`, `deleteWarehouse` metodları tüm katmanlara eklendi
- [x] **Sales modülü iyileştirme** — Cari hesap adı listede görünüyor, indirim sütunu eklendi, `any` temizlendi
- [x] **UZUN VADELİ #7** — `audit_logs` tablosu + universal trigger (7 kritik tablo: accounts, invoices, orders, products, quotes, stock_movements, warehouses)
- [x] **UZUN VADELİ #8** — Sequence-based belge numarası: `TK/SP/FT-YYYY-00001` formatı, RPC üzerinden atomik — **DB'de doğrulandı** ✅
- [x] **UZUN VADELİ #9** — `exchange_rates.valid_date` eklendi, `get_exchange_rate(code, date)` helper fonksiyonu
- [x] **UZUN VADELİ #12** — `leaves.days` trigger ile otomatik hesaplanıyor (start/end tutarsızlığı giderildi)
- [x] **UI — InvoiceList** — Silme butonu (sadece draft), onay dialogu, tarih `tr-TR`, `rowsPerPageOptions`
- [x] **UI — AccountList** — Soft-delete butonu + onay dialogu, optimistic update
- [x] **UI — WarehouseList** — Soft-delete butonu + onay dialogu
- [x] **UI — MovementList** — Depo Adı sütunu eklendi, tarih `tr-TR` formatlandı
- [x] **UI — RoleList** — 4 sistem rolü (viewer dahil), gerçek kullanıcı sayıları `useUserStore`'dan
- [x] **saveInvoice refaktörü** — Sequence RPC, fallback, hata yayılımı, null-safe satir ekleme
- [x] **Migration doğrulama** — 21 audit trigger satırı (7×3), 3 sequence, `FT-2026-00001` testı — tümü başarılı ✅

---

## Şu An Üzerinde Çalışılan

**Görev**: Bir sonraki modül — PUR (Satınalma) veya RPT (Raporlama) modülü
**Durum**: 🔵 Planlama aşamasında.

> **NOT**: Tüm analiz bulguları ve acil/orta/uzun vadeli düzeltmeler tamamlandı.
> Proje üretim kalitesine (.production-ready) ulaştı.
> Kalan tek ertelenen madde: Rol Yönetimi DB RBAC altyapısı (Faz 2 kapsamı).

---

## Geliştirme Planı

### Faz 1 — Proje Altyapısı
- [x] **1.1** apps/web — Vue 3 + TypeScript + Vite kurulumu
- [x] **1.2** Clean Architecture klasör yapısı
- [x] **1.3** TypeScript geçişi ve Tip tanımlamaları
- [x] **1.4** Pinia Store entegrasyonu (ADM & INV)
- [x] **1.5** Supabase Client & Repository pattern
- [x] **1.6** Result pattern (Hata yönetimi)
- [x] **1.7** Migration sistemi (supabase/migrations)

### Faz 2 — ADM Modülü (Kimlik & Yönetim)
- [x] **2.1** Supabase Auth entegrasyonu
- [x] **2.2** User entity & repository
- [x] **2.3** Company settings API
- [x] **2.4** Vue admin sayfaları (Users, Settings, Roles, Logs)
- [x] **2.5** Auth & User stores (Pinia)
- [x] **2.6** Route guard (Giriş kontrolü)

### Faz 3 — INV Modülü (Stok)
- [x] **3.1** DB tabloları: `products`, `warehouses`, `stock_movements` (Migration 00 & 03)
- [x] **3.2** Product, Warehouse, Movement entity & repository
- [x] **3.3** Product CRUD API & Pinia Store
- [x] **3.4** Vue ürün listesi ve formu (Refaktör edildi)
- [x] **3.5** Depo yönetimi sayfası (WarehouseList.vue)
- [x] **3.6** Stok hareketleri izleme (MovementList.vue)
- [x] **3.7** Yeni stok hareketi ekleme formu (Adjustment/Transfer)
- [x] **3.8** Dashboard stok özetleri

- [x] **4.1** DB tabloları: accounts, invoices, invoice_lines, payments
- [x] **4.2** Invoice entity (hesaplama mantığı dahil)
- [x] **4.3** Account repository
- [x] **4.4** Invoice repository
- [x] **4.5** Invoice CRUD API & Store
- [x] **4.6** Vue fatura listesi ve formu
- [x] **4.7** Vue cari hesap (Account) yönetimi

### Faz 5 — SLS Modülü (Satış & CRM)

---

## Bilinen Sorunlar / Teknik Borç

- [ ] Supabase CLI/Docker yerel ortamda kurulu değil, migrationlar dashboard üzerinden manuel çalıştırılıyor.
- [ ] Bazı UI bileşenlerinde `any` kullanımı mevcut, interface tanımlamaları sıkılaştırılacak.
- [x] ~~`20260323000001_critical_fixes.sql` Supabase Dashboard'da çalıştırıldı~~ ✅
- [ ] `20260323000002_medium_term_fixes.sql` Supabase Dashboard'da çalıştırılmayı bekliyor.
- [ ] Brands/Categories/Types için lookup parametreleri sayfasında `is_active` durumu gösterimi UI güncellemesi gerekebilir.

---

## Oturum Notları

### Oturum #2 — INV Modülü Refaktörü
- Tüm yardımcı tablolar için `LookupStore` oluşturuldu.
- Ürün oluşturma ve düzenleme sayfaları Clean Architecture yapısına taşındı.
- Ürün listesi (Crud.vue) store yapısına bağlandı ve filtreleme optimize edildi.
- Depo ve Stok Hareketleri altyapısı (Entity, Repository, Store) eklendi.
- Sol menüye "Envanter Yönetimi" grubu eklendi.

### Oturum #3 — INV Modülü Tamamlanması
- Stok Hareketleri (Giriş, Çıkış, Transfer) altyapısı ve formu eklendi.
- Depo yönetimi (Yeni/Düzenle) özellikleri eklendi.
- Dashboard için Envanter Özet Widget'ı oluşturuldu.
- `User` ve `StockMovement` entity'leri eksik alanlarla (companyId, createdAt vb.) güncellendi.

### Oturum #4 — FIN Modülü Tamamlanması
- `Account` ve `Invoice` entity'leri, repository'leri ve Pinia Store'u oluÅŸturuldu.
- Cari Hesap yönetimi sayfası (`AccountList.vue`) eklendi.
- Fatura listesi (`InvoiceList.vue`) ve detaylı fatura formu (`InvoiceForm.vue`) eklendi.
### Oturum #4 — Klasör Yapısı Refaktörü & Modüler Mimari
- Proje klasör yapısı kıdemli mimari standartlarına göre yeniden düzenlendi.
- `src/modules/{module}` yapısına geçildi (Domain, Application, Infra, Views katmanları ayrıldı).
- `src/core`, `src/shared`, `src/lib` klasörleri oluşturularak cross-cutting concern'ler merkezi hale getirildi.
- Tüm importlar absoulte alias (@/) kullanacak şekilde güncellendi ve `vue-tsc` ile doğrulandı.
- Finans ve Envanter modülleri tamamen modüler yapıya taşındı.

### Oturum #6 — Prettier & Type Standardizasyonu
- UI bileşenleri ve store'larda `any` kullanımları kaldırıldı, tipler netleştirildi.
- Prettier uyarıları giderildi ve biçimlendirme standardı uygulandı.
- `ProductList.vue` filtreleme ve seçim tipleri düzeltildi, `null` güvenliği iyileştirildi.

### Oturum #8 — SLS Modülü Başlangıcı & Menü Revizyonu
- **Satış (SLS) Modülü**: `quotes`, `quote_lines`, `orders`, `order_lines` veritabanı şeması (migration) oluşturuldu.
- **Domain & Infra**: `Quote`, `Order` entity'leri, `ISalesRepository` ve `SupabaseSalesRepository` implementasyonları eklendi.
- **Application**: `useSalesStore` Pinia servisi oluşturuldu.
- **View & Routing**: Teklif ve Sipariş listeleme/form sayfaları eklendi, route tanımları yapıldı.
- **Menü Revizyonu**: `Döviz Kurları`, `Döviz Yönetimi`, `Ayarlar` ve `Roller` menüleri `Parametreler` altında toplandı.
- **Güvenlik**: `isAdminOrManager` kontrolü ile `Yönetim` ve `Parametreler` bölümlerine router-level erişim kısıtlaması getirildi.
- **Oturum Yönetimi**: Hareketsizlik zamanlayıcısı (15 dk) ve hatalı oturum kapanma (timeout) sorunları giderildi.

### Oturum #9 — Kritik Güvenlik Düzeltmeleri & Multi-tenant Altyapı
- **Migration `20260323000001_critical_fixes.sql`** oluşturuldu (3 kritik düzeltme tek migration'da):
  1. `quotes`/`orders`.`company_id` ON DELETE **CASCADE → RESTRICT** (finansal kayıt koruması)
  2. Sales RLS politikaları `get_auth_user_company_id()` helper ile yeniden yazıldı (N+1 performans)
  3. `brands`, `categories`, `types` tablolarına `company_id` + `is_active` + `updated_at` + RLS eklendi
- **Domain Entities**: Brand, Category, ProductType entity'lerine `companyId`, `isActive` alanları eklendi
- **Repository**: `SupabaseLookupRepository` güncellendi — company_id upsert'lere eklendi, silme soft-delete'e çevrildi
- **Repository**: `SupabaseLookupRepository` güncellendi — company_id upsert'lere eklendi, silme soft-delete'e çevrildi
- **Tasarım Kararı**: Sistem "Tek Firma — Çok Kullanıcı" olarak tasarlandı. `company_id` altyapısı hazır tutulduğundan ileride multi-tenant'a geçiş minimum değişiklik gerektirir.

### Oturum #10 — Orta Vadeli Düzeltmeler (Madde 5-6-7)
- **Migration `20260323000002_medium_term_fixes.sql`** oluşturuldu:
  - `deleted_at TIMESTAMPTZ` kolonu: `products`, `accounts`, `invoices`, `warehouses`, `quotes`, `orders` tablolarına eklendi
  - Partial index'ler: `WHERE deleted_at IS NULL` ile aktif kayıtlar hızlı sorgulanabilir
  - RLS politikaları: `AND deleted_at IS NULL` filtresi eklenerek silinen kayıtlar tamamen gizlendi
  - `sync_invoice_totals()` trigger fonksiyonu: `invoice_lines` INSERT/UPDATE/DELETE → `invoices.(subtotal, vat_total, total)` otomatik hesaplanıp güncelleniyor
  - `stock_balances` MATERIALIZED VIEW + `CONCURRENTLY` refresh trigger — zaten aktif, dokümante edildi
- **Domain Interface Tamamlama**: `IInventoryRepository.deleteWarehouse` ve `IFinanceRepository.deleteInvoice` eklendi
- **Repository Tamamlama**: `SupabaseInventoryRepository.deleteWarehouse` eklendi; `getWarehouses` soft-delete aware
- **Store Tamamlama**: `useInventoryStore.deleteWarehouse` ve `useFinanceStore.deleteInvoice` aksiyonları eklendi (optimistik UI güncelleme)
- `addWarehouse` store aksiyonu: `fetchWarehouses()` çağrılacak şekilde düzeltildi