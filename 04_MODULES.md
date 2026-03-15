# 🧩 ERP MODÜLLERİ — Detaylı Spec

## Modül Geliştirme Sırası

```
Faz 1 (MVP):    ADM → FIN → INV → SLS
Faz 2:          PUR → HR  → RPT
Faz 3:          MFG → Entegrasyonlar
```

---

## ADM — Sistem Yönetimi ⚙️

### Özellikler
- [ ] Şirket kurulumu & ayarlar
- [ ] Kullanıcı yönetimi (CRUD)
- [ ] Rol & yetki tanımlama (RBAC)
- [ ] Lisans/plan yönetimi
- [ ] Sistem logları
- [ ] E-posta şablon yönetimi

### API Endpoints
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/company/settings
PUT    /api/company/settings
```

### Vue Sayfaları
```
/admin/users          → Kullanıcı listesi
/admin/users/new      → Yeni kullanıcı
/admin/roles          → Rol yönetimi
/admin/settings       → Şirket ayarları
/admin/logs           → Sistem logları
```

---

## FIN — Finans & Muhasebe 💰

### Özellikler
- [ ] Müşteri/tedarikçi cari hesap yönetimi
- [ ] Satış faturası oluşturma
- [ ] Alış faturası kayıt
- [ ] İade faturası
- [ ] Tahsilat & ödeme takibi
- [ ] Cari ekstre
- [ ] KDV raporu
- [ ] Gelir/gider özeti
- [ ] Çoklu döviz desteği (TRY, USD, EUR)

### İş Kuralları
1. Fatura toplam = (satır toplamları) - indirim + KDV
2. Ödeme >= fatura toplamı ise status = 'paid'
3. Vade geçmiş faturalar için gecikme faizi hesabı
4. KDV: %1, %8, %18, %20 oranları desteklenmeli
5. Negatif stok varsa satış faturası oluşturulamaz (ayara bağlı)

### API Endpoints
```
GET    /api/invoices?type=sale&status=issued
POST   /api/invoices
GET    /api/invoices/:id
PUT    /api/invoices/:id
POST   /api/invoices/:id/issue        → Faturayı kesildi yap
POST   /api/invoices/:id/cancel       → İptal et
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/:id/statement    → Ekstre
POST   /api/payments
GET    /api/payments
```

### Vue Sayfaları
```
/finance/invoices/sale         → Satış faturaları listesi
/finance/invoices/sale/new     → Yeni satış faturası
/finance/invoices/purchase     → Alış faturaları
/finance/accounts              → Cari hesaplar
/finance/accounts/:id          → Cari ekstre
/finance/payments              → Tahsilatlar
/finance/reports/vat           → KDV raporu
```

---

## INV — Stok & Depo Yönetimi 📦

### Özellikler
- [ ] Ürün & kategori yönetimi
- [ ] Depo yönetimi
- [ ] Stok girişi (alış/üretim)
- [ ] Stok çıkışı (satış/fire)
- [ ] Depolar arası transfer
- [ ] Stok sayımı
- [ ] Minimum stok alarmı
- [ ] Seri/Lot takibi (opsiyonel)

### İş Kuralları
1. Her stok hareketi log olarak tutulur (silinmez)
2. Stok bakiyesi = Tüm girişler - Tüm çıkışlar
3. Minimum stok altına düşünce bildirim gönder
4. Stok sayımında fark varsa `adjustment` hareketi oluştur

### API Endpoints
```
GET    /api/products
POST   /api/products
PUT    /api/products/:id
GET    /api/products/:id/stock        → Stok bakiyesi
GET    /api/warehouses
POST   /api/stock/movement            → Stok hareketi kayıt
POST   /api/stock/transfer            → Transfer
POST   /api/stock/count               → Sayım
GET    /api/stock/movements?product_id=...
GET    /api/stock/low-stock-alerts    → Alarm listesi
```

### Vue Sayfaları
```
/inventory/products            → Ürün listesi
/inventory/products/new        → Yeni ürün
/inventory/warehouses          → Depo listesi
/inventory/movements           → Stok hareketleri
/inventory/transfer            → Transfer formu
/inventory/count               → Sayım ekranı
/inventory/reports             → Stok raporu
```

---

## SLS — Satış & CRM 🛒

### Özellikler
- [ ] Teklif oluşturma
- [ ] Siparişten faturaya dönüştürme
- [ ] Müşteri yönetimi
- [ ] Satış fırsatları pipeline
- [ ] Satış hedefleri & gerçekleşen
- [ ] Kampanya & indirim yönetimi

### API Endpoints
```
GET    /api/quotes
POST   /api/quotes
POST   /api/quotes/:id/convert-to-order
GET    /api/orders
POST   /api/orders
POST   /api/orders/:id/convert-to-invoice
GET    /api/customers
GET    /api/customers/:id/history
```

---

## PUR — Satın Alma 🛍️

### Özellikler
- [ ] Satın alma talep yönetimi
- [ ] Tedarikçi teklif karşılaştırma
- [ ] Satın alma siparişi
- [ ] Mal kabul
- [ ] Tedarikçi performans değerlendirme

---

## HR — İnsan Kaynakları 👥

### Özellikler
- [ ] Çalışan profil yönetimi
- [ ] İzin talep & onay
- [ ] Bordro hesaplama (basit)
- [ ] Departman/pozisyon yönetimi
- [ ] Çalışan belgeler

---

## RPT — Raporlama & Dashboard 📊

### Dashboard Widget'ları
- Günlük satış özeti
- Bekleyen tahsilatlar
- Düşük stok uyarıları
- Ciro grafik (aylık)
- En çok satan ürünler
- Nakit akış özeti

### Raporlar
- Gelir-Gider Raporu
- KDV Beyanı
- Stok Değerleme
- Müşteri Bazlı Satış
- Ürün Kâr/Zarar
- Çalışan İzin Özeti
