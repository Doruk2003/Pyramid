<script setup lang="ts">
import loginBg from '@/assets/login-bg.png';
import { useAuthStore } from '@/core/auth/auth.store';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const showPassword = ref(false);
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
    <div class="login-root">
        <!-- SOL PANEL: Görsel + Marka -->
        <div class="login-left" :style="{ backgroundImage: `url(${loginBg})` }">
            <div class="login-left-overlay" />

            <!-- Logo -->
            <div class="login-logo">
                <div class="login-logo-mark">P</div>
                <span class="login-logo-name">PYRAMID ERP</span>
            </div>

            <!-- Alt içerik -->
            <div class="login-left-content">
                <p class="login-tagline-small">SİPARİŞ · ÜRETİM · PROJE · FİNANS</p>
                <h1 class="login-headline">
                    İşletmenizin tüm süreçlerini <br />tek platformdan yönetin.
                </h1>
                <p class="login-desc">
                    Sipariş, lojistik ve cari akışını tek panelden yönet.
                    Devam etmek için kurumsal hesabınla giriş yap.
                </p>
                <ul class="login-features">
                    <li><span class="login-dot" />Teklif, Sipariş ve Proje takibi</li>
                    <li><span class="login-dot" />Bayi ve cari yönetimi</li>
                    <li><span class="login-dot" />Raporlama ve maliyet analizi</li>
                </ul>
            </div>

            <!-- Footer sol -->
            <div class="login-left-footer">
                <span>© 2026 Pyramid ERP</span>
                <span>KVKK Aydınlatma Metni</span>
            </div>
        </div>

        <!-- SAĞ PANEL: Form -->
        <div class="login-right">
            <div class="login-form-wrapper">
                <h2 class="login-welcome">Hoşgeldiniz</h2>
                <p class="login-welcome-sub">
                    Devam etmek için <span class="login-accent">kurumsal hesabınla</span> giriş yap.
                </p>

                <!-- E-posta -->
                <div class="login-field">
                    <label for="login-email" class="login-label">E-POSTA</label>
                    <input
                        id="login-email"
                        v-model="email"
                        type="email"
                        class="login-input"
                        autocomplete="email"
                        @keyup.enter="handleLogin"
                    />
                </div>

                <!-- Şifre -->
                <div class="login-field">
                    <label for="login-password" class="login-label">ŞİFRE</label>
                    <div class="login-input-wrap">
                        <input
                            id="login-password"
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            class="login-input"
                            autocomplete="current-password"
                            @keyup.enter="handleLogin"
                        />
                        <button
                            type="button"
                            class="login-eye-btn"
                            :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
                            @click="showPassword = !showPassword"
                        >
                            <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
                        </button>
                    </div>
                </div>

                <!-- Beni hatırla -->
                <div class="login-remember">
                    <label class="login-checkbox-label">
                        <input v-model="rememberMe" type="checkbox" class="login-checkbox" />
                        Beni hatırla
                    </label>
                </div>

                <!-- Hata mesajı -->
                <div v-if="errorMessage" class="login-error">
                    <i class="pi pi-exclamation-triangle" />
                    {{ errorMessage }}
                </div>

                <!-- Giriş Butonu -->
                <button
                    id="login-btn"
                    class="login-btn"
                    :disabled="authStore.loading"
                    @click="handleLogin"
                >
                    <i v-if="authStore.loading" class="pi pi-spin pi-spinner" />
                    <span>{{ authStore.loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}</span>
                </button>

                <!-- Yardım -->
                <p class="login-help">
                    Hesabınla ilgili sorun mu yaşıyorsun?
                    <a href="mailto:destek@pyramid.com" class="login-help-link">Yardım</a>
                </p>
            </div>
        </div>
    </div>
</template>

