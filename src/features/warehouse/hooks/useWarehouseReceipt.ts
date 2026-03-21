import { useState, useMemo, useEffect } from 'react';
import { Material, WorkshopCode, TransactionType } from '@/types';
import { WORKSHOPS } from '@/constants';
import { ActivityLog } from '@/types';
import { useToast } from '@/hooks/useToast';
export interface UseWarehouseReceiptProps {
    materials: Material[];
    currentUser: any;
    userRole: string;
    loadData: () => Promise<void>;
    logActivity: (action: string, entityType: ActivityLog['entityType'], entityId?: string, details?: string) => void;
    requestConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
    setModalError: (error: string | null) => void;
    closeConfirmDialog: () => void;
    createBatchReceipt: (data: any) => Promise<{ success: boolean; error?: string }>;
    generateReceiptId: (type: TransactionType, workshop: WorkshopCode) => string;
    parseNumber: (val: any) => number;
    canManage?: boolean;
}

export const useWarehouseReceipt = ({
    materials,
    currentUser,
    userRole,
    loadData,
    logActivity,
    requestConfirm,
    setModalError,
    closeConfirmDialog,
    createBatchReceipt,
    generateReceiptId,
    parseNumber,
    canManage: propCanManage
}: UseWarehouseReceiptProps) => {
    const toast = useToast();
    const canManage = propCanManage !== undefined ? propCanManage : (userRole === 'ADMIN' || (currentUser?.permissions?.includes('MANAGE_WAREHOUSE') ?? false));
    // Basic Form State
    const [receiptType, setReceiptType] = useState<TransactionType>(TransactionType.IN);
    const [receiptWorkshop, setReceiptWorkshop] = useState<WorkshopCode>(WORKSHOPS[0].code);
    const [receiptTime, setReceiptTime] = useState(new Date().toISOString().split('T')[0]);
    const [receiptSupplier, setReceiptSupplier] = useState('');
    const [orderCode, setOrderCode] = useState('');
    const [receiptId, setReceiptId] = useState('');

    useEffect(() => {
        setReceiptId(generateReceiptId(receiptType, receiptWorkshop));
    }, [receiptType, receiptWorkshop, generateReceiptId]);

    // UI State
    const [receiptSearchClass, setReceiptSearchClass] = useState<string>('ALL');
    const [materialSearch, setMaterialSearch] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ materialId: string; quantity: number | string }[]>([]);

    // Computed total 
    const totalSelectedQuantity = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + (parseNumber(item.quantity) || 0), 0);
    }, [selectedItems, parseNumber]);

    const handleCreateReceipt = async () => {
        if (!canManage) {
            toast.error('Bạn không có quyền thực hiện thao tác này');
            return;
        }
        if (selectedItems.length === 0) {
            return;
        }
        requestConfirm('Xác nhận lập phiếu', `Hệ thống sẽ ${receiptType === 'IN' ? 'Nhập' : 'Xuất'} hàng.`, async () => {
            const finalId = receiptId.trim() || generateReceiptId(receiptType, receiptWorkshop);
            try {
                const result = await createBatchReceipt({
                    receiptId: finalId,
                    receiptType,
                    receiptWorkshop,
                    receiptTime: receiptTime || new Date().toISOString().split('T')[0],
                    receiptSupplier: receiptSupplier || undefined,
                    orderCode: orderCode || undefined,
                    user: currentUser?.fullName || userRole,
                    items: selectedItems.map(item => ({ materialId: item.materialId, quantity: parseNumber(item.quantity) }))
                });

                if (!result.success) {
                    setModalError(result.error || 'Lưu phiếu thất bại');
                    return;
                }

                await loadData();
                logActivity(`Lập phiếu ${finalId}`, 'TRANSACTION', finalId);
                setSelectedItems([]);
                setOrderCode('');
                setReceiptId('');
                closeConfirmDialog();
                toast.success(`Phiếu ${finalId} đã tạo thành công!`);
            } catch (err: any) {
                setModalError(err.message || 'Lỗi lưu phiếu');
            }
        });
    };

    const handleQuantityChange = (materialId: string, val: string) => {
        if (!/^\d*\.?\d*$/.test(val) && val !== '') return;
        setSelectedItems(prev => prev.map(item =>
            item.materialId === materialId ? { ...item, quantity: val === '' ? '' : Number(val) } : item
        ));
    };

    const toggleMaterialSelection = (materialId: string) => {
        if (selectedItems.some(it => it.materialId === materialId)) {
            setSelectedItems(selectedItems.filter(it => it.materialId !== materialId));
        } else {
            setSelectedItems([...selectedItems, { materialId, quantity: 1 }]);
        }
    };

    const removeSelectedItem = (materialId: string) => {
        setSelectedItems(selectedItems.filter(it => it.materialId !== materialId));
    };

    return {
        state: {
            receiptType, receiptWorkshop, receiptTime, receiptSupplier, orderCode, receiptId,
            receiptSearchClass, materialSearch, selectedItems, totalSelectedQuantity
        },
        actions: {
            setReceiptType, setReceiptWorkshop, setReceiptTime, setReceiptSupplier, setOrderCode, setReceiptId,
            setReceiptSearchClass, setMaterialSearch, setSelectedItems,
            handleCreateReceipt, handleQuantityChange, toggleMaterialSelection, removeSelectedItem
        }
    };
};
