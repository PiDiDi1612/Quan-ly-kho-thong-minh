import React from 'react';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export interface ConfirmDialogState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    type?: 'danger' | 'info';
}

export interface ConfirmDialogProps {
    dialog: ConfirmDialogState;
    onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ dialog, onClose }) => {
    return (
        <ConfirmModal
            isOpen={dialog.isOpen}
            onClose={onClose}
            onConfirm={() => {
                if (dialog.onConfirm) dialog.onConfirm();
                onClose();
            }}
            title={dialog.title}
            message={dialog.message}
            type={dialog.type}
        />
    );
};
