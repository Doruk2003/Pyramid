# 📋 PROJE TANIMI — Web ERP Uygulaması

## Proje Adı
**NexusERP** — Orta Ölçekli İşletmeler için Web Tabanlı ERP Sistemi

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js 20+ (Express.js / Fastify) |
| Frontend | Vue.js 3 (Composition API + TypeScript) |
| Veritabanı | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| State Yönetimi | Pinia |
| UI Kütüphanesi | PrimeVue veya Naive UI |
| API Stili | RESTful + Supabase Realtime |
| Auth | Supabase Auth (JWT) |
| Deployment | Docker + Nginx |

## Hedef Kitle
- 10-500 çalışanlı orta ölçekli işletmeler
- Üretim, ticaret, hizmet sektörleri

## Temel Özellikler

### 🏢 ERP Modülleri
- **FIN** — Finans & Muhasebe
- **INV** — Stok & Depo Yönetimi
- **PUR** — Satın Alma
- **SLS** — Satış & CRM
- **HR** — İnsan Kaynakları
- **MFG** — Üretim Planlama
- **RPT** — Raporlama & Dashboard
- **ADM** — Sistem Yönetimi

## Performans Hedefleri
- API response time: < 200ms (p95)
- Frontend First Load: < 3 saniye
- Eş zamanlı kullanıcı: 500+
- Veri saklama: 5 yıl

## Proje Klasör Yapısı (Kök)

```
nexus-erp/
├── apps/
│   ├── api/          → Node.js Backend
│   └── web/          → Vue.js Frontend
├── packages/
│   ├── shared/       → Ortak tipler & utils
│   └── ui/           → Ortak UI bileşenleri
├── docs/             → Bu .md dosyaları
├── docker/           → Docker config
└── package.json      → Monorepo (pnpm workspaces)
```

## Geliştirme Ortamı
- **Node.js**: v20.x LTS
- **Package Manager**: pnpm
- **Linter**: ESLint + Prettier
- **Test**: Vitest (unit) + Playwright (e2e)
- **CI/CD**: GitHub Actions
