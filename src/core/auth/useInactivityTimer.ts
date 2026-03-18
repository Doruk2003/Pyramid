import { onBeforeUnmount, onMounted } from 'vue';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 dakika

// Kullanıcı aktivitesini izleyen olaylar
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'wheel'
];

/**
 * Kullanıcı 15 dakika boyunca herhangi bir işlem yapmazsa
 * onTimeout callback'ini tetikler.
 *
 * Kullanımı:
 *   useInactivityTimer(() => {
 *       authStore.logout();
 *       router.push('/auth/login');
 *   });
 */
export function useInactivityTimer(onTimeout: () => void) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function resetTimer() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            onTimeout();
        }, INACTIVITY_TIMEOUT_MS);
    }

    function startListening() {
        ACTIVITY_EVENTS.forEach((event) => {
            window.addEventListener(event, resetTimer, { passive: true });
        });
        resetTimer(); // İlk zamanlayıcıyı başlat
    }

    function stopListening() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        ACTIVITY_EVENTS.forEach((event) => {
            window.removeEventListener(event, resetTimer);
        });
    }

    onMounted(() => {
        startListening();
    });

    onBeforeUnmount(() => {
        stopListening();
    });

    return { resetTimer, stopListening };
}
