<script setup lang="ts">
import { useAuthStore } from '@/core/auth/auth.store';
import { useUserStore } from '@/modules/admin/application/user.store';
import { User, type UserProps } from '@/modules/admin/domain/user.entity';
import { getErrorMessage } from '@/shared/utils/error';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const toast = useToast();

const selectedUsers = ref<User[]>([]);
const showFilters = ref(false);

type UserRole = UserProps['role'];

// ── FILTER FORM ───────────────────────────────────────────────────────────────
interface UserFilterForm {
    fullName: string;
    email: string;
    role: UserRole | null;
    isActive: boolean | null;
}

const filterForm = ref<UserFilterForm>({
    fullName: '',
    email: '',
    role: null,
    isActive: null
});

const activeFilters = ref<UserFilterForm>({ ...filterForm.value });

const roles = ref<Array<{ label: string; value: UserRole }>>([
    { label: 'Admin', value: 'admin' },
    { label: 'Manager', value: 'manager' },
    { label: 'User', value: 'user' },
    { label: 'Viewer', value: 'viewer' }
]);

const statusOptions = ref([
    { label: 'Aktif', value: true },
    { label: 'Pasif', value: false }
]);

// ── DIALOG STATE ──────────────────────────────────────────────────────────────
const userDialog = ref(false);
const deleteUserDialog = ref(false);

interface UserForm {
    id?: string;
    fullName?: string;
    email?: string;
    role: UserRole;
    isActive: boolean;
    password?: string;
    createdAt?: Date;
}

const user = ref<UserForm>({
    role: 'user',
    isActive: true,
    password: ''
});
const submitted = ref(false);
const isEditMode = ref(false);

onMounted(() => {
    userStore.fetchUsers();
});

// ── FILTERED LIST ─────────────────────────────────────────────────────────────
const filteredUsers = computed(() => {
    let list = userStore.users ?? [];
    const filters = activeFilters.value;

    if (filters.fullName) {
        const query = filters.fullName.toLowerCase();
        list = list.filter((item) => (item.fullName || '').toLowerCase().includes(query));
    }
    if (filters.email) {
        const query = filters.email.toLowerCase();
        list = list.filter((item) => (item.email || '').toLowerCase().includes(query));
    }
    if (filters.role) {
        list = list.filter((item) => item.role === filters.role);
    }
    if (filters.isActive !== null) {
        list = list.filter((item) => item.isActive === filters.isActive);
    }

    return list;
});

// ── FILTER ACTIONS ────────────────────────────────────────────────────────────
function toggleFilters() {
    showFilters.value = !showFilters.value;
}

function applyFilters() {
    activeFilters.value = { ...filterForm.value };
}

function clearFilters() {
    filterForm.value = { fullName: '', email: '', role: null, isActive: null };
    activeFilters.value = { ...filterForm.value };
}

// ── DIALOG ACTIONS ────────────────────────────────────────────────────────────
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

    if (!isEditMode.value) {
        if (!user.value.email || !user.value.fullName || !user.value.password) return;

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
            user.value = { role: 'user', isActive: true, password: '' };
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
        }
        return;
    }

    if (!user.value.email || !user.value.fullName) return;
    if (!user.value.id) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Kullanıcı kimliği bulunamadı', life: 3000 });
        return;
    }

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
        user.value = { role: 'user', isActive: true, password: '' };
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
};

const editUser = (u: User) => {
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

const confirmDeleteUser = (u: User) => {
    user.value = {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt
    };
    deleteUserDialog.value = true;
};

const deleteUser = async () => {
    if (!user.value.id) {
        toast.add({ severity: 'error', summary: 'Hata', detail: 'Kullanıcı kimliği bulunamadı', life: 3000 });
        return;
    }
    const result = await userStore.deleteUser(user.value.id);
    if (result.success) {
        toast.add({ severity: 'success', summary: 'Başarılı', detail: 'Kullanıcı silindi', life: 3000 });
        deleteUserDialog.value = false;
        user.value = { role: 'user', isActive: true, password: '' };
    } else {
        toast.add({ severity: 'error', summary: 'Hata', detail: getErrorMessage(result.error), life: 3000 });
    }
};

const getBadgeSeverity = (role: UserRole) => {
    switch (role) {
        case 'admin':   return 'danger';
        case 'manager': return 'warn';
        case 'user':    return 'info';
        case 'viewer':  return 'secondary';
        default:        return 'secondary';
    }
};
</script>

<template>
    <div>
        <!-- ── BAŞLIK + TOOLBAR ───────────────────────────────────────────── -->
        <div class="card mb-4">
            <div class="flex items-center justify-between mb-0">
                <div class="m-0 text-2xl font-medium">Kullanıcı Yönetimi</div>
            </div>

            <Toolbar>
                <template #start>
                    <Button label="Yeni Kullanıcı Oluştur" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>
                <template #end>
                    <Button label="Filtreler" icon="pi pi-filter" severity="secondary" @click="toggleFilters" />
                </template>
            </Toolbar>
        </div>

        <!-- ── FİLTRE PANELİ ────────────────────────────────────────────── -->
        <div v-if="showFilters" class="card mb-4">
            
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                <div class="col-span-1">
                    <InputText v-model="filterForm.fullName" placeholder="Ad Soyad" fluid />
                </div>
                <div class="col-span-1">
                    <InputText v-model="filterForm.email" placeholder="E-posta" fluid />
                </div>
                <div class="col-span-1">
                    <Select
                        v-model="filterForm.role"
                        :options="roles"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Rol"
                        fluid
                    />
                </div>
                <div class="col-span-1">
                    <Select
                        v-model="filterForm.isActive"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Durum"
                        fluid
                    />
                </div>
                <div class="col-span-1 flex items-end gap-2">
                    <Button label="Filtrele" class="w-full" @click="applyFilters" />
                    <Button label="Temizle" severity="secondary" class="w-full" @click="clearFilters" />
                </div>
            </div>
        </div>

        <!-- ── TABLO ─────────────────────────────────────────────────────── -->
        <div class="card">
            <DataTable
                v-model:selection="selectedUsers"
                :value="filteredUsers"
                :loading="userStore.loading"
                dataKey="id"
                :paginator="true"
                :rows="10"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Gösterilen {first} - {last} / {totalRecords} kullanıcı"
            >
                <template #empty>Kullanıcı bulunamadı.</template>

                <Column field="fullName" header="Ad Soyad" sortable></Column>
                <Column field="email" header="E-posta" sortable></Column>
                <Column field="role" header="Rol" sortable>
                    <template #body="slotProps">
                        <Tag
                            :value="slotProps.data.role.toUpperCase()"
                            :severity="getBadgeSeverity(slotProps.data.role)"
                        />
                    </template>
                </Column>
                <Column field="isActive" header="Durum" sortable>
                    <template #body="slotProps">
                        <Tag
                            :severity="slotProps.data.isActive ? 'success' : 'secondary'"
                            :value="slotProps.data.isActive ? 'Aktif' : 'Pasif'"
                        />
                    </template>
                </Column>
                <Column field="createdAt" header="Kayıt Tarihi" sortable>
                    <template #body="slotProps">
                        {{ new Date(slotProps.data.createdAt).toLocaleDateString('tr-TR') }}
                    </template>
                </Column>
                <Column header="İşlemler">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editUser(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteUser(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- ── YENİ / DÜZENLE DİALOG ────────────────────────────────────── -->
        <Dialog
            v-model:visible="userDialog"
            :style="{ width: '450px' }"
            :header="isEditMode ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'"
            :modal="true"
        >
            <div class="flex flex-col gap-4">
                <div>
                    <label for="fullName" class="block font-bold mb-2">Ad Soyad</label>
                    <InputText
                        id="fullName"
                        v-model.trim="user.fullName"
                        required
                        autofocus
                        :invalid="submitted && !user.fullName"
                        fluid
                    />
                    <small v-if="submitted && !user.fullName" class="text-red-500">Ad Soyad zorunludur.</small>
                </div>
                <div>
                    <label for="email" class="block font-bold mb-2">E-posta</label>
                    <InputText
                        id="email"
                        v-model.trim="user.email"
                        required
                        :disabled="isEditMode"
                        :invalid="submitted && !user.email"
                        fluid
                    />
                    <small v-if="submitted && !user.email" class="text-red-500">E-posta zorunludur.</small>
                </div>
                <div v-if="!isEditMode">
                    <label for="password" class="block font-bold mb-2">Şifre</label>
                    <Password
                        id="password"
                        v-model="user.password"
                        :feedback="true"
                        toggleMask
                        :invalid="submitted && !user.password"
                        fluid
                    />
                    <small v-if="submitted && !user.password" class="text-red-500">Şifre zorunludur.</small>
                </div>
                <div>
                    <label for="role" class="block font-bold mb-2">Rol</label>
                    <Select
                        id="role"
                        v-model="user.role"
                        :options="roles"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Rol Seçin"
                        fluid
                    />
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

        <!-- ── SİLME ONAYI DİALOG ────────────────────────────────────────── -->
        <Dialog
            v-model:visible="deleteUserDialog"
            :style="{ width: '450px' }"
            header="Onay"
            :modal="true"
        >
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span v-if="user">
                    <b>{{ user.fullName }}</b> kullanıcısını silmek istediğinize emin misiniz?
                </span>
            </div>
            <template #footer>
                <Button label="Hayır" icon="pi pi-times" text @click="deleteUserDialog = false" />
                <Button label="Evet" icon="pi pi-check" severity="danger" @click="deleteUser" />
            </template>
        </Dialog>
    </div>
</template>