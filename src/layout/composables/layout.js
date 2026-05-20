import { computed, reactive } from 'vue';

const STORAGE_KEY = 'pyramid-layout-config';

let initialConfig = {
    preset: 'Lara',
    primary: 'emerald',
    surface: null,
    darkTheme: false,
    menuMode: 'static'
};

try {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        initialConfig = { ...initialConfig, ...parsed };
    }
} catch (e) {
    console.error('Error loading layout config:', e);
}

const layoutConfig = reactive(initialConfig);

const layoutState = reactive({
    staticMenuInactive: false,
    overlayMenuActive: false,
    profileSidebarVisible: false,
    configSidebarVisible: false,
    sidebarExpanded: false,
    menuHoverActive: false,
    activeMenuItem: null,
    activePath: null
});

import { getPresetExt, presets, surfaces } from '@/layout/theme-utils';
import { $t } from '@primeuix/themes';
import { watch } from 'vue';

export function applyTheme() {
    const presetValue = presets[layoutConfig.preset];
    const surface = surfaces.find((s) => s.name === layoutConfig.surface);
    const surfacePalette = surface ? surface.palette : null;

    if (presetValue) {
        $t().preset(presetValue)
            .preset(getPresetExt(layoutConfig))
            .surfacePalette(surfacePalette)
            .use({ useDefaultOptions: true });
    }

    if (layoutConfig.darkTheme) {
        document.documentElement.classList.add('app-dark');
    } else {
        document.documentElement.classList.remove('app-dark');
    }
}

// The theme will be applied in onMounted of the main layout to ensure PrimeVue is ready

watch(layoutConfig, (newConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    applyTheme();
}, { deep: true });

export function useLayout() {
    const toggleDarkMode = () => {
        if (!document.startViewTransition) {
            executeDarkModeToggle();

            return;
        }

        document.startViewTransition(() => executeDarkModeToggle());
    };

    const executeDarkModeToggle = () => {
        layoutConfig.darkTheme = !layoutConfig.darkTheme;
    };

    const toggleMenu = () => {
        if (isDesktop()) {
            if (layoutConfig.menuMode === 'static') {
                layoutState.staticMenuInactive = !layoutState.staticMenuInactive;
            }

            if (layoutConfig.menuMode === 'overlay') {
                layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
            }
        } else {
            layoutState.mobileMenuActive = !layoutState.mobileMenuActive;
        }
    };

    const toggleConfigSidebar = () => {
        layoutState.configSidebarVisible = !layoutState.configSidebarVisible;
    };

    const hideMobileMenu = () => {
        layoutState.mobileMenuActive = false;
    };

    const changeMenuMode = (event) => {
        layoutConfig.menuMode = event.value;
        layoutState.staticMenuInactive = false;
        layoutState.mobileMenuActive = false;
        layoutState.sidebarExpanded = false;
        layoutState.menuHoverActive = false;
        layoutState.anchored = false;
    };

    const isDarkTheme = computed(() => layoutConfig.darkTheme);
    const isDesktop = () => window.innerWidth > 991;

    const hasOpenOverlay = computed(() => layoutState.overlayMenuActive);

    return {
        layoutConfig,
        layoutState,
        isDarkTheme,
        toggleDarkMode,
        toggleConfigSidebar,
        toggleMenu,
        hideMobileMenu,
        changeMenuMode,
        isDesktop,
        hasOpenOverlay
    };
}
