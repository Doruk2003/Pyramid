# 🔌 API TASARIM STANDARTLARI

## Base URL
```
Production:  https://api.nexus-erp.com/api/v1
Development: http://localhost:3000/api/v1
```

---

## Request / Response Formatı

### Başarılı Yanıt
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Hata Yanıtı
```json
{
  "success": false,
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Fatura bulunamadı",
    "details": [
      { "field": "invoiceId", "message": "Geçersiz ID formatı" }
    ]
  }
}
```

---

## HTTP Status Kodları

| Durum | Kod | Kullanım |
|-------|-----|---------|
| OK | 200 | GET, PUT başarılı |
| Created | 201 | POST başarılı |
| No Content | 204 | DELETE başarılı |
| Bad Request | 400 | Validasyon hatası |
| Unauthorized | 401 | Token yok/geçersiz |
| Forbidden | 403 | Yetki yok |
| Not Found | 404 | Kayıt yok |
| Conflict | 409 | Mükerrer kayıt |
| Unprocessable | 422 | İş kuralı hatası |
| Server Error | 500 | Sistem hatası |

---

## Authentication

```
Headers:
  Authorization: Bearer <supabase_jwt_token>
  X-Company-Id: <company_uuid>     (multi-tenant için)
```

### Auth Flow
```
1. POST /api/auth/login { email, password }
   → Supabase Auth ile doğrula
   → { access_token, refresh_token, user }

2. Her istekte Authorization header gönder
3. Token süresi dolunca POST /api/auth/refresh
4. Logout: POST /api/auth/logout (token revoke)
```

---

## Pagination & Filtering

### Query Parameters
```
GET /api/invoices
  ?page=1              → Sayfa numarası (default: 1)
  &limit=20            → Sayfa başı kayıt (default: 20, max: 100)
  &sort=created_at     → Sıralama alanı
  &order=desc          → asc / desc
  &search=fatura       → Metin arama
  &status=issued       → Alan filtresi
  &date_from=2024-01-01
  &date_to=2024-12-31
```

---

## Supabase Client Kullanımı (Backend)

```typescript
// infrastructure/database/supabase.client.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Backend'de service role key kullan!
)

// Repository implementasyonu
export class SupabaseInvoiceRepository implements IInvoiceRepository {
  async findById(id: string): Promise<Result<Invoice, NotFoundError>> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_lines(*), accounts(*)')
      .eq('id', id)
      .single()

    if (error || !data) return err(new NotFoundError('Fatura bulunamadı'))
    return ok(InvoiceMapper.toDomain(data))
  }

  async save(invoice: Invoice): Promise<Result<Invoice, DatabaseError>> {
    const { data, error } = await supabase
      .from('invoices')
      .upsert(InvoiceMapper.toPersistence(invoice))
      .select()
      .single()

    if (error) return err(new DatabaseError(error.message))
    return ok(InvoiceMapper.toDomain(data))
  }
}
```

---

## Supabase Realtime (Frontend)

```typescript
// Fatura durumu değişimlerini dinle
const subscription = supabase
  .channel('invoices-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'invoices',
      filter: `company_id=eq.${companyId}`
    },
    (payload) => {
      invoiceStore.updateInvoice(payload.new)
    }
  )
  .subscribe()
```

---

## Hata Kodları Kataloğu

```typescript
// domain/errors/domain.errors.ts
export enum ErrorCode {
  // Genel
  NOT_FOUND         = 'NOT_FOUND',
  VALIDATION_ERROR  = 'VALIDATION_ERROR',
  UNAUTHORIZED      = 'UNAUTHORIZED',
  FORBIDDEN         = 'FORBIDDEN',

  // Fatura
  INVOICE_ALREADY_ISSUED    = 'INVOICE_ALREADY_ISSUED',
  INVOICE_CANNOT_CANCEL     = 'INVOICE_CANNOT_CANCEL',
  INVOICE_DUPLICATE_NUMBER  = 'INVOICE_DUPLICATE_NUMBER',

  // Stok
  INSUFFICIENT_STOCK   = 'INSUFFICIENT_STOCK',
  NEGATIVE_STOCK       = 'NEGATIVE_STOCK',
  WAREHOUSE_NOT_FOUND  = 'WAREHOUSE_NOT_FOUND',

  // Ödeme
  PAYMENT_EXCEEDS_TOTAL = 'PAYMENT_EXCEEDS_TOTAL',
}
```

---

## Rate Limiting

```
Genel: 100 istek / dakika / kullanıcı
Auth endpoints: 5 istek / dakika / IP
Report endpoints: 10 istek / dakika / şirket
```

---

## API Güvenlik Kontrol Listesi

- [x] JWT doğrulama middleware
- [x] Company ID izolasyonu (her sorguda company_id filtresi)
- [x] Input validasyon (Zod)
- [x] SQL injection koruması (Supabase parameterized queries)
- [x] Rate limiting (express-rate-limit)
- [x] CORS konfigürasyonu
- [x] Helmet.js güvenlik headers
- [x] Request body boyutu limiti (10mb)
