import router from '@/core/router';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';

import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara'; // ← Lara
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import '@/assets/styles.scss';
import '@/assets/tailwind.css';

const AppTheme = definePreset(Lara, {           // ← Lara
    primitive: {
        borderRadius: {
            none: '0',
            xs:   '6px',
            sm:   '6px',
            md:   '6px',
            lg:   '6px',
            xl:   '6px'
        }
    }
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: AppTheme,
        options: {
            darkModeSelector: '.app-dark'
        }
    }
    
});


app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');