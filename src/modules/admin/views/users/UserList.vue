<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useUserStore } from '@/modules/admin/application/user.store';
import { User } from '@/modules/admin/domain/user.entity';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const toast = useToast();

const userDialog = ref(false);
const deleteUserDialog = ref(false);
const user = ref<any>({});
const submitted = ref(false);
const isEditMode = ref(false); // true → güncelleme, false → yeni oluşturma

const roles = ref([
    { label: 'ADMIN', value: 'admin' },
    { label: 'MANAGER', value: 'manager' },
    { label: 'USER', value: 'user' },
    { label: 'VIEWER', value: 'viewer' }
]);

onMounted(() => {
    userStore.fetchUsers();
});

const openNew = () => {
    user.value = { isActive: true, role: 'user', password: '' };
    submitted.value = false;
    isEditMode.value = false;
    userDialog.value = true;
};

const hideDialog = () => {
    userDialog.value = false;
    submitted.value = false;
};

const saveUser = async () => {
    submitted.value = true;

    // ── YENİ KULLANICI ────────────────────────────────────────────────────────
    if (!isEditMode.value) {
        if (!user.value.email || !user.value.fullName || !user.value.password) return;

        // RPC: create_user_for_company
        // auth.users'a önce kayıt açar → FK constraint karşılanır → public.users'a profil yazar
        const result = await userStore.createUser({
            email: user.value.email,
            password: user.value.password,
            fullName: user.value.fullName,
            role: user.value.role,
            companyId: authStore.user!.companyId!
        });

        if (result.success) {
            toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kullanıcı oluşturuldu', life: 3000 });
            userDialog.value = false;
            user.value = {};
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: (result as any).error.message, life: 3000 });
        }
        return;
    }

    // ── MEVCUT KULLANICI GÜNCELLEME ───────────────────────────────────────────
    if (!user.value.email || !user.value.fullName) return;

    const userEntity = User.create({
        id: user.value.id,
        companyId: authStore.user!.companyId!,
        email: user.value.email,
        fullName: user.value.fullName,
        role: user.value.role,
        isActive: user.value.isActive,
        createdAt: user.value.createdAt || new Date()
    });

    const result = await userStore.saveUser(userEntity);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kullanıcı güncellendi', life: 3000 });
        userDialog.value = false;
        user.value = {};
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: (result as any).error.message, life: 3000 });
    }
};

const editUser = (u: any) => {
    // User bir class instance — spread ({ ...u }) getter'ları kopyalamaz.
    // Property'leri açıkça atıyoruz.
    user.value = {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt
    };
    isEditMode.value = true;
    userDialog.value = true;
};

const confirmDeleteUser = (u: any) => {
    user.value = u;
    deleteUserDialog.value = true;
};

const deleteUser = async () => {
    const result = await userStore.deleteUser(user.value.id);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kullanıcı silindi', life: 3000 });
        deleteUserDialog.value = false;
        user.value = {};
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: (result as any).error.message, life: 3000 });
    }
};

const getBadgeSeverity = (role: string) => {
    switch (role) {
        case 'admin':
            return 'danger';
        case 'manager':
            return 'warn';
        case 'user':
            return 'info';
        case 'viewer':
            return 'secondary';
        default:
            return 'secondary';
    }
};
</script>

<template>
    <div class="card">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span class="text-xl font-semibold">Kullanıcı Yönetimi</span>
            <Button label="Yeni Kullanıcı" icon="pi pi-plus" size="small" @click="openNew" />
        </div>

        <DataTable :value="userStore.users" :loading="userStore.loading" tableStyle="min-width: 50rem" paginator :rows="10">
            <template #empty> Kullanıcı bulunamadı. </template>
            <Column field="fullName" header="Ad Soyad"></Column>
            <Column field="email" header="E-posta"></Column>
            <Column field="role" header="Rol">
                <template #body="slotProps">
                    <Tag :value="slotProps.data.role" :severity="getBadgeSeverity(slotProps.data.role)" />
                </template>
            </Column>
            <Column field="isActive" header="Durum">
                <template #body="slotProps">
                    <i class="pi" :class="{ 'pi-check-circle text-green-500': slotProps.data.isActive, 'pi-times-circle text-red-500': !slotProps.data.isActive }"></i>
                </template>
            </Column>
            <Column field="createdAt" header="Kayıt Tarihi">
                <template #body="slotProps">
                    {{ new Date(slotProps.data.createdAt).toLocaleDateString() }}
                </template>
            </Column>
            <Column header="İşlemler">
                <template #body="slotProps">
                    <div class="flex gap-2">
                        <Button icon="pi pi-pencil" severity="secondary" rounded variant="text" @click="editUser(slotProps.data)" />
                        <Button icon="pi pi-trash" severity="danger" rounded variant="text" @click="confirmDeleteUser(slotProps.data)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Yeni / Düzenle Dialog -->
        <Dialog v-model:visible="userDialog" :style="{ width: '450px' }" :header="isEditMode ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'" :modal="true">
            <div class="flex flex-col gap-4">
                <div>
                    <label for="fullName" class="block font-bold mb-2">Ad Soyad</label>
                    <InputText id="fullName" v-model.trim="user.fullName" required autofocus :invalid="submitted && !user.fullName" fluid />
                    <small v-if="submitted && !user.fullName" class="text-red-500">Ad Soyad zorunludur.</small>
                </div>
                <div>
                    <label for="email" class="block font-bold mb-2">E-posta</label>
                    <InputText id="email" v-model.trim="user.email" required :disabled="isEditMode" :invalid="submitted && !user.email" fluid />
                    <small v-if="submitted && !user.email" class="text-red-500">E-posta zorunludur.</small>
                </div>
                <!-- Şifre — sadece yeni kullanıcıda göster -->
                <div v-if="!isEditMode">
                    <label for="password" class="block font-bold mb-2">Şifre</label>
                    <Password id="password" v-model="user.password" :feedback="true" toggleMask :invalid="submitted && !user.password" fluid />
                    <small v-if="submitted && !user.password" class="text-red-500">Şifre zorunludur.</small>
                </div>
                <div>
                    <label for="role" class="block font-bold mb-2">Rol</label>
                    <Select id="role" v-model="user.role" :options="roles" optionLabel="label" optionValue="value" placeholder="Rol Seçin" fluid />
                </div>
                <div class="flex items-center gap-2">
                    <Checkbox id="isActive" v-model="user.isActive" :binary="true" />
                    <label for="isActive">Aktif mi?</label>
                </div>
            </div>

            <template #footer>
                <Button label="İptal" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Kaydet" icon="pi pi-check" @click="saveUser" />
            </template>
        </Dialog>

        <!-- Silme Onayı Dialog -->
        <Dialog v-model:visible="deleteUserDialog" :style="{ width: '450px' }" header="Onay" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span v-if="user"
                    ><b>{{ user.fullName }}</b> kullanıcısını silmek istediğinize emin misiniz?</span
                >
            </div>
            <template #footer>
                <Button label="Hayır" icon="pi pi-times" text @click="deleteUserDialog = false" />
                <Button label="Evet" icon="pi pi-check" severity="danger" @click="deleteUser" />
            </template>
        </Dialog>
    </div>
</template>
