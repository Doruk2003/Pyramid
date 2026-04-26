<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { computed } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

const authStore = useAuthStore();

const model = computed(() => {
    const menu = [
        {
            label: '',
            items: [
                {
                    label: 'Dashboard',
                    icon: 'pi pi-fw pi-home',
                    to: '/'
                }
            ]
        },
        {
            label: '',
            items: [
                {
                    label: 'Envanter',
                    icon: 'pi pi-fw pi-box',
                    path: '/inventory',
                    items: [
                        {
                            label: 'Ürünler',
                            icon: 'pi pi-fw pi-tag',
                            to: '/inventory/products'
                        },
                        {
                            label: 'Depolar',
                            icon: 'pi pi-fw pi-building',
                            to: '/inventory/warehouses'
                        },
                        {
                            label: 'Stok Hareketleri',
                            icon: 'pi pi-fw pi-sync',
                            to: '/inventory/movements'
                        }
                    ]
                }
            ]
        },
        {
            label: '',
            items: [
                {
                    label: 'Finans',
                    icon: 'pi pi-fw pi-wallet',
                    path: '/finance',
                    items: [
                        {
                            label: 'Faturalar',
                            icon: 'pi pi-fw pi-file-pdf',
                            to: '/finance/invoices'
                        },
                        {
                            label: 'Cari Hesaplar',
                            icon: 'pi pi-fw pi-address-book',
                            to: '/finance/accounts'
                        },
                        {
                            label: 'Projeler',
                            icon: 'pi pi-fw pi-sitemap',
                            to: '/finance/projects'
                        }
                    ]
                }
            ]
        },
        {
            label: '',
            items: [
                {
                    label: 'Satış',
                    icon: 'pi pi-fw pi-shopping-cart',
                    path: '/sales',
                    items: [
                        {
                            label: 'Teklifler',
                            icon: 'pi pi-fw pi-file',
                            to: '/sales/quotes'
                        },
                        {
                            label: 'Siparişler',
                            icon: 'pi pi-fw pi-shopping-bag',
                            to: '/sales/orders'
                        }
                    ]
                }
            ]
        }
    ];

    menu.push({
        label: '',
        items: [
            {
                label: 'Yönetim',
                icon: 'pi pi-fw pi-cog',
                path: '/admin',
                items: [
                    { label: 'Kullanıcılar', icon: 'pi pi-fw pi-user', to: '/admin/users' },
                    { label: 'Loglar', icon: 'pi pi-fw pi-list', to: '/admin/logs' }
                ]
            }
        ]
    });

    menu.push(
        {
            label: '',
            items: [
                {
                    label: 'Raporlar',
                    icon: 'pi pi-fw pi-chart-bar',
                    path: '/reports',
                    items: []
                }
            ]
        },
        {
            label: '',
            items: [
                {
                    label: 'Parametreler',
                    icon: 'pi pi-fw pi-list-check',
                    path: '/parameters',
                    items: [
                        { label: 'Döviz Kurları', icon: 'pi pi-fw pi-chart-line', to: '/finance/exchange-rates' },
                        { label: 'Roller', icon: 'pi pi-fw pi-shield', to: '/admin/roles' },
                        { label: 'Döviz Yönetimi', icon: 'pi pi-fw pi-dollar', to: '/admin/currencies' },
                        { label: 'Envanter Tanımları', icon: 'pi pi-fw pi-tags', to: '/admin/inventory-definitions' },
                        { label: 'Ayarlar', icon: 'pi pi-fw pi-sliders-h', to: '/admin/settings' }
                    ]
                }
            ]
        }
    );

    return menu;
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item.label">
            <app-menu-item :item="item" :index="i"></app-menu-item>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
