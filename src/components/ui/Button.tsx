import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "font-extrabold rounded-xl transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] hover:brightness-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none";

    const variants = {
        primary: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 hover:shadow-[0_0_24px_rgba(59,130,246,0.35)]",
        secondary: "app-surface text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70",
        danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/35 border border-red-100/80 dark:border-red-900/30",
        ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60",
        success: "bg-green-600 text-white shadow-lg shadow-green-500/25 hover:bg-green-700",
        outline: "border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 bg-transparent"
    };

    const sizes = {
        sm: "px-3 py-2 text-[11px]",
        md: "px-5 py-3 text-sm",
        lg: "px-6 py-4 text-[15px]"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {!isLoading && leftIcon}
            {children}
            {!isLoading && rightIcon}
        </button>
    );
};

