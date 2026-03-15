import { AuthService } from '@/core/auth/auth.service';
import { supabase } from '@/lib/supabase';
import type { User } from '@/modules/admin/domain/user.entity';
import { defineStore } from 'pinia';

const authService = new AuthService();

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as User | null,
        loading: false,
        error: null as string | null,
        initialized: false // ← YENİ
    }),

    getters: {
        isAuthenticated: (state) => !!state.user,
        isAdmin: (state) => state.user?.role === 'admin',
        isManager: (state) => state.user?.role === 'manager',
        isUser: (state) => state.user?.role === 'user',
        isViewer: (state) => state.user?.role === 'viewer'
    },

    actions: {
        async initialize() {
            if (this.initialized) return;
            this.loading = true;
            try {
                const result = await authService.getCurrentUser();
                if (result.success) {
                    this.user = result.data;
                }
            } catch {
                // Bozuk session varsa temizle
                localStorage.clear();
                sessionStorage.clear();
            }
            this.initialized = true;
            this.loading = false;
        },

        async logout() {
            const result = await authService.logout();
            if (result.success) {
                this.user = null;
                this.initialized = false;
            }
        },

        async login(email: string, password: string) {
            this.loading = true;
            this.error = null;
            const result = await authService.login(email, password);
            if (result.success) {
                await authService.getCurrentUser().then((r) => {
                    if (r.success) this.user = r.data;
                });
                this.initialized = true;
            } else {
                this.error = (result as any).error.message;
            }
            this.loading = false;
            return result;
        },

        listenToAuthChanges(onRedirect?: (path: string) => void) {
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'INITIAL_SESSION') return;

                if (event === 'SIGNED_OUT' || !session) {
                    this.user = null;
                    this.initialized = false;
                    onRedirect?.('/auth/login');
                    return;
                }

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    this.initialized = false; // Yeniden yükle
                    await this.initialize();
                }
            });
        }
    }
});
