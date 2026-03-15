<script setup lang="ts">
import { ref } from 'vue';

const roles = ref([
    { id: '1', name: 'admin', description: 'Tüm yetkilere sahip yönetici', userCount: 2 },
    { id: '2', name: 'manager', description: 'Birim bazlı yönetim yetkisi', userCount: 5 },
    { id: '3', name: 'user', description: 'Standart kullanıcı erişimi', userCount: 12 }
]);

const getBadgeSeverity = (role: string) => {
    switch (role) {
        case 'admin': return 'danger';
        case 'manager': return 'warn';
        case 'user': return 'info';
        case 'viewer': return 'secondary';
        default: return 'secondary';
    }
};
</script>

<template>
    <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span class="text-xl font-semibold">Rol ve Yetki Yönetimi</span>
            <Button label="Yeni Rol" icon="pi pi-plus" size="small" severity="secondary" />
        </div>

        <DataTable :value="roles" tableStyle="min-width: 50rem">
            <Column field="name" header="Rol Adı">
                <template #body="slotProps">
                    <Tag :value="slotProps.data.name.toUpperCase()" :severity="getBadgeSeverity(slotProps.data.name)" />
                </template>
            </Column>
            <Column field="description" header="Açıklama"></Column>
            <Column field="userCount" header="Kullanıcı Sayısı"></Column>
            <Column header="İşlemler">
                <template #body>
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" severity="secondary" rounded variant="text" />
                        <Button icon="pi pi-lock" severity="help" rounded variant="text" tooltip="Yetkileri Düzenle" />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
