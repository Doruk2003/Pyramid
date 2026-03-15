import { defineStore } from 'pinia';
import type { CompanySettings } from '@/modules/admin/domain/settings.entity';
import { SupabaseSettingsRepository } from '@/modules/admin/infra/supabase-settings.repository';

const settingsRepo = new SupabaseSettingsRepository();

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: null as CompanySettings | null,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchSettings() {
      this.loading = true;
      const result = await settingsRepo.getSettings();
      if (result.success) {
        this.settings = result.data;
      } else {
        this.error = (result as any).error.message;
      }
      this.loading = false;
    },

    async updateSettings(newSettings: CompanySettings) {
      this.loading = true;
      const result = await settingsRepo.saveSettings(newSettings);
      if (result.success) {
        this.settings = newSettings;
      } else {
        this.error = (result as any).error.message;
      }
      this.loading = false;
      return result;
    }
  }
});



