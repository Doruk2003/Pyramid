export type ErrorLike = {
    message?: string;
};

export function getErrorMessage(error: unknown, fallback = 'Beklenmeyen hata'): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error && 'message' in error) {
        const message = (error as ErrorLike).message;
        if (typeof message === 'string') return message;
    }
    return fallback;
}
