import { useState, useCallback, useEffect } from 'react';
import { Transaction, TransactionType, User } from '@/types';
import { transactionService } from '@/domain';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import * as XLSX from 'xlsx-js-style';

export const useTransactionHistory = (
    currentUser: User | null,
    onRefresh: () => void
) => {
    const toastSuccess = useToast(s => s.success);
    const toastError = useToast(s => s.error);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
    const [dateRange, setDateRange] = useState<{ from: string; to: string } | undefined>(undefined);

    // CRUD States
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editQuantity, setEditQuantity] = useState<number>(0);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState<any>(null);

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingQuantity, setEditingQuantity] = useState<number>(0);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Batch Selection
    const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);

    // Server-side Pagination
    const [receiptData, setReceiptData] = useState<any[]>([]);
    const [txPage, setTxPage] = useState(1);
    const [txLimit, setTxLimit] = useState(20);
    const [txTotal, setTxTotal] = useState(0);
    const [txTotalPages, setTxTotalPages] = useState(1);
    const [isLoadingTx, setIsLoadingTx] = useState(false);

    const canManage = currentUser?.role === 'ADMIN' || (currentUser?.permissions?.includes('MANAGE_WAREHOUSE') ?? false);

    const loadReceipts = useCallback(async () => {
        setIsLoadingTx(true);
        try {
            const params = new URLSearchParams({
                page: String(txPage),
                limit: String(txLimit),
            });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (typeFilter !== 'ALL') params.set('type', typeFilter);
            if (dateRange?.from) params.set('from', dateRange.from);
            if (dateRange?.to) params.set('to', dateRange.to);

            const result = await apiService.get<any>(`/api/transactions/receipts?${params.toString()}`);
            if (result && Array.isArray(result.data)) {
                setReceiptData(result.data);
                setTxTotal(result.total || 0);
                setTxTotalPages(result.totalPages || 1);
            } else {
                setReceiptData([]);
                setTxTotal(0);
                setTxTotalPages(1);
            }
        } catch (error) {
            toastError('Lỗi khi tải lịch sử giao dịch');
        } finally {
            setIsLoadingTx(false);
        }
    }, [txPage, txLimit, debouncedSearch, typeFilter, dateRange, toastError]);

    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);

    useEffect(() => {
        setTxPage(1);
    }, [debouncedSearch, typeFilter, dateRange]);

    const toggleSelectReceipt = (receiptId: string) => {
        setSelectedReceiptIds(prev =>
            prev.includes(receiptId) ? prev.filter(id => id !== receiptId) : [...prev, receiptId]
        );
    };

    const handleBatchPrint = () => {
        if (selectedReceiptIds.length === 0) return;
        window.print();
    };

    const handleSaveEdit = async () => {
        if (!editingTransaction) return;
        if (editQuantity <= 0) {
            toastError('Số lượng phải lớn hơn 0');
            return;
        }

        try {
            await transactionService.updateTransactionQuantity(editingTransaction.id, editQuantity);
            toastSuccess('Cập nhật giao dịch thành công');
            setIsEditModalOpen(false);
            loadReceipts();
            onRefresh();
        } catch (error: any) {
            toastError(error.message || 'Lỗi khi cập nhật giao dịch');
        }
    };

    const handleDeleteTransaction = (transaction: Transaction) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa giao dịch',
            message: 'Bạn có chắc chắn muốn xóa giao dịch này? Hành động này sẽ hoàn trả lại số lượng tồn kho.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await transactionService.deleteTransaction(transaction.id, currentUser?.id || 'SYSTEM');
                    toastSuccess('Đã xóa giao dịch và hoàn trả tồn kho');
                    loadReceipts();
                    onRefresh();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toastError(error.message || 'Lỗi khi xóa giao dịch');
                }
            }
        });
    };

    const handleDeleteReceipt = (receipt: any) => {
        setConfirmState({
            isOpen: true,
            title: `Hủy phiếu ${receipt.type === 'IN' ? 'Nhập' : 'Xuất'}`,
            message: `Bạn có chắc chắn muốn hủy toàn bộ phiếu ${receipt.receiptId}? Hành động này không thể hoàn tác.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    for (const t of receipt.transactions) {
                        await transactionService.deleteTransaction(t.id, currentUser?.id || 'SYSTEM');
                    }
                    toastSuccess('Đã hủy phiếu thành công');
                    loadReceipts();
                    onRefresh();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toastError('Lỗi khi hủy phiếu: ' + error.message);
                }
            }
        });
    };

    const handleExportHistory = async () => {
        try {
            const result = await apiService.get<any>('/api/transactions/all');
            const dataToExport = Array.isArray(result) ? result : (result.data || []);

            const data = dataToExport.map((t: any) => ({
                'Ngày': new Date(t.date).toLocaleDateString('vi-VN') + ' ' + (t.transactionTime || ''),
                'Mã Giao Dịch': t.id,
                'Mã Vật tư': t.materialId,
                'Loại': t.type === 'IN' ? 'Nhập' : 'Xuất',
                'Số lượng': t.quantity,
                'Người thực hiện': t.user,
                'Khách hàng': t.customerName || '',
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Lịch sử Giao dịch");
            XLSX.writeFile(wb, `Lich_Su_Kho_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            toastError('Lỗi khi xuất Excel');
        }
    };

    return {
        state: {
            searchTerm, typeFilter, dateRange, receiptData, txPage, txLimit, txTotal, txTotalPages, isLoadingTx,
            selectedReceiptIds, isViewModalOpen, viewingReceipt, isEditModalOpen, editingTransaction,
            editQuantity, editingRowId, editingQuantity, confirmState, canManage
        },
        actions: {
            setSearchTerm, setTypeFilter, setDateRange, setTxPage, setTxLimit, setSelectedReceiptIds, setIsViewModalOpen,
            setViewingReceipt, setIsEditModalOpen, setEditingTransaction, setEditQuantity, setEditingRowId,
            setEditingQuantity, setConfirmState, toggleSelectReceipt, handleBatchPrint, handleSaveEdit,
            handleDeleteTransaction, handleDeleteReceipt, handleExportHistory, loadReceipts
        }
    };
};
