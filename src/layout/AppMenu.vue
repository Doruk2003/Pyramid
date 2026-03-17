<script setup lang="ts">
import { computed } from 'vue';
import AppMenuItem from './AppMenuItem.vue';
import { useAuthStore } from '@/core/auth/auth.store';

const authStore = useAuthStore();

const model = computed(() => {
    const menu = [
        {
            label: 'Home',
            items: [
                {
                    label: 'Dashboard',
                    icon: 'pi pi-fw pi-home',
                    to: '/'
                }
            ]
        },
        {
            label: 'Envanter Yönetimi',
            items: [
                {
                    label: 'Ürünler',
                    icon: 'pi pi-fw pi-box',
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
        },
        {
            label: 'Finans Yönetimi',
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
                }
            ]
        }
    ];

    // Sistem Yönetimi sadece Admin'e özel
    if (authStore.isAdmin) {
        menu.push({
            label: 'Sistem Yönetimi',
            items: [
                { label: 'Kullanıcılar', icon: 'pi pi-fw pi-users', to: '/admin/users' },
                { label: 'Roller', icon: 'pi pi-fw pi-shield', to: '/admin/roles' },
                { label: 'Ayarlar', icon: 'pi pi-fw pi-cog', to: '/admin/settings' },
                { label: 'Loglar', icon: 'pi pi-fw pi-list', to: '/admin/logs' }
            ]
        });
    }

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
