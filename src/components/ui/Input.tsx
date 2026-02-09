import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    icon,
    className = '',
    id,
    ...props
}) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label
                    htmlFor={id}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    id={id}
                    className={`
            app-input font-medium text-[15px]
            transition-all shadow-sm
            disabled:opacity-60 disabled:cursor-not-allowed
            ${icon ? 'pl-10 pr-4' : 'px-4'} py-2.5
            ${error
                            ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/30'
                            : ''
                        }
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>
            )}
        </div>
    );
};
