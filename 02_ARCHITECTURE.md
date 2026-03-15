# 🏗️ MİMARİ TASARIM — Clean Architecture

## Genel Prensip

```
Bağımlılık Yönü: Dışarıdan İçeriye (Dependency Rule)

[ Infrastructure ] → [ Application ] → [ Domain ]
[ Presentation   ] → [ Application ] → [ Domain ]
```

Domain katmanı hiçbir dış bağımlılık içermez.

---

## Backend Katman Yapısı (apps/api)

```
apps/api/src/
│
├── domain/                    # 🔴 CORE — Hiç dış bağımlılık yok
│   ├── entities/              # İş nesneleri (saf TypeScript class)
│   │   ├── user.entity.ts
│   │   ├── invoice.entity.ts
│   │   └── product.entity.ts
│   ├── value-objects/         # Değer nesneleri (immutable)
│   │   ├── money.vo.ts
│   │   ├── email.vo.ts
│   │   └── tax-number.vo.ts
│   ├── repositories/          # Repository arayüzleri (interface only)
│   │   ├── user.repository.ts
│   │   └── invoice.repository.ts
│   ├── services/              # Domain servisleri (iş kuralları)
│   │   └── invoice-calculator.service.ts
│   └── errors/                # Domain hataları
│       └── domain.errors.ts
│
├── application/               # 🟡 USE CASES — Sadece domain'e bağımlı
│   ├── use-cases/
│   │   ├── invoices/
│   │   │   ├── create-invoice.usecase.ts
│   │   │   ├── get-invoice.usecase.ts
│   │   │   └── list-invoices.usecase.ts
│   │   └── users/
│   │       └── authenticate-user.usecase.ts
│   ├── dtos/                  # Data Transfer Objects
│   │   ├── invoice.dto.ts
│   │   └── user.dto.ts
│   └── ports/                 # Dış servis arayüzleri
│       ├── email.port.ts
│       └── storage.port.ts
│
├── infrastructure/            # 🟢 ADAPTERS — Framework & DB
│   ├── database/
│   │   ├── supabase.client.ts # Supabase singleton
│   │   └── repositories/      # Repository implementasyonları
│   │       ├── supabase-user.repository.ts
│   │       └── supabase-invoice.repository.ts
│   ├── services/              # Port implementasyonları
│   │   ├── resend-email.service.ts
│   │   └── supabase-storage.service.ts
│   └── config/
│       └── env.config.ts
│
├── presentation/              # 🔵 HTTP LAYER — Express routes
│   ├── routes/
│   │   ├── invoice.routes.ts
│   │   └── user.routes.ts
│   ├── controllers/
│   │   ├── invoice.controller.ts
│   │   └── user.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error-handler.middleware.ts
│   └── validators/            # Zod şemaları
│       └── invoice.validator.ts
│
└── shared/                    # Yardımcı araçlar
    ├── result.ts              # Result<T,E> pattern
    ├── logger.ts
    └── pagination.ts
```

---

## Frontend Katman Yapısı (apps/web)

```
apps/web/src/
│
├── core/                      # Domain mantığı (iş kuralları)
│   ├── entities/
│   ├── use-cases/
│   └── repositories/          # Interface'ler
│
├── infrastructure/            # Supabase, HTTP istemcileri
│   ├── supabase/
│   │   └── supabase.client.ts
│   └── http/
│       └── api.client.ts
│
├── composables/               # Vue Composition API hooks
│   ├── useAuth.ts
│   ├── useInvoice.ts
│   └── usePagination.ts
│
├── stores/                    # Pinia store'ları
│   ├── auth.store.ts
│   ├── invoice.store.ts
│   └── ui.store.ts
│
├── views/                     # Sayfa bileşenleri (route'a bağlı)
│   ├── auth/
│   ├── dashboard/
│   ├── finance/
│   └── inventory/
│
├── components/                # Yeniden kullanılabilir bileşenler
│   ├── common/
│   ├── forms/
│   └── tables/
│
├── router/                    # Vue Router
│   ├── index.ts
│   └── guards/
│
└── types/                     # Global TypeScript tipleri
```

---

## Result Pattern (Zorunlu Kullanım)

```typescript
// shared/result.ts
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

export const ok = <T>(data: T): Result<T, never> =>
  ({ success: true, data })

export const err = <E>(error: E): Result<never, E> =>
  ({ success: false, error })

// Kullanım örneği:
async function createInvoice(dto: CreateInvoiceDto): Promise<Result<Invoice, DomainError>> {
  const invoice = Invoice.create(dto)
  if (!invoice.isValid()) return err(new ValidationError('Geçersiz fatura'))
  const saved = await this.invoiceRepo.save(invoice)
  return ok(saved)
}
```

---

## Dependency Injection

```typescript
// Her use-case constructor injection kullanır
class CreateInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,  // Interface
    private readonly customerRepo: ICustomerRepository, // Interface
    private readonly emailService: IEmailPort           // Port
  ) {}
}

// Infrastructure'da bind edilir
container.bind<IInvoiceRepository>(TOKENS.InvoiceRepo)
  .to(SupabaseInvoiceRepository)
```

---

## Katmanlar Arası Veri Akışı

```
HTTP Request
    ↓
Controller (DTO dönüşümü)
    ↓
Use Case (iş mantığı)
    ↓
Repository Interface (domain'de tanımlı)
    ↓
Supabase Repository (infrastructure'da implement)
    ↓
Supabase DB
```
