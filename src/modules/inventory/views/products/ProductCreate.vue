<script setup lang="ts">
import { useProductStore } from '@/modules/inventory/application/product.store';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ProductForm from './components/ProductForm.vue';

const router = useRouter();
const route = useRoute();
const productStore = useProductStore();
const initialData = ref<any>(null);

onMounted(async () => {
    const cloneId = route.query.cloneId as string;
    if (cloneId) {
        if (productStore.products.length === 0) {
            await productStore.fetchProducts();
        }
        const source = productStore.products.find((p) => p.id === cloneId);
        if (source) {
            const obj = source.toObject();
            initialData.value = {
                ...obj,
                name: `${obj.name} (Kopya)`,
                barcode: '', // Clear barcode for clones
                id: undefined, // New ID will be generated
                createdAt: undefined
            };
        }
    }
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
            <h1 class="m-0 text-2xl font-medium">Yeni Ürün Oluştur</h1>
            <p class="text-surface-500 m-0">Ürün bilgilerini detaylı bir şekilde tanımlayarak envanterinizi yönetin.</p>
        </div>
        
        <ProductForm 
            :initial-data="initialData" 
            @save="handleSave" 
            @cancel="handleCancel" 
        />
    </div>
</template>
