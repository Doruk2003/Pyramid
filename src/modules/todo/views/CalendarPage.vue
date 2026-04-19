<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTodoStore } from '../application/todo.store';
import { Task, TaskPriority, TaskStatus } from '../domain/task.entity';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const todoStore = useTodoStore();
const toast = useToast();
const confirm = useConfirm();

const selectedDate = ref(new Date());
const showDialog = ref(false);
const editingTask = ref<any>(null);

const newTask = ref({
    title: '',
    description: '',
    startDate: new Date(),
    isAllDay: false,
    priority: 'normal' as TaskPriority,
    status: 'pending' as TaskStatus,
    color: '#3B82F6'
});

const priorities = [
    { label: 'Düşük', value: 'low', color: 'bg-blue-500' },
    { label: 'Normal', value: 'normal', color: 'bg-green-500' },
    { label: 'Yüksek', value: 'high', color: 'bg-orange-500' },
    { label: 'Acil', value: 'urgent', color: 'bg-red-500' }
];

onMounted(async () => {
    await todoStore.fetchTasks();
});

const tasksForSelectedDate = computed(() => {
    return todoStore.tasks.filter(t => {
        const tDate = new Date(t.startDate).toDateString();
        const sDate = selectedDate.value.toDateString();
        return tDate === sDate;
    });
});

const openNew = () => {
    editingTask.value = null;
    newTask.value = {
        title: '',
        description: '',
        startDate: new Date(selectedDate.value),
        isAllDay: false,
        priority: 'normal',
        status: 'pending',
        color: '#3B82F6'
    };
    showDialog.value = true;
};

const editTask = (task: Task) => {
    editingTask.value = task;
    newTask.value = {
        title: task.title,
        description: task.description || '',
        startDate: new Date(task.startDate),
        isAllDay: task.isAllDay,
        priority: task.priority,
        status: task.status,
        color: task.color || '#3B82F6'
    };
    showDialog.value = true;
};

const saveTask = async () => {
    if (!newTask.value.title) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Başlık gereklidir', life: 3000 });
        return;
    }

    const payload = {
        ...newTask.value,
        ...(editingTask.value ? { id: editingTask.value.id } : {})
    };

    const result = await todoStore.saveTask(payload as any);
    if (result && result.success) {
        showDialog.value = false;
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Görev kaydedildi', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: todoStore.error || 'Kaydedilemedi', life: 3000 });
    }
};

const completeTask = async (id: string) => {
    const result = await todoStore.completeTask(id);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Görev tamamlandı', life: 3000 });
    }
};

const deleteTask = (id: string) => {
    confirm.require({
        message: 'Bu görevi silmek istediğinize emin misiniz?',
        header: 'Onay',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: 'Sil', severity: 'danger' },
        rejectProps: { label: 'Vazgeç', severity: 'secondary' },
        accept: async () => {
            const result = await todoStore.deleteTask(id);
            if (result.success) {
                toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Görev silindi', life: 3000 });
            }
        }
    });
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'completed': return 'Tamamlandı';
        case 'cancelled': return 'İptal Edildi';
        default: return 'Bekliyor';
    }
};

const getPriorityClass = (priority: string) => {
    switch (priority) {
        case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
        case 'normal': return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
        case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
        case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
        default: return '';
    }
};
</script>

<template>
    <div class="card p-0 overflow-hidden border-none shadow-xl bg-surface-0 dark:bg-surface-900 radius-2xl">
        <div class="grid grid-cols-12 min-h-[600px]">
            <!-- SOL PANEL: Takvim ve İstatistikler -->
            <div class="col-span-12 lg:col-span-4 xl:col-span-3 border-r border-surface-200 dark:border-surface-700 p-6 bg-surface-50/50 dark:bg-surface-950/20">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Ajanda</h2>
                    <Button icon="pi pi-plus" rounded severity="primary" @click="openNew" v-tooltip.bottom="'Yeni Görev Ekle'" />
                </div>

                <Calendar v-model="selectedDate" inline class="w-full mb-6 custom-calendar" />

                <div class="mt-8">
                    <h3 class="font-semibold mb-4 flex items-center gap-2">
                        <i class="pi pi-chart-bar text-primary"></i>
                        Özet
                    </h3>
                    <div class="space-y-4">
                        <div class="p-4 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-between">
                            <span class="text-muted-color">Bugünkü Görevler</span>
                            <span class="font-bold text-xl">{{ todoStore.todayTasks.length }}</span>
                        </div>
                        <div class="p-4 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-between">
                            <span class="text-muted-color">Bekleyenler</span>
                            <span class="font-bold text-xl text-orange-500">{{ todoStore.pendingTasks.length }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SAĞ PANEL: Görev Listesi -->
            <div class="col-span-12 lg:col-span-8 xl:col-span-9 p-6">
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-extrabold text-surface-900 dark:text-surface-0 mb-1">
                            {{ selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                        </h1>
                        <p class="text-muted-color">{{ tasksForSelectedDate.length }} görev planlandı</p>
                    </div>
                    <div class="flex gap-2">
                        <Button icon="pi pi-sync" severity="secondary" rounded text @click="todoStore.fetchTasks()" />
                    </div>
                </div>

                <div v-if="tasksForSelectedDate.length > 0" class="space-y-4">
                    <div v-for="task in tasksForSelectedDate" :key="task.id" 
                        class="task-card p-4 bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl hover:shadow-lg transition-all duration-300 flex items-center gap-4 group">
                        
                        <div class="w-2 h-12 rounded-full" :style="{ backgroundColor: task.color || '#3B82F6' }"></div>
                        
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-1">
                                <h4 :class="['text-lg font-bold', { 'line-through opacity-50': task.status === 'completed' }]">
                                    {{ task.title }}
                                </h4>
                                <span :class="['px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider', getPriorityClass(task.priority)]">
                                    {{ priorities.find(p => p.value === task.priority)?.label }}
                                </span>
                            </div>
                            <p class="text-muted-color text-sm">{{ task.description || 'Açıklama yok' }}</p>
                        </div>

                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button v-if="task.status === 'pending'" icon="pi pi-check" severity="success" rounded text @click="completeTask(task.id)" v-tooltip.top="'Tamamla'" />
                            <Button icon="pi pi-pencil" severity="secondary" rounded text @click="editTask(task)" v-tooltip.top="'Düzenle'" />
                            <Button icon="pi pi-trash" severity="danger" rounded text @click="deleteTask(task.id)" v-tooltip.top="'Sil'" />
                        </div>
                    </div>
                </div>

                <div v-else class="flex flex-col items-center justify-center py-20 bg-surface-50 dark:bg-surface-950/50 rounded-3xl border-2 border-dashed border-surface-200 dark:border-surface-800">
                    <div class="w-20 h-20 bg-surface-200 dark:bg-surface-800 rounded-full flex items-center justify-center mb-4">
                        <i class="pi pi-calendar-plus text-4xl text-muted-color"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Harika! Bugün için planlanan başka bir şey yok.</h3>
                    <p class="text-muted-color mb-6">Yeni bir görev ekleyerek güne başlayın.</p>
                    <Button label="Görev Oluştur" icon="pi pi-plus" severity="primary" @click="openNew" />
                </div>
            </div>
        </div>

        <!-- YENİ/DÜZENLE DİALOG -->
        <Dialog v-model:visible="showDialog" :header="editingTask ? 'Görevi Düzenle' : 'Yeni Görev'" modal class="w-full max-w-md mx-4">
            <div class="flex flex-col gap-6 pt-2">
                <div class="flex flex-col gap-2">
                    <label for="title" class="font-bold">Başlık</label>
                    <InputText id="title" v-model="newTask.title" placeholder="Ne yapacaksınız?" fluid />
                </div>
                
                <div class="flex flex-col gap-2">
                    <label for="desc" class="font-bold">Açıklama</label>
                    <Textarea id="desc" v-model="newTask.description" rows="3" fluid />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-bold">Tarih</label>
                        <Calendar v-model="newTask.startDate" dateFormat="dd.mm.yy" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-bold">Öncelik</label>
                        <Select v-model="newTask.priority" :options="priorities" optionLabel="label" optionValue="value" fluid />
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <Checkbox v-model="newTask.isAllDay" :binary="true" inputId="isAllDay" />
                    <label for="isAllDay">Tüm Gün</label>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-bold">Renk</label>
                    <div class="flex gap-2">
                        <div v-for="c in ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']" :key="c" 
                            class="w-10 h-10 rounded-full cursor-pointer border-2 transition-all"
                            :class="{ 'border-surface-900 scale-110': newTask.color === c, 'border-transparent': newTask.color !== c }"
                            :style="{ backgroundColor: c }"
                            @click="newTask.color = c">
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Vazgeç" text severity="secondary" @click="showDialog = false" />
                <Button label="Kaydet" severity="primary" @click="saveTask" :loading="todoStore.loading" />
            </template>
        </Dialog>

        <Toast />
        <ConfirmDialog />
    </div>
</template>

<style scoped>
.custom-calendar :deep(.p-calendar-content) {
    background: transparent;
    border: none;
}
.custom-calendar :deep(.p-datepicker-inline) {
    background: transparent;
    border: none;
    padding: 0;
}
.task-card {
    transition: transform 0.2s;
}
.task-card:hover {
    transform: translateX(4px);
}
</style>
