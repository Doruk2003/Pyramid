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
    currency: 'TRY',
    invoiceSerial: 'AAA',
    invoiceStartingNumber: 1,
    discountLabel1: '',
    discountLabel2: '',
    discountLabel3: '',
    productSerial: 'PRD',
    productStartingNumber: 1,
    accountSerial: 'CAR',
    accountStartingNumber: 1,
    bankSerial: 'BNK',
    bankStartingNumber: 1,
    cashSerial: 'KSA',
    cashStartingNumber: 1,
    employeeSerial: 'PRS',
    employeeStartingNumber: 1
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
    <div class="card p-0 flex flex-col">
        <div class="p-6 pb-4 flex justify-between items-center border-b border-surface-200 dark:border-surface-700">
            <div class="text-2xl font-medium block">Sistem & Şirket Ayarları</div>
            <Button label="Ayarları Kaydet" icon="pi pi-save" @click="saveSettings" :loading="settingsStore.loading" />
        </div>

        <Tabs value="general">
            <TabList class="px-6 pt-2">
                <Tab value="general"><i class="pi pi-building mr-2"></i> Genel Şirket Bilgileri</Tab>
                <Tab value="finance"><i class="pi pi-calculator mr-2"></i> Finans & Fatura</Tab>
                <Tab value="inventory"><i class="pi pi-box mr-2"></i> Stok & Depo</Tab>
                <Tab value="users"><i class="pi pi-users mr-2"></i> Kullanıcılar & Yetkiler</Tab>
                <Tab value="integrations"><i class="pi pi-link mr-2"></i> Entegrasyonlar</Tab>
            </TabList>

            <TabPanels class="px-6 pb-6 pt-6">
                <TabPanel value="general">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="companyName" class="block font-bold mb-2">Şirket Adı</label>
                            <InputText id="companyName" v-model="settingsData.companyName" fluid />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="currency" class="block font-bold mb-2">Varsayılan Para Birimi</label>
                            <Select id="currency" v-model="settingsData.currency" :options="['TRY', 'USD', 'EUR']" fluid />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="taxNumber" class="block font-bold mb-2">Vergi Numarası</label>
                            <InputText id="taxNumber" v-model="settingsData.taxNumber" fluid />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="taxOffice" class="block font-bold mb-2">Vergi Dairesi</label>
                            <InputText id="taxOffice" v-model="settingsData.taxOffice" fluid />
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
                    </div>
                </TabPanel>

                <TabPanel value="finance">
                    <div class="text-xl font-medium mb-4">Numaralandırma Ayarları</div>
                    <div class="grid grid-cols-12 gap-4 mb-8">
                        <div class="col-span-12 md:col-span-6">
                            <label for="invoiceSerial" class="block font-bold mb-2">Fatura Seri (3 Karakter)</label>
                            <InputText id="invoiceSerial" v-model="settingsData.invoiceSerial" maxlength="3" fluid placeholder="Örn: ABC" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="invoiceStartingNumber" class="block font-bold mb-2">Fatura Başlangıç No</label>
                            <InputNumber id="invoiceStartingNumber" v-model="settingsData.invoiceStartingNumber" :min="1" fluid placeholder="Örn: 1" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="accountSerial" class="block font-bold mb-2">Cari Hesap Seri (3 Karakter)</label>
                            <InputText id="accountSerial" v-model="settingsData.accountSerial" maxlength="3" fluid placeholder="Örn: CAR" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="accountStartingNumber" class="block font-bold mb-2">Cari Hesap Başlangıç No</label>
                            <InputNumber id="accountStartingNumber" v-model="settingsData.accountStartingNumber" :min="1" fluid placeholder="Örn: 1" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="bankSerial" class="block font-bold mb-2">Banka Seri (3 Karakter)</label>
                            <InputText id="bankSerial" v-model="settingsData.bankSerial" maxlength="3" fluid placeholder="Örn: BNK" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="bankStartingNumber" class="block font-bold mb-2">Banka Başlangıç No</label>
                            <InputNumber id="bankStartingNumber" v-model="settingsData.bankStartingNumber" :min="1" fluid placeholder="Örn: 1" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="cashSerial" class="block font-bold mb-2">Kasa Seri (3 Karakter)</label>
                            <InputText id="cashSerial" v-model="settingsData.cashSerial" maxlength="3" fluid placeholder="Örn: KSA" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="cashStartingNumber" class="block font-bold mb-2">Kasa Başlangıç No</label>
                            <InputNumber id="cashStartingNumber" v-model="settingsData.cashStartingNumber" :min="1" fluid placeholder="Örn: 1" />
                        </div>
                    </div>

                    <div class="text-xl font-medium mb-4 border-t border-surface-200 dark:border-surface-700 pt-6">İskonto Ayarları</div>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-4">
                            <label for="discountLabel1" class="block font-bold mb-2">1. İskonto Etiketi</label>
                            <InputText id="discountLabel1" v-model="settingsData.discountLabel1" fluid placeholder="Örn: Bayi İskontosu (1)" />
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="discountLabel2" class="block font-bold mb-2">2. İskonto Etiketi</label>
                            <InputText id="discountLabel2" v-model="settingsData.discountLabel2" fluid placeholder="Örn: Bayi İskontosu (2)" />
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="discountLabel3" class="block font-bold mb-2">3. İskonto Etiketi</label>
                            <InputText id="discountLabel3" v-model="settingsData.discountLabel3" fluid placeholder="Örn: Bayi İskontosu (3)" />
                        </div>
                    </div>
                </TabPanel>

                <TabPanel value="inventory">
                    <div class="text-xl font-medium mb-4">Stok Numaralandırma Ayarları</div>
                    <div class="grid grid-cols-12 gap-4 mb-8">
                        <div class="col-span-12 md:col-span-6">
                            <label for="productSerial" class="block font-bold mb-2">Ürün Seri (3 Karakter)</label>
                            <InputText id="productSerial" v-model="settingsData.productSerial" maxlength="3" fluid placeholder="Örn: PRD" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="productStartingNumber" class="block font-bold mb-2">Ürün Başlangıç No</label>
                            <InputNumber id="productStartingNumber" v-model="settingsData.productStartingNumber" :min="1" fluid placeholder="Örn: 1" />
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-center justify-center py-8 border-t border-surface-200 dark:border-surface-700 text-surface-500">
                        <i class="pi pi-box text-6xl mb-4 text-surface-300 dark:text-surface-600"></i>
                        <div class="text-xl font-medium">Stok & Depo Parametreleri</div>
                        <p class="mt-2 text-center max-w-md">Negatif stok uyarısı, varsayılan depo, stok maliyetleme yöntemi ve diğer stok modülü ayarları yakında eklenecektir.</p>
                    </div>
                </TabPanel>

                <TabPanel value="users">
                    <div class="text-xl font-medium mb-4">Personel Numaralandırma Ayarları</div>
                    <div class="grid grid-cols-12 gap-4 mb-8">
                        <div class="col-span-12 md:col-span-6">
                            <label for="employeeSerial" class="block font-bold mb-2">Personel Seri (3 Karakter)</label>
                            <InputText id="employeeSerial" v-model="settingsData.employeeSerial" maxlength="3" fluid placeholder="Örn: PRS" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="employeeStartingNumber" class="block font-bold mb-2">Personel Başlangıç No</label>
                            <InputNumber id="employeeStartingNumber" v-model="settingsData.employeeStartingNumber" :min="1" fluid placeholder="Örn: 1" />
                        </div>
                    </div>

                    <div class="flex flex-col items-center justify-center py-8 border-t border-surface-200 dark:border-surface-700 text-surface-500">
                        <i class="pi pi-users text-6xl mb-4 text-surface-300 dark:text-surface-600"></i>
                        <div class="text-xl font-medium">Kullanıcılar & Yetkiler</div>
                        <p class="mt-2 text-center max-w-md">Kullanıcı rolleri, sisteme giriş yetkileri, şifre politikaları ve erişim kontrolleri yakında eklenecektir.</p>
                    </div>
                </TabPanel>

                <TabPanel value="integrations">
                    <div class="flex flex-col items-center justify-center py-16 text-surface-500">
                        <i class="pi pi-link text-6xl mb-4 text-surface-300 dark:text-surface-600"></i>
                        <div class="text-xl font-medium">Entegrasyonlar</div>
                        <p class="mt-2 text-center max-w-md">E-Fatura, banka hesap entegrasyonları, e-ticaret bağlantıları ve diğer 3. parti sistem ayarları yakında eklenecektir.</p>
                    </div>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>
