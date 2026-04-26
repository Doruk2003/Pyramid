<script setup lang="ts">
import { useProjectStore } from '@/modules/finance/application/project.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useAuthStore } from '@/core/auth/auth.store';
import { Project, type ProjectStatus } from '@/modules/finance/domain/project.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const projectStore = useProjectStore();
const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();
const submitted = ref(false);

interface ProjectForm {
    code: string;
    name: string;
    location: string;
    clientId: string | null;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
    budgetMaterial: number;
    budgetLabor: number;
    budgetEquipment: number;
    budgetGeneral: number;
    description: string;
    isActive: boolean;
}

const form = ref<ProjectForm>({
    code: '',
    name: '',
    location: '',
    clientId: null,
    status: 'planning',
    startDate: '',
    endDate: '',
    budgetMaterial: 0,
    budgetLabor: 0,
    budgetEquipment: 0,
    budgetGeneral: 0,
    description: '',
    isActive: true
});

const statusOptions = [
    { label: 'Planlama',       value: 'planning' },
    { label: 'Aktif',          value: 'active' },
    { label: 'Tamamlandı',     value: 'completed' },
    { label: 'Askıya Alındı',  value: 'suspended' }
];

const rootAccounts = computed(() => financeStore.rootAccounts);

const totalBudget = computed(() =>
    (form.value.budgetMaterial || 0)
    + (form.value.budgetLabor || 0)
    + (form.value.budgetEquipment || 0)
    + (form.value.budgetGeneral || 0)
);

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
}

onMounted(async () => {
    await financeStore.fetchRootAccounts();
});

async function save() {
    submitted.value = true;
    if (!form.value.code.trim() || !form.value.name.trim()) return;

    const project = Project.create({
        id: crypto.randomUUID(),
        companyId: authStore.user?.companyId ?? '',
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        location: form.value.location || undefined,
        clientId: form.value.clientId ?? undefined,
        status: form.value.status,
        startDate: form.value.startDate ? new Date(form.value.startDate) : undefined,
        endDate:   form.value.endDate   ? new Date(form.value.endDate)   : undefined,
        budget: {
            material:  form.value.budgetMaterial,
            labor:     form.value.budgetLabor,
            equipment: form.value.budgetEquipment,
            general:   form.value.budgetGeneral
        },
        description: form.value.description || undefined,
        isActive: form.value.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const result = await projectStore.saveProject(project);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Proje oluşturuldu', life: 3000 });
        router.push('/finance/projects');
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 5000 });
    }
}

function goBack() {
    router.push('/finance/projects');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <!-- Başlık -->
        <div class="card p-6 min-h-28 flex flex-col gap-1">
            <div class="m-0 text-2xl font-medium">Yeni Proje</div>
            <div class="text-surface-600 dark:text-surface-400">
                <p>Proje bilgilerini ve bütçe kırılımını buradan tanımlayabilirsiniz.</p>
            </div>
        </div>

        <div class="card">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                <!-- Proje Kodu -->
                <div>
                    <label for="code" class="block font-bold mb-2">
                        Proje Kodu <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="code"
                        v-model.trim="form.code"
                        placeholder="PRJ-2026-001"
                        fluid
                        :invalid="submitted && !form.code"
                    />
                    <small v-if="submitted && !form.code" class="text-red-500">Zorunlu alan.</small>
                </div>

                <!-- Proje Adı -->
                <div>
                    <label for="name" class="block font-bold mb-2">
                        Proje Adı <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="name"
                        v-model.trim="form.name"
                        placeholder="Kadıköy Konut Projesi"
                        fluid
                        :invalid="submitted && !form.name"
                    />
                    <small v-if="submitted && !form.name" class="text-red-500">Zorunlu alan.</small>
                </div>

                <!-- Lokasyon -->
                <div>
                    <label for="location" class="block font-bold mb-2">Lokasyon</label>
                    <InputText id="location" v-model.trim="form.location" placeholder="İstanbul / Kadıköy" fluid />
                </div>

                <!-- Durum -->
                <div>
                    <label for="status" class="block font-bold mb-2">Durum</label>
                    <Select id="status" v-model="form.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <!-- İşveren / Proje Sahibi -->
                <div class="md:col-span-2">
                    <label for="client" class="block font-bold mb-2">
                        İşveren / Proje Sahibi
                        <span class="text-surface-400 font-normal ml-1">(opsiyonel)</span>
                    </label>
                    <Select
                        id="client"
                        v-model="form.clientId"
                        :options="rootAccounts"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Cari hesap seçin"
                        showClear
                        filter
                        fluid
                    />
                </div>

                <!-- Tarihler -->
                <div>
                    <label for="startDate" class="block font-bold mb-2">Başlangıç Tarihi</label>
                    <InputText id="startDate" type="date" v-model="form.startDate" fluid />
                </div>
                <div>
                    <label for="endDate" class="block font-bold mb-2">Bitiş Tarihi</label>
                    <InputText id="endDate" type="date" v-model="form.endDate" fluid />
                </div>

                <!-- Kategorili Bütçe -->
                <div class="md:col-span-2">
                    <div class="font-bold mb-4 text-surface-600 dark:text-surface-300 flex items-center gap-2">
                        <i class="pi pi-chart-pie text-primary" />
                        Kategorili Bütçe
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">🧱 Malzeme Bütçesi</label>
                            <InputNumber v-model="form.budgetMaterial" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">👷 İşçilik Bütçesi</label>
                            <InputNumber v-model="form.budgetLabor" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">🏗️ Ekipman Bütçesi</label>
                            <InputNumber v-model="form.budgetEquipment" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">📋 Genel Gider Bütçesi</label>
                            <InputNumber v-model="form.budgetGeneral" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                    </div>
                    <!-- Toplam özet -->
                    <div class="mt-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg flex justify-between items-center">
                        <span class="font-semibold text-surface-600 dark:text-surface-300">Toplam Bütçe</span>
                        <span class="text-xl font-bold text-primary">{{ formatCurrency(totalBudget) }}</span>
                    </div>
                </div>

                <!-- Açıklama -->
                <div class="md:col-span-2">
                    <label for="description" class="block font-bold mb-2">Açıklama</label>
                    <Textarea id="description" v-model="form.description" rows="3" fluid />
                </div>
            </div>

            <!-- Aksiyon Butonları -->
            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-6">
                    <Button label="İptal" icon="pi pi-times" severity="secondary" class="w-full" @click="goBack" />
                </div>
                <div class="col-span-6">
                    <Button label="Kaydet" icon="pi pi-check" class="w-full" @click="save" />
                </div>
            </div>
        </div>
    </div>
</template>
