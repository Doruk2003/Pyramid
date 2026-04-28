<script setup lang="ts">
import { useProjectStore } from '@/modules/finance/application/project.store';
import { useFinanceStore } from '@/modules/finance/application/finance.store';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_SEVERITIES } from '@/modules/finance/domain/project.entity';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const projectStore = useProjectStore();
const financeStore = useFinanceStore();

const projectId = route.params.id as string;

onMounted(async () => {
    await Promise.all([
        projectStore.fetchProjectById(projectId),
        projectStore.fetchCostSummary(projectId),
        financeStore.fetchInvoices({ accountId: undefined })
    ]);
});

const project = computed(() => projectStore.activeProject);
const summary = computed(() => projectStore.costSummary);

// Projeye bağlı faturalar — store'daki tüm faturalardan filtrele
const projectInvoices = computed(() =>
    financeStore.invoices.filter((inv) => inv.projectId === projectId)
);

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
}

function formatDate(d?: Date): string {
    if (!d) return '-';
    return d.toLocaleDateString('tr-TR');
}

// Bütçe doluluk oranı (%)
const budgetUsagePct = computed(() => {
    if (!summary.value) return 0;
    const total = summary.value.totalBudget;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((summary.value.actualCost / total) * 100));
});

// Progress bar rengi
const progressSeverity = computed(() => {
    const pct = budgetUsagePct.value;
    if (pct >= 90) return 'danger';
    if (pct >= 70) return 'warn';
    return 'success';
});

// Kalan bütçe
const remainingBudget = computed(() => {
    if (!summary.value) return 0;
    return summary.value.totalBudget - summary.value.actualCost;
});

function goBack() {
    router.push('/finance/projects');
}
</script>

<template>
    <div>
        <!-- Geri Butonu -->
        <div class="mb-4">
            <Button icon="pi pi-arrow-left" label="Projelere Dön" text @click="goBack" />
        </div>

        <!-- Yükleniyor -->
        <div v-if="projectStore.loading" class="flex justify-center py-16">
            <ProgressSpinner />
        </div>

        <template v-else-if="project">
            <!-- Proje Başlığı -->
            <div class="card mb-4">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div class="text-xs font-mono text-surface-400 mb-1">{{ project.code }}</div>
                        <div class="text-2xl font-bold">{{ project.name }}</div>
                        <div v-if="project.location" class="text-surface-500 mt-1">
                            <i class="pi pi-map-marker mr-1" />{{ project.location }}
                        </div>
                        <div v-if="project.clientName" class="text-surface-500 mt-1 text-sm">
                            <i class="pi pi-building mr-1" />İşveren: {{ project.clientName }}
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <Tag
                            :value="PROJECT_STATUS_LABELS[project.status]"
                            :severity="PROJECT_STATUS_SEVERITIES[project.status]"
                            class="text-base px-3 py-1"
                        />
                        <Button
                            icon="pi pi-pencil"
                            label="Düzenle"
                            outlined
                            size="small"
                            @click="router.push('/finance/projects')"
                        />
                    </div>
                </div>

                <!-- Tarihler -->
                <div class="flex gap-6 mt-4 text-sm text-surface-500">
                    <span><i class="pi pi-calendar mr-1" />Başlangıç: <strong>{{ formatDate(project.startDate) }}</strong></span>
                    <span><i class="pi pi-calendar-times mr-1" />Bitiş: <strong>{{ formatDate(project.endDate) }}</strong></span>
                </div>
            </div>

            <!-- Özet Kartlar -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="card text-center">
                    <div class="text-surface-400 text-xs font-semibold uppercase mb-2">Toplam Bütçe</div>
                    <div class="text-xl font-bold text-primary">{{ formatCurrency(summary?.totalBudget ?? 0) }}</div>
                </div>
                <div class="card text-center">
                    <div class="text-surface-400 text-xs font-semibold uppercase mb-2">Gerçekleşen Maliyet</div>
                    <div class="text-xl font-bold text-orange-500">{{ formatCurrency(summary?.actualCost ?? 0) }}</div>
                </div>
                <div class="card text-center">
                    <div class="text-surface-400 text-xs font-semibold uppercase mb-2">Kalan Bütçe</div>
                    <div class="text-xl font-bold" :class="remainingBudget >= 0 ? 'text-green-500' : 'text-red-500'">
                        {{ formatCurrency(remainingBudget) }}
                    </div>
                </div>
                <div class="card text-center">
                    <div class="text-surface-400 text-xs font-semibold uppercase mb-2">Bütçe Kullanımı</div>
                    <div class="text-xl font-bold">{{ budgetUsagePct }}%</div>
                </div>
            </div>

            <!-- İlerleme Çubuğu -->
            <div class="card mb-4">
                <div class="flex justify-between text-sm mb-2">
                    <span class="font-semibold">Bütçe Kullanım Oranı</span>
                    <span>{{ formatCurrency(summary?.actualCost ?? 0) }} / {{ formatCurrency(summary?.totalBudget ?? 0) }}</span>
                </div>
                <ProgressBar :value="budgetUsagePct" :class="`p-progressbar-${progressSeverity}`" />
                <div v-if="budgetUsagePct >= 90" class="mt-2 text-red-500 text-sm flex items-center gap-1">
                    <i class="pi pi-exclamation-triangle" />
                    Bütçe limitine yaklaşıldı!
                </div>
            </div>

            <!-- Kategorili Bütçe Dağılımı -->
            <div class="card mb-4">
                <div class="font-semibold text-lg mb-4 flex items-center gap-2">
                    <i class="pi pi-chart-pie text-primary" />
                    Kategorili Bütçe Dağılımı
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                        <div class="text-2xl mb-1">🧱</div>
                        <div class="text-xs text-surface-400 mb-1">Malzeme</div>
                        <div class="font-bold text-blue-600 dark:text-blue-400">{{ formatCurrency(project.budget.material) }}</div>
                        <div class="text-xs text-surface-400 mt-1">
                            {{ summary?.totalBudget ? Math.round((project.budget.material / summary.totalBudget) * 100) : 0 }}%
                        </div>
                    </div>
                    <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <div class="text-2xl mb-1">👷</div>
                        <div class="text-xs text-surface-400 mb-1">İşçilik</div>
                        <div class="font-bold text-green-600 dark:text-green-400">{{ formatCurrency(project.budget.labor) }}</div>
                        <div class="text-xs text-surface-400 mt-1">
                            {{ summary?.totalBudget ? Math.round((project.budget.labor / summary.totalBudget) * 100) : 0 }}%
                        </div>
                    </div>
                    <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                        <div class="text-2xl mb-1">🏗️</div>
                        <div class="text-xs text-surface-400 mb-1">Ekipman</div>
                        <div class="font-bold text-orange-600 dark:text-orange-400">{{ formatCurrency(project.budget.equipment) }}</div>
                        <div class="text-xs text-surface-400 mt-1">
                            {{ summary?.totalBudget ? Math.round((project.budget.equipment / summary.totalBudget) * 100) : 0 }}%
                        </div>
                    </div>
                    <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                        <div class="text-2xl mb-1">📋</div>
                        <div class="text-xs text-surface-400 mb-1">Genel Gider</div>
                        <div class="font-bold text-purple-600 dark:text-purple-400">{{ formatCurrency(project.budget.general) }}</div>
                        <div class="text-xs text-surface-400 mt-1">
                            {{ summary?.totalBudget ? Math.round((project.budget.general / summary.totalBudget) * 100) : 0 }}%
                        </div>
                    </div>
                </div>
            </div>

            <!-- Projeye Bağlı Faturalar -->
            <div class="card">
                <div class="font-semibold text-lg mb-4 flex items-center gap-2">
                    <i class="pi pi-file-pdf text-primary" />
                    Bu Projeye Ait Faturalar
                    <Tag :value="String(projectInvoices.length)" severity="info" class="ml-2" />
                </div>

                <DataTable
                    :value="projectInvoices"
                    size="small"
                    :paginator="projectInvoices.length > 10"
                    :rows="10"
                >
                    <template #empty>
                        <div class="text-center py-6 text-surface-500">
                            <i class="pi pi-inbox text-3xl mb-2 block" />
                            Bu projeye bağlı fatura bulunamadı.
                        </div>
                    </template>
                    <Column field="invoiceNumber" header="Fatura No" />
                    <Column field="invoiceType" header="Tip">
                        <template #body="{ data }">
                            <Tag
                                :value="data.invoiceType === 'purchase' ? 'Alış' : 'Satış'"
                                :severity="data.invoiceType === 'purchase' ? 'warn' : 'info'"
                            />
                        </template>
                    </Column>
                    <Column field="issueDate" header="Tarih">
                        <template #body="{ data }">{{ formatDate(data.issueDate) }}</template>
                    </Column>
                    <Column field="status" header="Durum">
                        <template #body="{ data }">
                            <Tag
                                :value="data.status === 'draft' ? 'Taslak' : data.status === 'issued' ? 'Kesildi' : data.status === 'paid' ? 'Ödendi' : 'İptal'"
                                :severity="data.status === 'draft' ? 'secondary' : data.status === 'issued' ? 'info' : data.status === 'paid' ? 'success' : 'danger'"
                            />
                        </template>
                    </Column>
                    <Column field="total" header="Tutar">
                        <template #body="{ data }">{{ formatCurrency(data.total) }}</template>
                    </Column>
                    <Column field="currency" header="Döviz" />
                </DataTable>
            </div>
        </template>

        <div v-else class="card text-center py-16">
            <i class="pi pi-exclamation-circle text-5xl text-surface-400 mb-3 block" />
            <p class="text-surface-500">Proje bulunamadı.</p>
            <Button label="Geri Dön" icon="pi pi-arrow-left" class="mt-4" @click="goBack" />
        </div>
    </div>
</template>
