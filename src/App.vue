<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

// Tüm eski Supabase session key'lerini temizle (pyramid-auth hariç)
Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-') && key !== 'pyramid-auth') {
        localStorage.removeItem(key);
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
