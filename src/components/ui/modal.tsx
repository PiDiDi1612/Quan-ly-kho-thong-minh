import React, { Fragment, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    maxWidth?: string;
    className?: string;
    contentClassName?: string;
    showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-lg',
    className = '',
    contentClassName = '',
    showCloseButton = true
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => setIsAnimating(true));
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setIsVisible(false);
                document.body.style.overflow = 'unset';
            }, 200); // Wait for transition
            return () => {
                clearTimeout(timer);
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 ${isAnimating ? 'bg-slate-900/40 backdrop-blur-sm opacity-100' : 'bg-slate-900/0 backdrop-blur-none opacity-0 pointer-events-none'
                }`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`w-full ${maxWidth} bg-white dark:bg-[#1e293b] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800 transition-all duration-200 ${isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                    } ${className}`}
            >
                {(title || showCloseButton) && (
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                        {title ? (
                            <div className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                {title}
                            </div>
                        ) : <div></div>}

                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                <div className={`flex-1 overflow-y-auto no-scrollbar p-6 ${contentClassName}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
