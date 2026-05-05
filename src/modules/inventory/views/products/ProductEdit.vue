<script setup lang="ts">
import { useProductStore } from '@/modules/inventory/application/product.store';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ProductForm from './components/ProductForm.vue';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const productStore = useProductStore();
const initialData = ref<any>(null);
const loading = ref(true);

onMounted(async () => {
    const id = route.params.id as string;
    if (id) {
        if (productStore.products.length === 0) {
            await productStore.fetchProducts();
        }
        const prod = productStore.products.find((p) => p.id === id);
        if (prod) {
            initialData.value = prod.toObject();
        } else {
            toast.add({ severity: 'error', summary: 'Hata', detail: 'Ürün bulunamadı' });
            router.push('/inventory/products');
        }
    }
    loading.value = false;
});

function handleSave() {
    router.push('/inventory/products');
}

function handleCancel() {
    router.push('/inventory/products');
}
</script>

<template>
    <div class="flex flex-col gap-0">
        <div class="card p-6 min-h-32 flex flex-col gap-2">
            <h1 v-if="!loading" class="m-0 text-2xl font-medium">Ürünü Düzenle: <span class="text-primary font-bold">{{ initialData?.name }}</span></h1>
            <h1 v-else class="m-0 text-2xl font-medium">Yükleniyor...</h1>
        </div>
        
        <ProductForm 
            v-if="!loading"
            :initial-data="initialData" 
            :is-edit="true"
            @save="handleSave" 
            @cancel="handleCancel" 
        />
        <div v-else class="card p-20 flex justify-center">
            <i class="pi pi-spin pi-spinner text-4xl text-surface-400"></i>
        </div>
    </div>
</template>
