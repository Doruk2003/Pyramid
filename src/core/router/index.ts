import { useAuthStore } from '@/core/auth/auth.store';
import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/shared/views/Dashboard.vue')
                },
                {
                    path: '/inventory/products',
                    name: 'products',
                    component: () => import('@/modules/inventory/views/products/ProductList.vue')
                },
                {
                    path: '/inventory/products/create',
                    name: 'product-create',
                    component: () => import('@/modules/inventory/views/products/ProductCreate.vue')
                },
                {
                    path: '/inventory/products/edit/:id',
                    name: 'product-edit',
                    component: () => import('@/modules/inventory/views/products/ProductEdit.vue')
                },
                {
                    path: '/inventory/products/details/:id',
                    name: 'product-details',
                    component: () => import('@/modules/inventory/views/products/ProductDetail.vue')
                },
                {
                    path: '/admin/users',
                    name: 'admin-users',
                    component: () => import('@/modules/admin/views/users/UserList.vue')
                },
                {
                    path: '/admin/roles',
                    name: 'admin-roles',
                    component: () => import('@/modules/admin/views/roles/RoleList.vue')
                },
                {
                    path: '/admin/settings',
                    name: 'admin-settings',
                    component: () => import('@/modules/admin/views/settings/CompanySettings.vue')
                },
                {
                    path: '/admin/logs',
                    name: 'admin-logs',
                    component: () => import('@/modules/admin/views/logs/SystemLogs.vue')
                },
                {
                    path: '/admin/currencies',
                    name: 'admin-currencies',
                    component: () => import('@/modules/admin/views/currencies/CurrencyList.vue')
                },
                {
                    path: '/admin/inventory-definitions',
                    name: 'admin-inventory-definitions',
                    component: () => import('@/modules/admin/views/inventory/InventoryDefinitions.vue')
                },
                {
                    path: '/inventory/warehouses',
                    name: 'inventory-warehouses',
                    component: () => import('@/modules/inventory/views/warehouses/WarehouseList.vue')
                },
                {
                    path: '/inventory/movements',
                    name: 'inventory-movements',
                    component: () => import('@/modules/inventory/views/movements/MovementList.vue')
                },
                {
                    path: '/inventory/movements/create',
                    name: 'inventory-movement-create',
                    component: () => import('@/modules/inventory/views/movements/MovementCreate.vue')
                },
                {
                    path: '/inventory/count',
                    name: 'inventory-count',
                    component: () => import('@/modules/inventory/views/warehouses/InventoryCount.vue')
                },
                {
                    path: '/finance/accounts',
                    name: 'finance-accounts',
                    component: () => import('@/modules/finance/views/accounts/AccountList.vue')
                },
                {
                    path: '/finance/accounts/create',
                    name: 'finance-account-create',
                    component: () => import('@/modules/finance/views/accounts/AccountCreate.vue')
                },
                {
                    path: '/finance/accounts/edit/:id',
                    name: 'finance-account-edit',
                    component: () => import('@/modules/finance/views/accounts/AccountEdit.vue')
                },
                {
                    path: '/finance/invoices',
                    name: 'finance-invoices',
                    component: () => import('@/modules/finance/views/invoices/InvoiceList.vue')
                },
                {
                    path: '/finance/invoices/create',
                    name: 'finance-invoice-create',
                    component: () => import('@/modules/finance/views/invoices/InvoiceForm.vue')
                },
                {
                    path: '/finance/invoices/edit/:id',
                    name: 'finance-invoice-edit',
                    component: () => import('@/modules/finance/views/invoices/InvoiceForm.vue')
                },
                {
                    path: '/finance/exchange-rates',
                    name: 'finance-exchange-rates',
                    component: () => import('@/modules/finance/views/exchange-rates/ExchangeRateList.vue')
                },
                {
                    path: '/sales/quotes',
                    name: 'sales-quotes',
                    component: () => import('@/modules/sales/views/quotes/QuoteList.vue')
                },
                {
                    path: '/sales/quotes/create',
                    name: 'sales-quote-create',
                    component: () => import('@/modules/sales/views/quotes/QuoteForm.vue')
                },
                {
                    path: '/sales/quotes/edit/:id',
                    name: 'sales-quote-edit',
                    component: () => import('@/modules/sales/views/quotes/QuoteForm.vue')
                },
                {
                    path: '/sales/orders',
                    name: 'sales-orders',
                    component: () => import('@/modules/sales/views/orders/OrderList.vue')
                },
                {
                    path: '/sales/orders/create',
                    name: 'sales-order-create',
                    component: () => import('@/modules/sales/views/orders/OrderForm.vue')
                },
                {
                    path: '/sales/orders/edit/:id',
                    name: 'sales-order-edit',
                    component: () => import('@/modules/sales/views/orders/OrderForm.vue')
                },
                {
                    path: '/purchases/quotes',
                    name: 'purchases-quotes',
                    component: () => import('@/modules/purchases/views/quotes/QuoteList.vue')
                },
                {
                    path: '/purchases/quotes/create',
                    name: 'purchases-quote-create',
                    component: () => import('@/modules/purchases/views/quotes/QuoteForm.vue')
                },
                {
                    path: '/purchases/quotes/edit/:id',
                    name: 'purchases-quote-edit',
                    component: () => import('@/modules/purchases/views/quotes/QuoteForm.vue')
                },
                {
                    path: '/purchases/orders',
                    name: 'purchases-orders',
                    component: () => import('@/modules/purchases/views/orders/OrderList.vue')
                },
                {
                    path: '/purchases/orders/create',
                    name: 'purchases-order-create',
                    component: () => import('@/modules/purchases/views/orders/OrderForm.vue')
                },
                {
                    path: '/purchases/orders/edit/:id',
                    name: 'purchases-order-edit',
                    component: () => import('@/modules/purchases/views/orders/OrderForm.vue')
                },
                {
                    path: '/finance/projects',
                    name: 'finance-projects',
                    component: () => import('@/modules/finance/views/projects/ProjectList.vue')
                },
                {
                    path: '/finance/projects/:id',
                    name: 'finance-project-detail',
                    component: () => import('@/modules/finance/views/projects/ProjectDetail.vue')
                },
                {
                    path: '/todo/calendar',
                    name: 'todo-calendar',
                    component: () => import('@/modules/todo/views/CalendarPage.vue')
                },
                {
                    path: '/reports/stock/status',
                    name: 'report-stock-status',
                    component: () => import('@/modules/inventory/views/reports/StockStatusReport.vue')
                },
                {
                    path: '/reports/stock/movements',
                    name: 'report-stock-movements',
                    component: () => import('@/modules/inventory/views/reports/StockMovementsReport.vue')
                },
                {
                    path: '/reports/stock/critical',
                    name: 'report-stock-critical',
                    component: () => import('@/modules/inventory/views/reports/StockCriticalReport.vue')
                },
                {
                    path: '/reports/accounts/balances',
                    name: 'report-accounts-balances',
                    component: () => import('@/modules/finance/views/reports/AccountBalancesReport.vue')
                },
                {
                    path: '/reports/accounts/statement',
                    name: 'report-accounts-statement',
                    component: () => import('@/modules/finance/views/reports/AccountStatementReport.vue')
                },
                {
                    path: '/reports/accounts/aging',
                    name: 'report-accounts-aging',
                    component: () => import('@/modules/finance/views/reports/AccountAgingReport.vue')
                }
            ]
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/shared/views/pages/NotFound.vue')
        },

        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/shared/views/pages/auth/Login.vue')
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/shared/views/pages/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/shared/views/pages/auth/Error.vue')
        }
    ]
});
router.beforeEach(async (to) => {
    const authStore = useAuthStore();

    // Sadece henüz initialize edilmemişse çalıştır
    if (!authStore.initialized) {
        try {
            await authStore.initialize();
        } catch {
            return '/auth/login';
        }
    }

    const publicPages = ['/auth/login', '/auth/access', '/auth/error', '/pages/notfound'];
    const authRequired = !publicPages.includes(to.path);

    if (authRequired && !authStore.isAuthenticated) {
        return '/auth/login';
    }

    if (to.path.startsWith('/admin') || to.path.startsWith('/finance/exchange-rates')) {
        if (!authStore.isAdminOrManager) {
            return '/auth/access';
        }
    }
});

export default router;
