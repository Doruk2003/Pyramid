<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { CompanySettings, type CompanySettingsProps } from '@/modules/admin/domain/settings.entity';
import { useToast } from 'primevue/usetoast';
import { getErrorMessage } from '@/shared/utils/error';

const settingsStore = useSettingsStore();
const toast = useToast();
const settingsData = ref<CompanySettingsProps>({
    id: '',
    companyName: '',
    currency: 'TRY'
});

onMounted(async () => {
    await settingsStore.fetchSettings();
    if (settingsStore.settings) {
        settingsData.value = settingsStore.settings.toObject();
    }
});

const saveSettings = async () => {
    const newSettings = CompanySettings.create(settingsData.value);
    const result = await settingsStore.updateSettings(newSettings);

    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Ayarlar güncellendi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
};
</script>

<template>
    <div class="card">
        <div class="text-2xl font-medium block mb-4">Şirket Ayarları</div>
        <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12 md:col-span-6">
                <label for="companyName" class="block font-bold mb-2">Şirket Adı</label>
                <InputText id="companyName" v-model="settingsData.companyName" fluid />
            </div>
            <div class="col-span-12 md:col-span-6">
                <label for="taxNumber" class="block font-bold mb-2">Vergi Numarası</label>
                <InputText id="taxNumber" v-model="settingsData.taxNumber" fluid />
            </div>
            <div class="col-span-12 md:col-span-6">
                <label for="taxOffice" class="block font-bold mb-2">Vergi Dairesi</label>
                <InputText id="taxOffice" v-model="settingsData.taxOffice" fluid />
            </div>
            <div class="col-span-12 md:col-span-6">
                <label for="currency" class="block font-bold mb-2">Varsayılan Para Birimi</label>
                <Select id="currency" v-model="settingsData.currency" :options="['TRY', 'USD', 'EUR']" fluid />
            </div>
            <div class="col-span-12">
                <label for="address" class="block font-bold mb-2">Adres</label>
                <Textarea id="address" v-model="settingsData.address" rows="3" fluid />
            </div>
            <div class="col-span-12 md:col-span-4">
                <label for="phone" class="block font-bold mb-2">Telefon</label>
                <InputText id="phone" v-model="settingsData.phone" fluid />
            </div>
            <div class="col-span-12 md:col-span-4">
                <label for="email" class="block font-bold mb-2">E-posta</label>
                <InputText id="email" v-model="settingsData.email" fluid />
            </div>
            <div class="col-span-12 md:col-span-4">
                <label for="website" class="block font-bold mb-2">Web Sitesi</label>
                <InputText id="website" v-model="settingsData.website" fluid />
            </div>
            <div class="col-span-12">
                <Button label="Ayarları Kaydet" icon="pi pi-check" @click="saveSettings" :loading="settingsStore.loading" />
            </div>
        </div>
    </div>
</template>
