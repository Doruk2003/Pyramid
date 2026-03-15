<script setup lang="ts">
import { ref } from 'vue';

const logs = ref([
    { id: 1, user: 'admin@nexuserp.com', action: 'LOGIN', module: 'AUTH', details: 'Başarılı giriş', date: new Date().toISOString() },
    { id: 2, user: 'admin@nexuserp.com', action: 'UPDATE', module: 'SETTINGS', details: 'Şirket adı güncellendi', date: new Date().toISOString() },
    { id: 3, user: 'manager@nexuserp.com', action: 'CREATE', module: 'FINANCE', details: 'YF-2024-001 nolu fatura oluşturuldu', date: new Date().toISOString() },
    { id: 4, user: 'system', action: 'BACKUP', module: 'SYSTEM', details: 'Otomatik veritabanı yedeği alındı', date: new Date().toISOString() }
]);

const getSeverity = (action: string) => {
    switch (action) {
        case 'LOGIN': return 'success';
        case 'UPDATE': return 'info';
        case 'CREATE': return 'warn';
        case 'DELETE': return 'danger';
        default: return 'secondary';
    }
};
</script>

<template>
    <div class="card">
        <span class="text-xl font-semibold block mb-4">Sistem Logları</span>
        
        <DataTable :value="logs" paginator :rows="10" tableStyle="min-width: 50rem">
            <Column field="date" header="Tarih">
                <template #body="slotProps">
                    {{ new Date(slotProps.data.date).toLocaleString() }}
                </template>
            </Column>
            <Column field="user" header="Kullanıcı"></Column>
            <Column field="module" header="Modül">
                <template #body="slotProps">
                    <span class="font-bold">{{ slotProps.data.module }}</span>
                </template>
            </Column>
            <Column field="action" header="İşlem">
                <template #body="slotProps">
                    <Tag :value="slotProps.data.action" :severity="getSeverity(slotProps.data.action)" />
                </template>
            </Column>
            <Column field="details" header="Detaylar"></Column>
        </DataTable>
    </div>
</template>
