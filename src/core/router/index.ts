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
                    path: '/finance/accounts',
                    name: 'finance-accounts',
                    component: () => import('@/modules/finance/views/accounts/AccountList.vue')
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

    if (to.path.startsWith('/admin') && !authStore.isAdmin) {
        return '/auth/access';
    }
});

export default router;
