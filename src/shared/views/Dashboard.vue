<script setup>
import InventoryStatsWidget from '@/modules/inventory/views/components/InventoryStatsWidget.vue';
import BestSellingWidget from '@/shared/components/dashboard/BestSellingWidget.vue';
import NotificationsWidget from '@/shared/components/dashboard/NotificationsWidget.vue';
import RecentSalesWidget from '@/shared/components/dashboard/RecentSalesWidget.vue';
import RevenueStreamWidget from '@/shared/components/dashboard/RevenueStreamWidget.vue';
import StatsWidget from '@/shared/components/dashboard/StatsWidget.vue';
</script>

<template>
    <div class="grid grid-cols-12 gap-8">
        <StatsWidget />
        <InventoryStatsWidget />

        <div class="col-span-12 xl:col-span-6">
            <RecentSalesWidget />
            <BestSellingWidget />
        </div>
        <div class="col-span-12 xl:col-span-6">
            <RevenueStreamWidget />
            <NotificationsWidget />
        </div>
    </div>
</template>
