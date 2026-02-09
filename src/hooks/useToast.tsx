import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

export const useToast = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (type, message, duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const toast: Toast = { id, type, message, duration };

        set((state) => ({
            toasts: [...state.toasts, toast].slice(-3) // Keep max 3 toasts
        }));

        if (duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id)
                }));
            }, duration);
        }
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    },

    success: (message, duration) => {
        useToast.getState().addToast('success', message, duration);
    },

    error: (message, duration) => {
        useToast.getState().addToast('error', message, duration);
    },

    warning: (message, duration) => {
        useToast.getState().addToast('warning', message, duration);
    },

    info: (message, duration) => {
        useToast.getState().addToast('info', message, duration);
    },
}));
