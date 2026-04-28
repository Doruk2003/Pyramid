<script setup>
import { onMounted } from 'vue';
import { useTodoStore } from '@/modules/todo/application/todo.store';
import { useRouter } from 'vue-router';

const todoStore = useTodoStore();
const router = useRouter();

onMounted(async () => {
    if (todoStore.tasks.length === 0) {
        await todoStore.fetchTasks();
    }
});

const getPriorityColor = (priority) => {
    switch (priority) {
        case 'low': return 'text-blue-500 bg-blue-100 dark:bg-blue-400/10';
        case 'normal': return 'text-green-500 bg-green-100 dark:bg-green-400/10';
        case 'high': return 'text-orange-500 bg-orange-100 dark:bg-orange-400/10';
        case 'urgent': return 'text-red-500 bg-red-100 dark:bg-red-400/10';
        default: return 'text-surface-500 bg-surface-100';
    }
};

const getPriorityIcon = (priority) => {
    switch (priority) {
        case 'urgent': return 'pi pi-exclamation-circle';
        case 'high': return 'pi pi-exclamation-triangle';
        default: return 'pi pi-calendar';
    }
};
</script>

<template>
    <div class="card h-full">
        <div class="flex items-center justify-between mb-6">
            <div class="font-semibold text-xl">Günlük Hatırlatmalar</div>
            <Button icon="pi pi-external-link" text rounded @click="router.push('/todo/calendar')" v-tooltip.top="'Tümünü Gör'" />
        </div>

        <div v-if="todoStore.loading && todoStore.tasks.length === 0" class="flex flex-col gap-4">
            <Skeleton v-for="i in 3" :key="i" height="3rem" borderRadius="12px"></Skeleton>
        </div>

        <div v-else-if="todoStore.todayTasks.length > 0">
            <span class="block text-muted-color font-medium mb-4 uppercase text-xs tracking-wider">BUGÜN</span>
            <ul class="p-0 mx-0 mt-0 mb-6 list-none">
                <li v-for="task in todoStore.todayTasks" :key="task.id" 
                    class="flex items-center py-3 border-b border-surface last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-900/50 cursor-pointer transition-colors px-2 rounded-xl"
                    @click="router.push('/todo/calendar')">
                    <div :class="['w-10 h-10 flex items-center justify-center rounded-full mr-4 shrink-0', getPriorityColor(task.priority)]">
                        <i :class="[getPriorityIcon(task.priority), 'text-lg!']"></i>
                    </div>
                    <div class="flex flex-col flex-1">
                        <span class="text-surface-900 dark:text-surface-0 font-medium leading-tight mb-1" :class="{ 'line-through opacity-50': task.status === 'completed' }">
                            {{ task.title }}
                        </span>
                        <div class="flex items-center gap-2">
                             <span class="text-xs text-muted-color">
                                <i class="pi pi-clock text-[10px]"></i> {{ task.isAllDay ? 'Tüm Gün' : new Date(task.startDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }}
                            </span>
                            <span v-if="task.status === 'completed'" class="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">Tamamlandı</span>
                        </div>
                    </div>
                </li>
            </ul>
        </div>

        <div v-if="todoStore.pendingTasks.length > todoStore.todayTasks.length" class="mt-4">
            <span class="block text-muted-color font-medium mb-4 uppercase text-xs tracking-wider">GELECEK / DİĞER</span>
            <ul class="p-0 m-0 list-none">
                <li v-for="task in todoStore.pendingTasks.filter(t => !todoStore.todayTasks.includes(t)).slice(0, 3)" :key="task.id" 
                class="flex items-center py-3 border-b border-surface last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-900/50 cursor-pointer transition-colors px-2 rounded-xl"
                @click="router.push('/todo/calendar')">
                    <div class="w-2 h-8 rounded-full mr-4" :style="{ backgroundColor: task.color || '#ccc' }"></div>
                    <div class="flex flex-col">
                        <span class="text-surface-700 dark:text-surface-200 text-sm font-medium">{{ task.title }}</span>
                        <span class="text-[10px] text-muted-color">{{ new Date(task.startDate).toLocaleDateString('tr-TR') }}</span>
                    </div>
                </li>
            </ul>
        </div>

        <div v-if="todoStore.todayTasks.length === 0 && todoStore.pendingTasks.length === 0" class="flex flex-col items-center justify-center py-8 opacity-60">
            <i class="pi pi-check-circle text-4xl mb-3 text-primary"></i>
            <p class="text-sm font-medium">Yapılacak iş kalmadı!</p>
            <Button label="Yeni Ekle" text size="small" @click="router.push('/todo/calendar')" />
        </div>
    </div>
</template>
