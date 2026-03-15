# 📐 KOD STANDARTLARI & KURALLAR

## Genel Prensipler

1. **SOLID** prensiplerine uy
2. **DRY** (Don't Repeat Yourself) — tekrar eden kodu abstraction'a çek
3. **KISS** (Keep It Simple) — gereksiz karmaşıklıktan kaçın
4. **Yorum dili**: Türkçe, Kod dili: İngilizce

---

## TypeScript Kuralları

```typescript
// ✅ DOĞRU — Her şeyi tiplendirin
interface CreateInvoiceDto {
  accountId: string
  issueDate: string
  lines: InvoiceLine[]
}

// ❌ YANLIŞ — any kullanmayın
function processInvoice(data: any) { ... }

// ✅ DOĞRU — Union types kullanın
type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled'

// ✅ DOĞRU — Readonly kullanın (immutability)
interface Product {
  readonly id: string
  name: string
  price: number
}

// ✅ DOĞRU — Generic Result pattern
async function findInvoice(id: string): Promise<Result<Invoice, NotFoundError>>

// ❌ YANLIŞ — Exception fırlatmayın (Result pattern kullanın)
async function findInvoice(id: string): Promise<Invoice> {
  throw new Error('bulunamadı') // ❌
}
```

---

## Dosya & Klasör İsimlendirme

```
✅ Dosyalar:           kebab-case
  invoice.service.ts
  create-invoice.usecase.ts
  InvoiceForm.vue        → Vue bileşenleri PascalCase

✅ Klasörler:          kebab-case
  use-cases/
  value-objects/

✅ Interface:          PascalCase, I prefix
  IInvoiceRepository
  IEmailPort

✅ Type/Class:         PascalCase
  CreateInvoiceDto
  InvoiceEntity

✅ Const/Variable:     camelCase
  const invoiceTotal = ...
  let currentPage = 1

✅ Enum:               PascalCase değerler
  enum InvoiceStatus {
    Draft = 'draft',
    Issued = 'issued',
  }
```

---

## Backend Kod Yapısı

### Controller — Sadece HTTP
```typescript
// ✅ Controller sadece HTTP işlemi yapar
export class InvoiceController {
  constructor(private readonly createInvoiceUseCase: CreateInvoiceUseCase) {}

  async create(req: Request, res: Response) {
    // 1. Validate
    const dto = CreateInvoiceSchema.parse(req.body) // Zod

    // 2. Use case çağır
    const result = await this.createInvoiceUseCase.execute(dto)

    // 3. Yanıt döndür
    if (!result.success) {
      return res.status(422).json({ success: false, error: result.error })
    }
    return res.status(201).json({ success: true, data: result.data })
  }
}
```

### Use Case — İş Mantığı
```typescript
// ✅ Use case sadece iş mantığı içerir
export class CreateInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly accountRepo: IAccountRepository
  ) {}

  async execute(dto: CreateInvoiceDto): Promise<Result<Invoice, DomainError>> {
    // 1. Müşteri var mı?
    const account = await this.accountRepo.findById(dto.accountId)
    if (!account.success) return err(new NotFoundError('Cari hesap bulunamadı'))

    // 2. Domain nesne oluştur
    const invoice = Invoice.create(dto)

    // 3. Validasyon
    if (!invoice.isValid()) return err(new ValidationError(invoice.errors))

    // 4. Kaydet
    return this.invoiceRepo.save(invoice)
  }
}
```

---

## Frontend Kod Yapısı

### Vue Bileşeni Yapısı
```vue
<script setup lang="ts">
// 1. Import'lar (gruplar halinde)
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import type { Invoice } from '@/types/invoice.types'
import { useInvoiceStore } from '../stores/invoice.store'
import { useToast } from '@/composables/useToast'

// 2. Props & Emits
interface Props {
  invoiceId?: string
  readonly?: boolean
}
const props = withDefaults(defineProps<Props>(), { readonly: false })
const emit = defineEmits<{ saved: [invoice: Invoice]; cancelled: [] }>()

// 3. Composables
const router = useRouter()
const toast = useToast()
const invoiceStore = useInvoiceStore()

// 4. Reactive state
const form = ref<CreateInvoiceDto>({ ... })
const loading = ref(false)

// 5. Computed
const isEditMode = computed(() => !!props.invoiceId)

// 6. Lifecycle
onMounted(async () => {
  if (props.invoiceId) await invoiceStore.fetchById(props.invoiceId)
})

// 7. Metodlar
async function handleSubmit() { ... }
function handleCancel() { emit('cancelled') }
</script>

<template>
  <!-- Template -->
</template>
```

---

## Commit Mesajı Formatı

```
feat(finance): satış faturası oluşturma ekranı eklendi
fix(inventory): stok bakiyesi negatife düşme hatası giderildi
refactor(auth): token yenileme logic'i composable'a taşındı
docs(api): invoice endpoint'leri dokümante edildi
test(invoice): fatura hesaplama unit testleri eklendi

Format: <type>(<module>): <açıklama>
Types: feat | fix | refactor | docs | test | chore | perf
```

---

## Test Standartları

### Unit Test (Vitest)
```typescript
// use-cases/__tests__/create-invoice.usecase.spec.ts
describe('CreateInvoiceUseCase', () => {
  it('geçerli verilerle fatura oluşturulabilmeli', async () => {
    // Arrange
    const mockRepo = createMockInvoiceRepository()
    const useCase = new CreateInvoiceUseCase(mockRepo, mockAccountRepo)
    const dto: CreateInvoiceDto = { ... }

    // Act
    const result = await useCase.execute(dto)

    // Assert
    expect(result.success).toBe(true)
    expect(result.data.total).toBe(expectedTotal)
  })

  it('geçersiz cari hesapla fatura oluşturulamaz', async () => {
    // ...
    expect(result.success).toBe(false)
    expect(result.error.code).toBe(ErrorCode.NOT_FOUND)
  })
})
```

---

## Ortam Değişkenleri (.env)

```bash
# apps/api/.env
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=super-secret-key
CORS_ORIGINS=http://localhost:5173

# apps/web/.env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Güvenlik Kontrol Listesi

- [ ] Environment variable'lar .env.example'da dokümante edilmeli
- [ ] Şifreler asla log'lanmamalı
- [ ] Kullanıcı inputu her zaman validate edilmeli (Zod)
- [ ] SQL sorgularında parameterized query kullanılmalı
- [ ] API key'ler frontend'de bulunmamalı (VITE_SUPABASE_ANON_KEY hariç)
- [ ] Company ID her sorguda filter olarak eklenmeli (data leak önlemi)
