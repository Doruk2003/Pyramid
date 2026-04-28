<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { useProjectStore } from '@/modules/finance/application/project.store';
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_SEVERITIES, type ProjectStatus } from '@/modules/finance/domain/project.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, toRaw } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const projectStore = useProjectStore();
const financeStore = useFinanceStore();
const authStore = useAuthStore();
const toast = useToast();

type ExportableTable = { exportCSV: () => void };
const dt = ref<ExportableTable | null>(null);

const showForm = ref(false);
const editingProject = ref<Project | null>(null);
const deleteDialog = ref(false);
const projectToDelete = ref<Project | null>(null);
const submitted = ref(false);

// Filtreler
const showFilters = ref(false);
interface ProjectFilterForm {
    code: string;
    name: string;
    status: ProjectStatus | null;
    clientId: string | null;
}
const filterForm = ref<ProjectFilterForm>({
    code: '',
    name: '',
    status: null,
    clientId: null
});
const activeFilters = ref<ProjectFilterForm>({ ...filterForm.value });

function toggleFilters() {
    showFilters.value = !showFilters.value;
}

function applyFilters() {
    activeFilters.value = { ...filterForm.value };
}

function clearFilters() {
    filterForm.value = {
        code: '',
        name: '',
        status: null,
        clientId: null
    };
    activeFilters.value = { ...filterForm.value };
}

function exportCSV() {
    dt.value?.exportCSV();
}

// Form alanları
interface ProjectForm {
    id?: string;
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

function emptyForm(): ProjectForm {
    return {
        code: '', name: '', location: '', clientId: null,
        status: 'planning', startDate: '', endDate: '',
        budgetMaterial: 0, budgetLabor: 0, budgetEquipment: 0, budgetGeneral: 0,
        description: '', isActive: true
    };
}

const form = ref<ProjectForm>(emptyForm());

const statusOptions = [
    { label: 'Planlama',      value: 'planning' },
    { label: 'Aktif',         value: 'active' },
    { label: 'Tamamlandı',    value: 'completed' },
    { label: 'Askıya Alındı', value: 'suspended' }
];

onMounted(async () => {
    await Promise.all([
        projectStore.fetchProjects(),
        financeStore.fetchRootAccounts()  // İşveren dropdown için
    ]);
});

// toRaw: Pinia proxy'sini söküp gerçek Project instance'larına dönüştür
const allProjects = computed((): Project[] => projectStore.projects.map((p) => toRaw(p) as unknown as Project));
const rootAccounts = computed(() => financeStore.rootAccounts);

const filteredProjects = computed(() => {
    let list = allProjects.value;
    const f = activeFilters.value;

    if (f.code) {
        const query = f.code.toLowerCase();
        list = list.filter(p => p.code.toLowerCase().includes(query));
    }
    if (f.name) {
        const query = f.name.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(query));
    }
    if (f.status) {
        list = list.filter(p => p.status === f.status);
    }
    if (f.clientId) {
        list = list.filter(p => p.clientId === f.clientId);
    }
    return list;
});

// Toplam bütçe hesabı
function totalBudget(p: Project): number {
    return p.budget.material + p.budget.labor + p.budget.equipment + p.budget.general;
}

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
}

function openNew() {
    editingProject.value = null;
    form.value = emptyForm();
    submitted.value = false;
    showForm.value = true;
}

function openEdit(p: Project) {
    editingProject.value = p;
    const obj = p.toObject();
    form.value = {
        id: obj.id,
        code: obj.code,
        name: obj.name,
        location: obj.location ?? '',
        clientId: obj.clientId ?? null,
        status: obj.status,
        startDate: obj.startDate ? obj.startDate.toISOString().split('T')[0] : '',
        endDate: obj.endDate ? obj.endDate.toISOString().split('T')[0] : '',
        budgetMaterial: obj.budget.material,
        budgetLabor: obj.budget.labor,
        budgetEquipment: obj.budget.equipment,
        budgetGeneral: obj.budget.general,
        description: obj.description ?? '',
        isActive: obj.isActive
    };
    submitted.value = false;
    showForm.value = true;
}

function openDetail(p: Project) {
    router.push(`/finance/projects/${p.id}`);
}

function confirmDelete(p: Project) {
    projectToDelete.value = p;
    deleteDialog.value = true;
}

async function saveProject() {
    submitted.value = true;
    if (!form.value.code.trim() || !form.value.name.trim()) return;

    const project = Project.create({
        id: form.value.id ?? crypto.randomUUID(),
        companyId: authStore.user?.companyId ?? '',
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        location: form.value.location || undefined,
        clientId: form.value.clientId ?? undefined,
        status: form.value.status,
        startDate: form.value.startDate ? new Date(form.value.startDate) : undefined,
        endDate: form.value.endDate ? new Date(form.value.endDate) : undefined,
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
        toast.add({ severity: 'success', summary: 'Başarılı', detail: editingProject.value ? 'Proje güncellendi' : 'Proje oluşturuldu', life: 3000 });
        showForm.value = false;
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 5000 });
    }
}

async function deleteProject() {
    if (!projectToDelete.value?.id) return;
    const result = await projectStore.deleteProject(projectToDelete.value.id);
    deleteDialog.value = false;
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Silindi', detail: 'Proje silindi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Silinemedi', detail: getErrorMessage(result.error), life: 5000 });
    }
    projectToDelete.value = null;
}
</script>

<template>
    <div>
        <!-- Başlık & Araç Çubuğu -->
        <div class="card mb-4">
            <div class="m-0 text-2xl font-medium mb-3">Proje Yönetimi</div>
            <Toolbar>
                <template #start>
                    <Button label="Yeni Proje Ekle" icon="pi pi-plus" severity="primary" @click="openNew" />
                </template>
                <template #end>
                    <Button icon="pi pi-filter" severity="secondary" v-tooltip.bottom="'Filtrele'" @click="toggleFilters" class="mr-2" />
                    <Button icon="pi pi-upload" severity="secondary" v-tooltip.bottom="'Dışa Aktar'" @click="exportCSV" />
                </template>
            </Toolbar>
        </div>

        <!-- Filtre Paneli -->
        <div v-if="showFilters" class="card mb-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                    <InputText v-model="filterForm.code" placeholder="Proje Kodu" fluid />
                </div>
                <div>
                    <InputText v-model="filterForm.name" placeholder="Proje Adı" fluid />
                </div>
                <div>
                    <Select
                        v-model="filterForm.status"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Durum Seç"
                        showClear
                        fluid
                    />
                </div>
                <div>
                    <Select
                        v-model="filterForm.clientId"
                        :options="rootAccounts"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="İşveren Seç"
                        showClear
                        fluid
                    />
                </div>
                <div class="flex gap-2">
                    <Button label="Uygula" class="flex-1" @click="applyFilters" />
                    <Button label="Temizle" severity="secondary" outlined @click="clearFilters" />
                </div>
            </div>
        </div>

        <!-- Proje Kartları -->
        <div v-if="projectStore.loading" class="flex justify-center py-12">
            <ProgressSpinner />
        </div>

        <div v-else-if="filteredProjects.length === 0" class="card text-center py-12">
            <i class="pi pi-folder-open text-5xl text-surface-400 mb-3 block" />
            <p class="text-surface-500 text-lg">Arama kriterlerine uygun proje bulunamadı.</p>
            <Button v-if="allProjects.length === 0" label="İlk Projeyi Oluştur" icon="pi pi-plus" class="mt-4" @click="openNew" />
            <Button v-else label="Filtreleri Temizle" icon="pi pi-filter-slash" class="mt-4" severity="secondary" @click="clearFilters" />
        </div>

        <div v-else class="flex flex-col gap-4">
            <div
                v-for="p in filteredProjects"
                :key="p.id"
                class="card cursor-pointer hover:shadow-lg transition-shadow duration-200 p-5"
                @click="openDetail(p)"
            >
                <div class="flex flex-wrap items-center gap-6">
                    <!-- Sol: Temel Bilgiler -->
                    <div class="flex-1 min-w-[320px]">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-base text-primary font-bold font-mono">{{ p.code }}</span>
                        </div>
                        <div class="flex items-center gap-3 mb-2">
                            <div class="font-bold text-2xl leading-tight">{{ p.name }}</div>
                            <Tag
                                :value="PROJECT_STATUS_LABELS[p.status]"
                                :severity="PROJECT_STATUS_SEVERITIES[p.status]"
                                size="small"
                                class="whitespace-nowrap"
                            />
                        </div>
                        <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-surface-500">
                            <span v-if="p.location" class="flex items-center">
                                <i class="pi pi-map-marker mr-2" />{{ p.location }}
                            </span>
                            <span v-if="p.clientName" class="flex items-center">
                                <i class="pi pi-building mr-2" />{{ p.clientName }}
                            </span>
                            <span v-if="p.startDate || p.endDate" class="flex items-center">
                                <i class="pi pi-calendar mr-2" />
                                {{ p.startDate?.toLocaleDateString('tr-TR') }}
                                <i class="pi pi-arrow-right mx-3 text-[10px]" />
                                {{ p.endDate?.toLocaleDateString('tr-TR') }}
                            </span>
                        </div>
                    </div>

                    <!-- Orta: Bütçe Detayları -->
                    <div class="hidden xl:flex items-center gap-10 px-8 border-l border-surface-200 dark:border-surface-700">
                        <div class="grid grid-cols-2 gap-x-12 gap-y-2 text-base">
                            <div class="flex justify-between gap-6">
                                <span class="text-surface-500 font-medium">Malzeme:</span>
                                <span class="font-bold text-surface-700 dark:text-surface-200">{{ formatCurrency(p.budget.material) }}</span>
                            </div>
                            <div class="flex justify-between gap-6">
                                <span class="text-surface-500 font-medium">İşçilik:</span>
                                <span class="font-bold text-surface-700 dark:text-surface-200">{{ formatCurrency(p.budget.labor) }}</span>
                            </div>
                            <div class="flex justify-between gap-6">
                                <span class="text-surface-500 font-medium">Ekipman:</span>
                                <span class="font-bold text-surface-700 dark:text-surface-200">{{ formatCurrency(p.budget.equipment) }}</span>
                            </div>
                            <div class="flex justify-between gap-6">
                                <span class="text-surface-500 font-medium">Genel Gider:</span>
                                <span class="font-bold text-surface-700 dark:text-surface-200">{{ formatCurrency(p.budget.general) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sağ: Toplam Bütçe -->
                    <div class="flex flex-col items-end min-w-[180px] px-8 border-l border-surface-200 dark:border-surface-700">
                        <div class="text-[11px] text-surface-400 uppercase font-black tracking-widest mb-1">TOPLAM BÜTÇE</div>
                        <div class="text-3xl font-black text-primary">{{ formatCurrency(totalBudget(p)) }}</div>
                    </div>

                    <!-- Aksiyonlar -->
                    <div class="flex gap-2 ml-auto" @click.stop>
                        <Button icon="pi pi-eye" label="Detay" size="small" outlined @click="openDetail(p)" class="hidden md:flex" />
                        <Button icon="pi pi-pencil" size="small" outlined @click="openEdit(p)" v-tooltip.top="'Düzenle'" />
                        <Button icon="pi pi-trash" size="small" outlined severity="danger" @click="confirmDelete(p)" v-tooltip.top="'Sil'" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Proje Oluştur / Düzenle Dialog -->
        <Dialog
            v-model:visible="showForm"
            :header="editingProject ? 'Projeyi Düzenle' : 'Yeni Proje Oluştur'"
            :modal="true"
            :style="{ width: '700px' }"
        >
            <div class="grid grid-cols-2 gap-4 mt-2">
                <!-- Kod -->
                <div>
                    <label class="block font-bold mb-2">Proje Kodu <span class="text-red-500">*</span></label>
                    <InputText v-model.trim="form.code" placeholder="PRJ-2026-001" fluid :invalid="submitted && !form.code" />
                    <small v-if="submitted && !form.code" class="text-red-500">Zorunlu alan.</small>
                </div>

                <!-- Adı -->
                <div>
                    <label class="block font-bold mb-2">Proje Adı <span class="text-red-500">*</span></label>
                    <InputText v-model.trim="form.name" placeholder="Kadıköy Konut Projesi" fluid :invalid="submitted && !form.name" />
                    <small v-if="submitted && !form.name" class="text-red-500">Zorunlu alan.</small>
                </div>

                <!-- Lokasyon -->
                <div>
                    <label class="block font-bold mb-2">Lokasyon</label>
                    <InputText v-model.trim="form.location" placeholder="İstanbul / Kadıköy" fluid />
                </div>

                <!-- Durum -->
                <div>
                    <label class="block font-bold mb-2">Durum</label>
                    <Select v-model="form.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid />
                </div>

                <!-- İşveren -->
                <div class="col-span-2">
                    <label class="block font-bold mb-2">İşveren / Proje Sahibi <span class="text-surface-400 font-normal">(opsiyonel)</span></label>
                    <Select
                        v-model="form.clientId"
                        :options="rootAccounts"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Cari hesap seçin"
                        showClear
                        fluid
                    />
                </div>

                <!-- Tarihler -->
                <div>
                    <label class="block font-bold mb-2">Başlangıç Tarihi</label>
                    <InputText type="date" v-model="form.startDate" fluid />
                </div>
                <div>
                    <label class="block font-bold mb-2">Bitiş Tarihi</label>
                    <InputText type="date" v-model="form.endDate" fluid />
                </div>

                <!-- Kategorili Bütçe -->
                <div class="col-span-2">
                    <div class="font-bold mb-3 text-surface-600 dark:text-surface-300 flex items-center gap-2">
                        <i class="pi pi-chart-pie" />
                        Kategorili Bütçe (₺)
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">🧱 Malzeme</label>
                            <InputNumber v-model="form.budgetMaterial" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">👷 İşçilik</label>
                            <InputNumber v-model="form.budgetLabor" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">🏗️ Ekipman</label>
                            <InputNumber v-model="form.budgetEquipment" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">📋 Genel Gider</label>
                            <InputNumber v-model="form.budgetGeneral" mode="currency" currency="TRY" locale="tr-TR" fluid />
                        </div>
                    </div>
                    <div class="mt-2 p-2 bg-surface-100 dark:bg-surface-800 rounded text-sm">
                        Toplam Bütçe:
                        <strong class="text-primary ml-1">
                            {{ formatCurrency((form.budgetMaterial || 0) + (form.budgetLabor || 0) + (form.budgetEquipment || 0) + (form.budgetGeneral || 0)) }}
                        </strong>
                    </div>
                </div>

                <!-- Açıklama -->
                <div class="col-span-2">
                    <label class="block font-bold mb-2">Açıklama</label>
                    <Textarea v-model="form.description" rows="2" fluid />
                </div>
            </div>

            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="showForm = false" />
                <Button :label="editingProject ? 'Güncelle' : 'Kaydet'" icon="pi pi-check" @click="saveProject" />
            </template>
        </Dialog>

        <!-- Silme Onayı -->
        <Dialog v-model:visible="deleteDialog" header="Proje Silme Onayı" :modal="true" :style="{ width: '420px' }">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-4xl text-orange-500" />
                <div>
                    <p class="font-semibold mb-1">Bu projeyi silmek istediğinizden emin misiniz?</p>
                    <p class="text-surface-500 text-sm">
                        <strong>{{ projectToDelete?.name }}</strong> soft-delete ile işaretlenecek.
                        Projeye bağlı faturalar etkilenmez.
                    </p>
                </div>
            </div>
            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="deleteDialog = false" />
                <Button label="Evet, Sil" icon="pi pi-trash" severity="danger" @click="deleteProject" />
            </template>
        </Dialog>

        <!-- Hidden DataTable for Export -->
        <div style="display: none">
            <DataTable ref="dt" :value="filteredProjects">
                <Column field="code" header="Proje Kodu" />
                <Column field="name" header="Proje Adı" />
                <Column field="status" header="Durum">
                    <template #body="{ data }">{{ PROJECT_STATUS_LABELS[data.status as ProjectStatus] }}</template>
                </Column>
                <Column field="clientName" header="İşveren" />
                <Column field="location" header="Lokasyon" />
                <Column field="startDate" header="Başlangıç">
                    <template #body="{ data }">{{ data.startDate?.toLocaleDateString('tr-TR') }}</template>
                </Column>
                <Column field="endDate" header="Bitiş">
                    <template #body="{ data }">{{ data.endDate?.toLocaleDateString('tr-TR') }}</template>
                </Column>
                <Column field="budget.material" header="Bütçe: Malzeme">
                    <template #body="{ data }">{{ data.budget.material }}</template>
                </Column>
                <Column field="budget.labor" header="Bütçe: İşçilik">
                    <template #body="{ data }">{{ data.budget.labor }}</template>
                </Column>
                <Column field="budget.equipment" header="Bütçe: Ekipman">
                    <template #body="{ data }">{{ data.budget.equipment }}</template>
                </Column>
                <Column field="budget.general" header="Bütçe: Genel Gider">
                    <template #body="{ data }">{{ data.budget.general }}</template>
                </Column>
                <Column header="Toplam Bütçe">
                    <template #body="{ data }">{{ totalBudget(data) }}</template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
