import React, { useState, useCallback, useEffect } from 'react';
import {
    Search, Download, RefreshCcw, Edit2, Trash2, Eye, Printer,
    ArrowDownLeft, ArrowUpRight, Layers, User as UserIcon,
    Clock, Hash, Users, X, Check, History
} from 'lucide-react';
import { Transaction, TransactionType, User } from '../../types';
import { Modal } from '../../components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { transactionService } from '../../domain';
import { apiService } from '@/services/api';
import * as XLSX from 'xlsx-js-style';
import { Pagination } from '@/components/ui/pagination';

interface TransactionHistoryProps {
    transactions: Transaction[];
    materials: any[];
    currentUser: User | null;
    onRefresh: () => void;
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ materials, currentUser, onRefresh }) => {
    const toast = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');

    // CRUD States
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editQuantity, setEditQuantity] = useState<number>(0);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState<any>(null);

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingQuantity, setEditingQuantity] = useState<number>(0);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

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

    const getMaterialInfo = (materialId: string) => {
        const material = materials.find(m => m.id === materialId);
        return material || { name: 'N/A', unit: 'N/A' };
    };

    const loadReceipts = useCallback(async () => {
        setIsLoadingTx(true);
        try {
            const params = new URLSearchParams({
                page: String(txPage),
                limit: String(txLimit),
            });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (typeFilter !== 'ALL') params.set('type', typeFilter);

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
            toast.error('Lỗi khi tải lịch sử giao dịch');
        } finally {
            setIsLoadingTx(false);
        }
    }, [txPage, txLimit, debouncedSearch, typeFilter, toast]);

    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);

    useEffect(() => {
        setTxPage(1);
    }, [debouncedSearch, typeFilter]);

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
            toast.error('Số lượng phải lớn hơn 0');
            return;
        }

        try {
            await transactionService.updateTransactionQuantity(editingTransaction.id, editQuantity);
            toast.success('Cập nhật giao dịch thành công');
            setIsEditModalOpen(false);
            loadReceipts();
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi cập nhật giao dịch');
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
                    toast.success('Đã xóa giao dịch và hoàn trả tồn kho');
                    loadReceipts();
                    onRefresh();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toast.error(error.message || 'Lỗi khi xóa giao dịch');
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
                    toast.success('Đã hủy phiếu thành công');
                    loadReceipts();
                    onRefresh();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toast.error('Lỗi khi hủy phiếu: ' + error.message);
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
            toast.error('Lỗi khi xuất Excel');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center relative">
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <div className="relative group flex-1 md:w-96">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="TÌM THEO MÃ VT, NGƯỜI DÙNG, KHÁCH..."
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto ml-auto">
                    <div className="flex p-1 bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-white/5 rounded-xl h-11 shadow-sm mr-2">
                        <button onClick={() => setTypeFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'ALL' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tất cả</button>
                        <button onClick={() => setTypeFilter('IN')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'IN' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Nhập</button>
                        <button onClick={() => setTypeFilter('OUT')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'OUT' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Xuất</button>
                    </div>

                    <Button variant="outline" onClick={handleExportHistory} className="h-11 rounded-xl font-bold gap-2 bg-white dark:bg-slate-800 border-slate-200">
                        <Download size={16} className="text-emerald-600" /> Xuất Excel
                    </Button>
                </div>

                {/* Batch Action Bar */}
                {selectedReceiptIds.length > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white dark:bg-sky-600 rounded-xl flex items-center gap-6 px-5 py-2 animate-in zoom-in-95 duration-300 z-10 shadow-xl border border-slate-200 dark:border-sky-500">
                        <div className="flex items-center gap-3 text-slate-800 dark:text-white border-r border-slate-200 dark:border-white/20 pr-5">
                            <div className="w-7 h-7 bg-sky-100 dark:bg-white/20 text-sky-600 dark:text-white rounded-lg flex items-center justify-center font-black text-xs">{selectedReceiptIds.length}</div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Đã chọn</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedReceiptIds([])} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors">Hủy</button>
                            <Button onClick={handleBatchPrint} className="bg-sky-600 dark:bg-white text-white dark:text-sky-600 hover:bg-sky-700 dark:hover:bg-sky-50 px-4 h-8 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg shadow-sm">
                                <Printer size={14} /> In {selectedReceiptIds.length} phiếu
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-widest font-bold text-[10px]">
                            <tr>
                                <th className="px-4 py-4 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 focus:ring-sky-500"
                                        checked={selectedReceiptIds.length === receiptData.length && receiptData.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedReceiptIds(receiptData.map(r => r.receiptId));
                                            else setSelectedReceiptIds([]);
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-4"><Clock size={12} className="inline mr-1 text-sky-500" />Thời gian</th>
                                <th className="px-6 py-4"><Hash size={12} className="inline mr-1 text-sky-500" />Mã phiếu</th>
                                <th className="px-6 py-4"><Layers size={12} className="inline mr-1 text-sky-500" />Loại</th>
                                <th className="px-6 py-4"><Users size={12} className="inline mr-1 text-sky-500" />Thực hiện</th>
                                <th className="px-6 py-4 text-center">Vật tư</th>
                                <th className="px-6 py-4 text-right">Tổng SL</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoadingTx ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCcw className="h-8 w-8 text-sky-500 animate-spin" />
                                            <p className="text-slate-400 font-medium">Đang tải lịch sử...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : receiptData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <History className="h-10 w-10 text-slate-200 mb-2" />
                                            <p className="text-slate-400 font-medium">Chưa có giao dịch nào</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                receiptData.map((receipt) => (
                                    <tr key={receipt.receiptId} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 focus:ring-sky-500"
                                                checked={selectedReceiptIds.includes(receipt.receiptId)}
                                                onChange={() => toggleSelectReceipt(receipt.receiptId)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="font-bold text-slate-700 dark:text-slate-300">{new Date(receipt.date).toLocaleDateString('vi-VN')}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{receipt.transactions[0]?.transactionTime || ''}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-black text-sky-600 dark:text-sky-400 text-xs px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded-lg border border-sky-100 dark:border-sky-800/50">
                                                {receipt.receiptId}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${receipt.type === 'IN'
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                                }`}>
                                                {receipt.type === 'IN' ? 'Nhập' : 'Xuất'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400 tracking-tight uppercase">
                                            {receipt.user}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                {receipt.transactions.length} VT
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-black text-xs ${receipt.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {receipt.type === 'IN' ? '+' : '-'}{formatNumber(receipt.totalQuantity)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setViewingReceipt(receipt); setIsViewModalOpen(true); }}
                                                    className="p-2 text-slate-400 hover:text-sky-600 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-sky-50 transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {canManage && (
                                                    <button
                                                        onClick={() => handleDeleteReceipt(receipt)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-rose-50 transition-colors"
                                                        title="Hủy phiếu"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200/60 shadow-sm">
                        Hiển thị <span className="text-sky-600">{(txPage - 1) * txLimit + 1}</span> - <span className="text-sky-600">{Math.min(txPage * txLimit, txTotal)}</span> / {txTotal} phiếu
                    </div>
                    <Pagination
                        currentPage={txPage}
                        totalPages={txTotalPages}
                        total={txTotal}
                        limit={txLimit}
                        onPageChange={setTxPage}
                        onLimitChange={(newLimit) => { setTxLimit(newLimit); setTxPage(1); }}
                    />
                </div>
            </div>

            {/* Edit Transaction Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa giao dịch" maxWidth="max-w-md">
                <div className="space-y-5 pt-2 p-6">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-sm border border-slate-100 dark:border-slate-800 shadow-inner">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã giao dịch</span>
                            <span className="font-mono font-black text-sky-600 dark:text-sky-400">{editingTransaction?.id}</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Số lượng thực tế</label>
                        <input
                            type="number"
                            value={editQuantity}
                            onChange={e => setEditQuantity(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all">Hủy</button>
                        <button onClick={handleSaveEdit} className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 transition-all active:scale-95 uppercase text-xs tracking-wider">Lưu thay đổi</button>
                    </div>
                </div>
            </Modal>

            {/* View Transaction Details Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setViewingReceipt(null); }}
                title={viewingReceipt ? `CHI TIẾT PHIẾU: ${viewingReceipt.receiptId}` : "Chi tiết giao dịch"}
                maxWidth="max-w-4xl"
            >
                {viewingReceipt && (
                    <div className="space-y-6 pt-2 p-6">
                        <div className="grid grid-cols-3 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1 tracking-widest">Loại phiếu</label>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${viewingReceipt.type === 'IN' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                    {viewingReceipt.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}
                                </span>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1 tracking-widest">Thời gian</label>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {new Date(viewingReceipt.date).toLocaleDateString('vi-VN')} {viewingReceipt.transactions[0]?.transactionTime || ''}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1 tracking-widest">Người thực hiện</label>
                                <p className="text-sm font-black text-sky-600 dark:text-sky-400 uppercase tracking-tight">{viewingReceipt.user}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block tracking-[0.2em]">Danh sách vật tư</label>
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400">STT</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400">Mã vật tư</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400">Tên vật tư</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400">ĐVT</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400">Số lượng</th>
                                        {canManage && <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400">Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {viewingReceipt.transactions.map((t: any, idx: number) => {
                                        const materialInfo = getMaterialInfo(t.materialId);
                                        const isEditing = editingRowId === t.id;
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 text-slate-400 font-bold">{idx + 1}</td>
                                                <td className="px-4 py-3 font-mono font-black text-sky-600">{t.materialId}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{materialInfo.name}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-500">{materialInfo.unit}</td>
                                                <td className={`px-4 py-3 text-right font-black ${viewingReceipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <input
                                                                type="number"
                                                                value={editingQuantity}
                                                                onChange={(e) => setEditingQuantity(Number(e.target.value))}
                                                                className="w-24 px-3 py-1 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-lg text-sm text-right font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500/50 outline-none shadow-sm"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={async () => {
                                                                    if (editingQuantity <= 0) {
                                                                        toast.error('Số lượng phải > 0');
                                                                        return;
                                                                    }
                                                                    try {
                                                                        await transactionService.updateTransactionQuantity(t.id, editingQuantity);
                                                                        toast.success('Đã cập nhật');
                                                                        setEditingRowId(null);
                                                                        loadReceipts();
                                                                        onRefresh();
                                                                    } catch (error: any) {
                                                                        toast.error(error.message);
                                                                    }
                                                                }}
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button onClick={() => setEditingRowId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span>{viewingReceipt.type === 'IN' ? '+' : '-'}{formatNumber(t.quantity)}</span>
                                                    )}
                                                </td>
                                                {canManage && (
                                                    <td className="px-4 py-3 text-right">
                                                        {!isEditing && (
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    onClick={() => { setEditingRowId(t.id); setEditingQuantity(t.quantity); }}
                                                                    className="p-1.5 text-slate-400 hover:text-sky-600 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-sky-50 transition-colors"
                                                                    title="Sửa số lượng"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const tToDelete = t;
                                                                        setConfirmState({
                                                                            isOpen: true,
                                                                            title: 'Xóa vật tư',
                                                                            message: 'Xóa vật tư khỏi phiếu này?',
                                                                            type: 'danger',
                                                                            onConfirm: async () => {
                                                                                try {
                                                                                    await transactionService.deleteTransaction(tToDelete.id, currentUser?.id || 'SYSTEM');
                                                                                    toast.success('Đã xóa');
                                                                                    setIsViewModalOpen(false);
                                                                                    setViewingReceipt(null);
                                                                                    loadReceipts();
                                                                                    onRefresh();
                                                                                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                                                                                } catch (error: any) {
                                                                                    toast.error(error.message);
                                                                                }
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-red-50 transition-colors"
                                                                    title="Xóa vật tư"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 font-black border-t border-slate-200 dark:border-slate-700">
                                        <td colSpan={4} className="px-4 py-4 text-right uppercase text-[10px] text-slate-400 tracking-widest">Tổng cộng:</td>
                                        <td className={`px-4 py-4 text-right ${viewingReceipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                            {viewingReceipt.type === 'IN' ? '+' : '-'}{formatNumber(viewingReceipt.totalQuantity)}
                                        </td>
                                        {canManage && <td></td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 print:hidden">
                            <button onClick={() => window.print()} className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                <Printer size={16} /> In phiếu
                            </button>
                            <button onClick={() => { setIsViewModalOpen(false); setViewingReceipt(null); }} className="px-8 py-3 font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all">Đóng</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Hidden Printable Area for Batch Print */}
            <div className="hidden print:block space-y-20 p-4">
                {receiptData.filter(r => selectedReceiptIds.includes(r.receiptId)).map((r) => (
                    <div key={r.receiptId} className="page-break-after-always">
                        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                            <h1 className="text-2xl font-bold uppercase tracking-widest">PHIẾU {r.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}</h1>
                            <p className="text-sm mt-1">Mã phiếu: <span className="font-mono font-bold">{r.receiptId}</span></p>
                            <p className="text-xs mt-1 italic">Ngày lập: {new Date().toLocaleDateString('vi-VN')} - {new Date().toLocaleTimeString('vi-VN')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-10 pb-4 border-b border-slate-200">
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Loại phiếu</label><p className="text-sm font-bold uppercase">{r.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}</p></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Thời gian</label><p className="text-sm font-bold">{new Date(r.date).toLocaleDateString('vi-VN')} {r.transactions[0]?.transactionTime || ''}</p></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Người thực hiện</label><p className="text-sm font-bold uppercase">{r.user}</p></div>
                        </div>
                        <div className="mt-6">
                            <table className="w-full border-collapse border border-slate-800">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider">
                                        <th className="border border-slate-800 px-4 py-2">STT</th>
                                        <th className="border border-slate-800 px-4 py-2">Mã VT</th>
                                        <th className="border border-slate-800 px-4 py-2">Tên vật tư</th>
                                        <th className="border border-slate-800 px-4 py-2">ĐVT</th>
                                        <th className="border border-slate-800 px-4 py-2 text-right">Số lượng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {r.transactions.map((t: any, idx: number) => {
                                        const mat = getMaterialInfo(t.materialId);
                                        return (
                                            <tr key={t.id} className="text-xs">
                                                <td className="border border-slate-800 px-4 py-2 text-center">{idx + 1}</td>
                                                <td className="border border-slate-800 px-4 py-2 text-center font-mono font-bold">{t.materialId}</td>
                                                <td className="border border-slate-800 px-4 py-2 font-bold">{mat.name}</td>
                                                <td className="border border-slate-800 px-4 py-2 text-center">{mat.unit}</td>
                                                <td className="border border-slate-800 px-4 py-2 text-right font-black">{formatNumber(t.quantity)}</td>
                                            </tr>
                                        )
                                    })}
                                    <tr className="bg-slate-50 font-black text-xs uppercase">
                                        <td colSpan={4} className="border border-slate-800 px-4 py-2 text-right tracking-widest">TỔNG CỘNG:</td>
                                        <td className="border border-slate-800 px-4 py-2 text-right">{formatNumber(r.totalQuantity)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-12 grid grid-cols-2 text-center">
                            <div>
                                <p className="font-bold text-xs uppercase tracking-widest">Người lập phiếu</p>
                                <p className="text-[10px] italic mt-1">(Ký, họ tên)</p>
                            </div>
                            <div>
                                <p className="font-bold text-xs uppercase tracking-widest">Người nhận/giao hàng</p>
                                <p className="text-[10px] italic mt-1">(Ký, họ tên)</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
            />
        </div>
    );
};

export default TransactionHistory;