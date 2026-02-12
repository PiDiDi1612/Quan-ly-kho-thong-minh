import { useState, useEffect } from 'react';
import { Transaction, User, UserRole, WorkshopCode, TransactionType } from '../../../types';
import { AppTab } from '../../layout/AppSidebar';
import { transactionService } from '../../../domain/services/TransactionService';
import { useToast } from '../../../hooks/useToast';

interface UseWarehouseTransferProps {
    transactions: Transaction[];
    currentUser: User | null;
    userRole: UserRole;
    activeTab: AppTab;
    // apiCall removed
    loadData: () => Promise<any>;
    logActivity: (action: string, entityType: any, entityId?: string, details?: string) => void;
    setActiveTab: (tab: AppTab) => void;
    requestConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
    setModalError: (error: string | null) => void;
    closeConfirmDialog: () => void;
}

export const useWarehouseTransfer = ({
    transactions,
    currentUser,
    userRole,
    activeTab,
    loadData,
    logActivity,
    setActiveTab,
    requestConfirm,
    setModalError,
    closeConfirmDialog
}: UseWarehouseTransferProps) => {
    const [transferForm, setTransferForm] = useState({
        items: [] as { materialId: string, quantity: number }[],
        fromWorkshop: 'OG' as WorkshopCode,
        toWorkshop: 'CK' as WorkshopCode,
        orderCode: '',
        receiptId: '',
        search: ''
    });

    const [receiptSearchClass, setReceiptSearchClass] = useState<'ALL' | 'Vật tư chính' | 'Vật tư phụ'>('ALL');

    const generateReceiptId = (type: TransactionType, workshop: WorkshopCode) => {
        const year = new Date().getFullYear().toString().slice(-2);
        const prefix = type === TransactionType.IN ? 'PNK' : type === TransactionType.OUT ? 'PXK' : 'PDC';

        const sameTypeTxs = transactions.filter(t =>
            t.receiptId.startsWith(`${prefix}/${workshop}/${year}/`)
        );

        let nextNum = 1;
        if (sameTypeTxs.length > 0) {
            const nums = sameTypeTxs.map(t => {
                const parts = t.receiptId.split('/');
                return parseInt(parts[3], 10) || 0;
            });
            nextNum = Math.max(...nums) + 1;
        }

        const paddedCount = nextNum.toString().padStart(5, '0');
        return `${prefix}/${workshop}/${year}/${paddedCount}`;
    };

    useEffect(() => {
        if (activeTab === 'warehouse_transfer') {
            setTransferForm(prev => ({
                ...prev,
                receiptId: generateReceiptId(TransactionType.TRANSFER, prev.fromWorkshop)
            }));
        }
    }, [activeTab, transferForm.fromWorkshop, transactions]);

    const toast = useToast();

    const handleTransfer = () => {
        const { items, fromWorkshop, toWorkshop, orderCode, receiptId } = transferForm;
        if (items.length === 0 || fromWorkshop === toWorkshop) {
            setModalError('Vui lòng chọn vật tư và kho đích khác kho nguồn.'); return;
        }

        requestConfirm('Xác nhận điều chuyển', `Chuyển ${items.length} loại vật tư từ ${fromWorkshop} sang ${toWorkshop}?`, async () => {
            const finalReceiptId = receiptId.trim() || generateReceiptId(TransactionType.TRANSFER, fromWorkshop);
            try {
                const result = await transactionService.createBatchTransfer({
                    receiptId: finalReceiptId,
                    fromWorkshop,
                    toWorkshop,
                    orderCode: orderCode || undefined,
                    user: currentUser?.fullName || userRole,
                    items
                });

                if (!result.success) {
                    setModalError(result.error || 'Điều chuyển thất bại');
                    return;
                }

                await loadData();
                logActivity(`Điều chuyển ${items.length} loại vật tư từ ${fromWorkshop} sang ${toWorkshop}`, 'TRANSACTION', finalReceiptId);
                setActiveTab('warehouse_inventory');
                setModalError(null);
                setTransferForm(prev => ({ ...prev, items: [], orderCode: '', receiptId: '' }));
                closeConfirmDialog();
                toast.success('Điều chuyển vật tư thành công!');
            } catch (err: any) {
                console.error("Lỗi đồng bộ điều chuyển:", err);
                setModalError(err.message || 'Không thể điều chuyển. Vui lòng thử lại.');
            }
        });
    };

    return {
        transferForm,
        setTransferForm,
        receiptSearchClass,
        setReceiptSearchClass,
        handleTransfer,
        generateReceiptId
    };
};
