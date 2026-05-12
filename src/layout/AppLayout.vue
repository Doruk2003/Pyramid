<script setup>
import { useLayout } from '@/layout/composables/layout';
import { getPresetExt, presets, surfaces } from '@/layout/theme-utils';
import { $t } from '@primeuix/themes';
import { computed, onMounted } from 'vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const { layoutConfig, layoutState, hideMobileMenu } = useLayout();

onMounted(() => {
    // Apply saved theme settings on mount
    const presetValue = presets[layoutConfig.preset];
    const surface = surfaces.find((s) => s.name === layoutConfig.surface);
    const surfacePalette = surface ? surface.palette : null;

    if (presetValue) {
        $t().preset(presetValue).preset(getPresetExt(layoutConfig)).surfacePalette(surfacePalette).use({ useDefaultOptions: true });
    }
    
    // Set initial dark mode
    if (layoutConfig.darkTheme) {
        document.documentElement.classList.add('app-dark');
    } else {
        document.documentElement.classList.remove('app-dark');
    }
});

const containerClass = computed(() => {
    return {
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.mobileMenuActive,
        'layout-static-inactive': layoutState.staticMenuInactive
    };
});
</script>

<template>
    <div class="layout-wrapper" :class="containerClass">
        <AppTopbar />
        <AppSidebar />
        <div class="layout-main-container">
            <div class="layout-main">
                <router-view />
            </div>
        </div>
        <div class="layout-mask animate-fadein" @click="hideMobileMenu" />
    </div>
    <Toast position="bottom-right" />
</template>
