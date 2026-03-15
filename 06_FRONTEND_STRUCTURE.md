# 🖥️ FRONTEND YAPISI — Vue.js 3

## Tech Stack
- **Vue 3** Composition API + `<script setup>`
- **TypeScript** — strict mode
- **Pinia** — State yönetimi
- **Vue Router 4** — Routing
- **PrimeVue 4** — UI bileşenleri
- **VeeValidate + Zod** — Form validasyon
- **TanStack Query (Vue Query)** — Server state yönetimi
- **Axios** — HTTP istemcisi
- **Day.js** — Tarih işlemleri

---

## Klasör Yapısı

```
apps/web/src/
│
├── assets/
│   ├── styles/
│   │   ├── main.css
│   │   ├── variables.css
│   │   └── themes/
│   └── images/
│
├── components/
│   ├── common/
│   │   ├── AppHeader.vue
│   │   ├── AppSidebar.vue
│   │   ├── AppBreadcrumb.vue
│   │   └── AppLoader.vue
│   ├── data/
│   │   ├── DataTable.vue          → Genel tablo bileşeni
│   │   ├── DataTableFilters.vue
│   │   └── Pagination.vue
│   ├── forms/
│   │   ├── FormField.vue          → Label + input + error wrapper
│   │   ├── MoneyInput.vue         → Para giriş bileşeni
│   │   ├── DatePicker.vue
│   │   └── ProductSelector.vue    → Ürün arama dropdown
│   └── feedback/
│       ├── ConfirmDialog.vue
│       ├── ToastMessage.vue
│       └── EmptyState.vue
│
├── composables/
│   ├── useAuth.ts
│   ├── useToast.ts
│   ├── usePagination.ts
│   ├── useConfirm.ts
│   └── usePermission.ts
│
├── layouts/
│   ├── DefaultLayout.vue          → Sidebar + header layout
│   ├── AuthLayout.vue             → Login sayfası layout
│   └── PrintLayout.vue            → Yazdırma layout
│
├── modules/
│   ├── auth/
│   │   ├── views/
│   │   │   ├── LoginView.vue
│   │   │   └── ForgotPasswordView.vue
│   │   ├── stores/
│   │   │   └── auth.store.ts
│   │   └── composables/
│   │       └── useLogin.ts
│   │
│   ├── finance/
│   │   ├── views/
│   │   │   ├── InvoiceListView.vue
│   │   │   ├── InvoiceFormView.vue
│   │   │   ├── AccountListView.vue
│   │   │   └── AccountStatementView.vue
│   │   ├── components/
│   │   │   ├── InvoiceLines.vue   → Fatura kalem tablosu
│   │   │   ├── InvoiceSummary.vue → Ara toplam, KDV, toplam
│   │   │   └── PaymentForm.vue
│   │   ├── stores/
│   │   │   ├── invoice.store.ts
│   │   │   └── account.store.ts
│   │   └── composables/
│   │       ├── useInvoice.ts
│   │       └── useAccount.ts
│   │
│   ├── inventory/
│   │   ├── views/
│   │   │   ├── ProductListView.vue
│   │   │   ├── ProductFormView.vue
│   │   │   ├── StockMovementsView.vue
│   │   │   └── StockCountView.vue
│   │   ├── stores/
│   │   │   └── inventory.store.ts
│   │   └── composables/
│   │       └── useInventory.ts
│   │
│   └── dashboard/
│       ├── views/
│       │   └── DashboardView.vue
│       └── components/
│           ├── SalesWidget.vue
│           ├── StockAlertWidget.vue
│           └── RevenueChart.vue
│
├── router/
│   ├── index.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── finance.routes.ts
│   │   ├── inventory.routes.ts
│   │   └── dashboard.routes.ts
│   └── guards/
│       ├── auth.guard.ts          → Giriş yapmış mı?
│       └── permission.guard.ts    → Yetki var mı?
│
├── services/
│   ├── api.service.ts             → Axios instance
│   ├── invoice.service.ts
│   ├── inventory.service.ts
│   └── auth.service.ts
│
├── stores/
│   └── ui.store.ts                → Sidebar, tema, yüklenme
│
└── types/
    ├── api.types.ts               → API response tipleri
    ├── invoice.types.ts
    └── inventory.types.ts
```

---

## Composable Örneği

```typescript
// composables/usePagination.ts
import { ref, computed } from 'vue'

export function usePagination(defaultLimit = 20) {
  const page = ref(1)
  const limit = ref(defaultLimit)
  const total = ref(0)

  const totalPages = computed(() => Math.ceil(total.value / limit.value))
  const offset = computed(() => (page.value - 1) * limit.value)

  function goToPage(p: number) {
    if (p >= 1 && p <= totalPages.value) page.value = p
  }

  return { page, limit, total, totalPages, offset, goToPage }
}
```

---

## Store Örneği (Pinia)

```typescript
// modules/finance/stores/invoice.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Invoice } from '@/types/invoice.types'
import { invoiceService } from '@/services/invoice.service'

export const useInvoiceStore = defineStore('invoice', () => {
  const invoices = ref<Invoice[]>([])
  const loading = ref(false)
  const selected = ref<Invoice | null>(null)

  const issuedInvoices = computed(() =>
    invoices.value.filter(i => i.status === 'issued')
  )

  async function fetchInvoices(params?: Record<string, string>) {
    loading.value = true
    try {
      const response = await invoiceService.getAll(params)
      invoices.value = response.data
    } finally {
      loading.value = false
    }
  }

  return { invoices, loading, selected, issuedInvoices, fetchInvoices }
})
```

---

## Router Guard

```typescript
// router/guards/auth.guard.ts
import { useAuthStore } from '@/modules/auth/stores/auth.store'

export async function authGuard(to: RouteLocationNormalized) {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
}
```

---

## Fatura Formu Bileşeni Şablonu

```vue
<!-- modules/finance/views/InvoiceFormView.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInvoiceStore } from '../stores/invoice.store'
import InvoiceLines from '../components/InvoiceLines.vue'
import InvoiceSummary from '../components/InvoiceSummary.vue'

const router = useRouter()
const invoiceStore = useInvoiceStore()

const form = ref({
  invoice_type: 'sale',
  account_id: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  lines: [],
  notes: ''
})

async function handleSubmit() {
  const result = await invoiceStore.createInvoice(form.value)
  if (result.success) {
    router.push({ name: 'invoice-detail', params: { id: result.data.id } })
  }
}
</script>

<template>
  <div class="invoice-form">
    <!-- Form içeriği buraya -->
  </div>
</template>
```

---

## Tema & Renk Paleti

```css
/* assets/styles/variables.css */
:root {
  --primary: #2563eb;       /* Mavi */
  --secondary: #64748b;     /* Slate */
  --success: #16a34a;       /* Yeşil */
  --warning: #d97706;       /* Turuncu */
  --danger: #dc2626;        /* Kırmızı */
  --background: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
}
```
