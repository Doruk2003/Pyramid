<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useUserStore } from '@/modules/admin/application/user.store';

const userStore = useUserStore();


// Sistem rolleri — text-based (Madde 10: ileride permission tablosuna geçilecek)
const systemRoles = [
    {
        name: 'admin',
        label: 'YÖNETİCİ',
        description: 'Tüm modüllere tam erişim. Kullanıcı ve sistem ayarlarını yönetir.',
        severity: 'danger' as const
    },
    {
        name: 'manager',
        label: 'MÜDÜR',
        description: 'Kendi birimindeki verileri okuyabilir ve yazabilir. Kullanıcı yönetimi hariç.',
        severity: 'warn' as const
    },
    {
        name: 'user',
        label: 'KULLANICI',
        description: 'Standart veri girişi ve okuma. Silme ve onaylama işlemi yapamaz.',
        severity: 'info' as const
    },
    {
        name: 'viewer',
        label: 'GÖRÜNTÜLEYICI',
        description: 'Sadece okuma yetkisi. Hiçbir veri değiştiremez.',
        severity: 'secondary' as const
    }
];

onMounted(() => {
    userStore.fetchUsers();
});

// Her rol için gerçek kullanıcı sayısını hesapla
const rolesWithCount = computed(() =>
    systemRoles.map((role) => ({
        ...role,
        userCount: userStore.users.filter((u) => u.role === role.name).length
    }))
);
</script>

<template>
    <div>
        <div class="card mb-4">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-0">
                <div class="text-2xl font-medium">Rol ve Yetki Yönetimi</div>
            </div>
            <Message severity="info" :closable="false" class="mt-3">
                <span>Roller şu an sistem tarafından sabit tanımlıdır (<code>admin</code>, <code>manager</code>, <code>user</code>, <code>viewer</code>).
                Dinamik RBAC altyapısı ilerleyen sürümde eklenecektir.</span>
            </Message>
        </div>

        <div class="card">
            <DataTable
                :value="rolesWithCount"
                dataKey="name"
                :paginator="false"
                emptyMessage="Rol bulunamadı."
            >
                <Column header="Rol" style="min-width: 140px">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.label" :severity="slotProps.data.severity" />
                    </template>
                </Column>
                <Column header="Açıklama" style="min-width: 320px">
                    <template #body="slotProps">
                        <span class="text-surface-700 dark:text-surface-300">{{ slotProps.data.description }}</span>
                    </template>
                </Column>
                <Column header="Kullanıcı Sayısı" style="min-width: 130px; text-align: center">
                    <template #body="slotProps">
                        <Badge :value="slotProps.data.userCount" :severity="slotProps.data.userCount > 0 ? 'contrast' : 'secondary'" />
                    </template>
                </Column>
                <Column header="İzinler" style="min-width: 90px; text-align: center">
                    <template #body>
                        <Button icon="pi pi-lock" severity="secondary" rounded text v-tooltip.top="'İzin yönetimi ileride aktif olacak'" disabled />
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>
