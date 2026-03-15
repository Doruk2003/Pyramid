<script setup lang="ts">
import FloatingConfigurator from '@/shared/components/FloatingConfigurator.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/core/auth/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');

async function handleLogin() {
  errorMessage.value = '';

  if (!email.value || !password.value) {
    errorMessage.value = 'E-posta ve şifre zorunludur.';
    return;
  }

  const result = await authStore.login(email.value, password.value);

  if (result.success) {
    router.push('/');
  } else {
    errorMessage.value = authStore.error || 'Giriş başarısız. Bilgilerinizi kontrol edin.';
  }
}
</script>

<template>
    <FloatingConfigurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8">
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-bold mb-2">
                            🔺 Pyramid ERP
                        </div>
                        <span class="text-muted-color font-medium">Devam etmek için giriş yapın</span>
                    </div>

                    <div>
                        <label for="login-email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">E-posta</label>
                        <InputText
                            id="login-email"
                            type="email"
                            placeholder="ornek@sirket.com"
                            class="w-full md:w-[30rem] mb-6"
                            v-model="email"
                            @keyup.enter="handleLogin"
                        />

                        <label for="login-password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Şifre</label>
                        <Password
                            id="login-password"
                            v-model="password"
                            placeholder="Şifrenizi girin"
                            :toggleMask="true"
                            class="mb-4"
                            fluid
                            :feedback="false"
                            @keyup.enter="handleLogin"
                        />

                        <!-- Hata mesajı -->
                        <div v-if="errorMessage" class="mb-4 p-3 rounded-lg flex items-center gap-2"
                             style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3)">
                            <i class="pi pi-exclamation-triangle" style="color: #ef4444"></i>
                            <span style="color: #ef4444; font-size: 0.9rem">{{ errorMessage }}</span>
                        </div>

                        <Button
                            id="login-btn"
                            label="Giriş Yap"
                            icon="pi pi-sign-in"
                            class="w-full mt-4"
                            :loading="authStore.loading"
                            :disabled="authStore.loading"
                            @click="handleLogin"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
