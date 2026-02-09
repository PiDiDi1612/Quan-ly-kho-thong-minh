import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast as ToastType, useToast } from '../../hooks/useToast';

interface ToastProps {
    toast: ToastType;
}

const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colors = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
};

const iconColors = {
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
};

export const Toast: React.FC<ToastProps> = ({ toast }) => {
    const { removeToast } = useToast();
    const Icon = icons[toast.type];

    return (
        <div
            className={`
                ${colors[toast.type]}
                relative flex items-start gap-3 px-4 py-3 rounded-2xl border-2 shadow-lg
                min-w-[300px] max-w-[400px]
                animate-slide-in-right
            `}
            role="alert"
        >
            <Icon className={`${iconColors[toast.type]} mt-0.5 flex-shrink-0`} size={20} />
            <p className="text-sm font-semibold flex-1 leading-relaxed pr-2">{toast.message}</p>
            <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 hover:opacity-70 transition-opacity"
                aria-label="Đóng"
            >
                <X size={16} />
            </button>
        </div>
    );
};
