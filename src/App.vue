<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useInactivityTimer } from '@/core/auth/useInactivityTimer';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

// 15 dakika hareketsizlik sonrası otomatik oturum kapatma
useInactivityTimer(async () => {
    if (authStore.isAuthenticated) {
        await authStore.logout();
        router.push('/auth/login');
    }
});

onMounted(() => {
    authStore.listenToAuthChanges((path) => {
        if (router.currentRoute.value.path !== path) {
            router.push(path);
        }
    });
});
</script>

<template>
    <router-view />
</template>

<style scoped></style>
