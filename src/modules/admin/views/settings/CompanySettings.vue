<script setup lang="ts">
import { useSettingsStore } from '@/modules/admin/application/settings.store';
import { CompanySettings, type CompanySettingsProps } from '@/modules/admin/domain/settings.entity';
import { useInventoryStore } from '@/modules/inventory/application/inventory.store';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const settingsStore = useSettingsStore();
const inventoryStore = useInventoryStore();
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
    employeeStartingNumber: 1,
    allowNegativeStock: false,
    defaultPurchaseWarehouseId: undefined,
    defaultSalesWarehouseId: undefined
});

onMounted(async () => {
    await Promise.all([
        settingsStore.fetchSettings(),
        inventoryStore.fetchWarehouses()
    ]);
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

const fileInput = ref<HTMLInputElement | null>(null);

const onLogoSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        const file = target.files[0];
        
        // Boyut kontrolü (örn: max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.add({ severity: 'warn', summary: 'Dosya Boyutu', detail: 'Logo boyutu 2MB\'dan küçük olmalıdır.', life: 3000 });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            settingsData.value.logoUrl = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
};

const triggerFileInput = () => {
    fileInput.value?.click();
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
                    <div class="grid grid-cols-12 gap-6">
                        <!-- Şirket Bilgileri (SOL) -->
                        <div class="col-span-12 md:col-span-8 grid grid-cols-12 gap-4">
                            <div class="col-span-12 md:col-span-8">
                                <label for="companyName" class="block font-bold mb-2">Şirket Adı</label>
                                <InputText id="companyName" v-model="settingsData.companyName" fluid />
                            </div>
                            <div class="col-span-12 md:col-span-4">
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

                        <!-- Şirket Logosu (SAĞ) -->
                        <div class="col-span-12 md:col-span-4">
                            <div class="flex flex-col items-center justify-center p-6 bg-surface-50 dark:bg-surface-900 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 sticky top-4">
                                <div class="text-lg font-bold mb-4 w-full text-center border-b pb-2">Şirket Logosu</div>
                                
                                <div class="relative group w-48 h-48 mb-6 overflow-hidden rounded-xl bg-white flex items-center justify-center border-2 border-surface-200 shadow-sm">
                                    <img v-if="settingsData.logoUrl" :src="settingsData.logoUrl" alt="Logo Preview" class="max-w-full max-h-full object-contain p-2" />
                                    <div v-else class="flex flex-col items-center gap-2 text-surface-400">
                                        <i class="pi pi-image text-5xl"></i>
                                        <span class="text-sm">Logo Seçilmedi</span>
                                    </div>
                                    
                                    <!-- Hover Overlay -->
                                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" @click="triggerFileInput">
                                        <i class="pi pi-camera text-3xl text-white"></i>
                                    </div>
                                </div>

                                <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="onLogoSelect" />
                                
                                <div class="flex flex-col gap-3 w-full">
                                    <Button label="Logo Seç" icon="pi pi-upload" severity="primary" class="w-full" @click="triggerFileInput" />
                                    <Button v-if="settingsData.logoUrl" label="Logoyu Kaldır" icon="pi pi-trash" severity="danger" text class="w-full" @click="settingsData.logoUrl = ''" />
                                </div>

                                <div class="mt-4 text-xs text-surface-500 text-center leading-relaxed">
                                    Fatura ve raporlarınızda görünecek resmi şirket logonuzu buradan yükleyebilirsiniz.<br>
                                    <span class="font-bold">(PNG, JPG veya SVG)</span>
                                </div>
                            </div>
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
                    
                    <div class="text-xl font-medium mb-4 border-t border-surface-200 dark:border-surface-700 pt-6">Stok Parametreleri</div>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
                            <div class="flex flex-col gap-1">
                                <span class="font-bold">Negatif Stoka İzin Ver</span>
                                <span class="text-sm text-surface-500 text-pretty max-w-lg">
                                    Bu seçenek aktif olduğunda, stokta yeterli ürün olmasa bile fatura kesilmesine izin verilir. 
                                    Pasif olduğunda ise sistem kullanıcıyı engelleyecektir.
                                </span>
                            </div>
                            <ToggleSwitch v-model="settingsData.allowNegativeStock" />
                        </div>
                    </div>

                    <div class="text-xl font-medium mb-4 border-t border-surface-200 dark:border-surface-700 pt-6">Varsayılan Depo Seçimleri</div>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="defaultPurchaseWarehouse" class="block font-bold mb-2">Alış Faturaları İçin Varsayılan Depo</label>
                            <Select
                                id="defaultPurchaseWarehouse"
                                v-model="settingsData.defaultPurchaseWarehouseId"
                                :options="inventoryStore.warehouses"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Varsayılan depo seçin"
                                showClear
                                fluid
                                :loading="inventoryStore.loading"
                            />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="defaultSalesWarehouse" class="block font-bold mb-2">Satış Faturaları İçin Varsayılan Depo</label>
                            <Select
                                id="defaultSalesWarehouse"
                                v-model="settingsData.defaultSalesWarehouseId"
                                :options="inventoryStore.warehouses"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Varsayılan depo seçin"
                                showClear
                                fluid
                                :loading="inventoryStore.loading"
                            />
                        </div>
                        <div class="col-span-12">
                            <div class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                                <i class="pi pi-info-circle"></i>
                                <span>Yeni bir belge oluşturulduğunda bu depo otomatik seçilir. Form üzerinden her zaman değiştirilebilir.</span>
                            </div>
                        </div>
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
