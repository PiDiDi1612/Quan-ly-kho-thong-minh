import React from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy'
}) => {
  const Icon = type === 'danger' ? AlertCircle : type === 'warning' ? AlertTriangle : Info;

  // High contrast colors for buttons
  const confirmBtnClasses = type === 'danger'
    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/30 font-black'
    : type === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 font-black'
      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 font-black';

  const iconBg = type === 'danger' ? 'bg-rose-50 dark:bg-rose-900/30' : type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30';
  const iconColor = type === 'danger' ? 'text-rose-600' : type === 'warning' ? 'text-amber-600' : 'text-emerald-600';

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={null} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center p-4">
        <div className={`p-5 rounded-3xl ${iconBg} mb-6 border border-white/50 dark:border-slate-700/50 shadow-inner`}>
          <Icon size={40} className={iconColor} />
        </div>

        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3">
          {title}
        </h3>

        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-10 leading-relaxed px-4">
          {message}
        </p>

        <div className="flex gap-4 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {cancelText}
          </Button>
          <Button
            isLoading={isSubmitting}
            onClick={async () => {
              if (isSubmitting) return;
              setIsSubmitting(true);
              try {
                await Promise.resolve(onConfirm());
                onClose();
              } finally {
                setIsSubmitting(false);
              }
            }}
            className={`flex-1 h-14 rounded-2xl text-xs uppercase transition-all active:scale-95 ${confirmBtnClasses}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

