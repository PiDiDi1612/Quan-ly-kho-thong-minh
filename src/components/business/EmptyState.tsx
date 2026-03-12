import React, { ReactNode } from 'react';

export interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className = "text-center py-24"
}) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div className="text-slate-300 dark:text-slate-600 mb-2">
                {icon}
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400 text-lg">{title}</p>
            {description && (
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">{description}</p>
            )}
            {action && (
                <div className="mt-4">
                    {action}
                </div>
            )}
        </div>
    );
};
