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
  const iconColor = type === 'danger' ? 'text-red-500 dark:text-red-300' : type === 'warning' ? 'text-amber-500 dark:text-amber-300' : 'text-emerald-500 dark:text-emerald-300';
  const bgColor = type === 'danger' ? 'bg-red-50/90 dark:bg-red-900/25' : type === 'warning' ? 'bg-amber-50/90 dark:bg-amber-900/25' : 'bg-emerald-50/90 dark:bg-emerald-900/25';
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={null} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center p-2">
        <div className={`p-4 rounded-2xl ${bgColor} mb-4`}>
          <Icon size={32} className={iconColor} />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          {title}
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 font-bold py-3"
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
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
            className="flex-1 font-bold py-3"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

