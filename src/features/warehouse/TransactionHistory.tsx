<<<<<<< HEAD
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Package, Search, Download, Plus, Moon, Sun, RefreshCcw, LayoutDashboard,
    AlertTriangle, ShoppingCart, Edit2, Trash2, Eye, X, Filter, History,
    BarChart2, Check, Settings, Info, Calendar, Users, RotateCcw, Clock,
    Tag, Hash, ArrowDownLeft, ArrowUpRight, Layers, User as UserIcon,
    Ruler, Printer
} from 'lucide-react';
=======
<<<<<<< HEAD
import React, { useState, useMemo, useCallback, useEffect } from 'react';
=======
import React, { useState, useMemo } from 'react';
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
import { Package, Search, Download, Plus, Moon, Sun, RefreshCcw, LayoutDashboard, AlertTriangle, ShoppingCart, Edit2, Trash2, Eye, X, Filter, History, BarChart2, Check, Settings, Info, Calendar, Users, RotateCcw, Clock, Tag, Hash, ArrowDownLeft, ArrowUpRight, Layers, User as UserIcon, Ruler, Printer } from 'lucide-react';
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
import { Transaction, TransactionType, User } from '../../types';
import { Modal } from '../../components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { transactionService } from '../../domain';
<<<<<<< HEAD
import { apiService } from '@/services/api';
import * as XLSX from 'xlsx-js-style';
import { Pagination } from '@/components/ui/pagination';
=======
<<<<<<< HEAD
import { apiService } from '@/services/api';
import * as XLSX from 'xlsx-js-style';
import { Pagination } from '@/components/ui/pagination';
=======
import * as XLSX from 'xlsx-js-style';
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8

interface TransactionHistoryProps {
    transactions: Transaction[];
    materials: any[];
    currentUser: User | null;
    onRefresh: () => void;
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, materials, currentUser, onRefresh }) => {
    const toast = useToast();

<<<<<<< HEAD
    useEffect(() => {
=======
    React.useEffect(() => {
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
        const handlePrint = () => window.print();
        window.addEventListener('print-transactions', handlePrint);
        return () => window.removeEventListener('print-transactions', handlePrint);
    }, []);

<<<<<<< HEAD
    const canManage = currentUser?.role === 'ADMIN' || (currentUser?.permissions?.includes('MANAGE_WAREHOUSE') ?? false);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
=======
    // Derive canManage from permissions - ADMIN always has full access, others need MANAGE_WAREHOUSE
    const canManage = currentUser?.role === 'ADMIN' || (currentUser?.permissions?.includes('MANAGE_WAREHOUSE') ?? false);


    const [searchTerm, setSearchTerm] = useState('');
<<<<<<< HEAD
    const debouncedSearch = useDebounce(searchTerm, 500);
=======
    const debouncedSearch = useDebounce(searchTerm, 300);
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
    const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');

    // Edit Transaction State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editQuantity, setEditQuantity] = useState<number>(0);

    // Confirm Modal State
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

    // View Details Modal State
<<<<<<< HEAD
    const [viewingReceipt, setViewingReceipt] = useState<{
        receiptId: string,
        transactions: Transaction[],
        type: string,
        date: string,
        user: string,
        transactionTime?: string
    } | null>(null);
=======
    const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<{ receiptId: string, transactions: Transaction[], type: string, date: string, user: string } | null>(null);
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Batch Selection State
    const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);

    const toggleSelectReceipt = (receiptId: string) => {
        setSelectedReceiptIds(prev =>
            prev.includes(receiptId) ? prev.filter(id => id !== receiptId) : [...prev, receiptId]
        );
    };

    const handleBatchPrint = () => {
        if (selectedReceiptIds.length === 0) return;
        window.print();
    };

    // Inline editing state
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingQuantity, setEditingQuantity] = useState<number>(0);

    // Helper to get material info
    const getMaterialInfo = (materialId: string) => {
        const material = materials.find(m => m.id === materialId);
        return material || { name: 'N/A', unit: 'N/A' };
    };

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
    // ===== SERVER-SIDE PAGINATION =====
    const [receiptData, setReceiptData] = useState<any[]>([]);
    const [txPage, setTxPage] = useState(1);
    const [txLimit, setTxLimit] = useState(20);
    const [txTotal, setTxTotal] = useState(0);
    const [txTotalPages, setTxTotalPages] = useState(1);
    const [isLoadingTx, setIsLoadingTx] = useState(false);

<<<<<<< HEAD
=======
    // Reset page when filters change
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
    useEffect(() => { setTxPage(1); }, [debouncedSearch, typeFilter]);

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
    }, [txPage, txLimit, debouncedSearch, typeFilter]);

    useEffect(() => {
        const timer = setTimeout(loadReceipts, 200);
        return () => clearTimeout(timer);
    }, [loadReceipts]);

<<<<<<< HEAD
    const paginatedReceipts = receiptData;

    const handleSaveEdit = async () => {
        if (!editingTransaction) return;
        try {
=======
    // Alias for rendering
    const paginatedReceipts = receiptData;
=======
    const filteredTransactions = useMemo(() => {
        const term = debouncedSearch.toLowerCase();
        const safeTxs = Array.isArray(transactions) ? transactions : [];
        return safeTxs.filter(t => {
            const matchesSearch =
                (t.materialId || '').toLowerCase().includes(term) ||
                (t.user || '').toLowerCase().includes(term) ||
                (t.customerName || '').toLowerCase().includes(term); // Search by customer
            const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
            return matchesSearch && matchesType;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, debouncedSearch, typeFilter]);

    // Group transactions by receiptId for better organization
    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: Transaction[] } = {};
        filteredTransactions.forEach(t => {
            const key = t.receiptId || `single-${t.id}`; // Use receiptId or unique key
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [filteredTransactions]);

    // Convert groups to array for rendering, sorted by date
    const receiptSummaries = useMemo(() => {
        return Object.entries(groupedTransactions).map(([receiptId, transactions]: [string, Transaction[]]) => {
            const firstTx = transactions[0];
            const totalQty = transactions.reduce((sum, t) => sum + t.quantity, 0);
            return {
                receiptId,
                transactions,
                date: firstTx.date,
                type: firstTx.type,
                user: firstTx.user,
                itemCount: transactions.length,
                totalQuantity: totalQty
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [groupedTransactions]);
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685



    const handleEditTransaction = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setEditQuantity(transaction.quantity);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTransaction) return;

        try {
<<<<<<< HEAD
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
            await transactionService.updateTransactionQuantity(editingTransaction.id, editQuantity);
            toast.success('Cập nhật giao dịch thành công');
            setIsEditModalOpen(false);
            loadReceipts();
<<<<<<< HEAD
            onRefresh();
        } catch (error: any) {
=======
=======
            // NEW SERVICE LOGIC
            await transactionService.updateTransactionQuantity(editingTransaction.id, editQuantity);

            toast.success('Cập nhật giao dịch thành công');
            setIsEditModalOpen(false);
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
            onRefresh();
        } catch (error: any) {
            console.error(error);
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
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
<<<<<<< HEAD
                    await transactionService.deleteTransaction(transaction.id, currentUser?.id || 'SYSTEM');
                    toast.success('Đã xóa giao dịch và hoàn trả tồn kho');
                    loadReceipts();
                    onRefresh();
                } catch (error: any) {
=======
<<<<<<< HEAD
                    await transactionService.deleteTransaction(transaction.id, currentUser?.id || 'SYSTEM');
                    toast.success('Đã xóa giao dịch và hoàn trả tồn kho');
                    loadReceipts();
=======
                    // NEW SERVICE LOGIC
                    await transactionService.deleteTransaction(transaction.id, currentUser?.id || 'SYSTEM');
                    toast.success('Đã xóa giao dịch và hoàn trả tồn kho');
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
                    onRefresh();
                } catch (error: any) {
                    console.error(error);
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                    toast.error(error.message || 'Lỗi khi xóa giao dịch');
                }
            }
        });
    };

<<<<<<< HEAD
=======
    // Delete whole receipt (batch delete)
    const handleDeleteReceipt = (receipt: any) => {
        setConfirmState({
            isOpen: true,
            title: 'Hủy phiếu ' + (receipt.type === 'IN' ? 'Nhập' : 'Xuất'),
            message: `Bạn có chắc chắn muốn hủy toàn bộ phiếu này (${receipt.items.length} dòng)? Hành động này không thể hoàn tác.`,
            type: 'danger',
            onConfirm: async () => {
                try {
<<<<<<< HEAD
=======
                    // NEW SERVICE LOGIC: loop delete or implementation batch delete if available
                    // For now loop delete is safer to reuse logic
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
                    for (const item of receipt.items) {
                        await transactionService.deleteTransaction(item.id, currentUser?.id || 'SYSTEM');
                    }
                    toast.success('Đã hủy phiếu thành công');
<<<<<<< HEAD
                    loadReceipts();
=======
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
                    onRefresh();
                } catch (error: any) {
                    console.error(error);
                    toast.error('Lỗi khi hủy phiếu: ' + error.message);
                }
            }
        });
    }

<<<<<<< HEAD
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
    const handleExportHistory = async () => {
        try {
            const allTx = await apiService.get<any[]>('/api/transactions/all');
            const safeTx = Array.isArray(allTx) ? allTx : [];
            const data = safeTx.map(t => ({
                'Ngày': new Date(t.date).toLocaleDateString('en-GB') + ' ' + (t.transactionTime || ''),
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
            XLSX.writeFile(wb, `Lich_Su_Giao_Dich_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            toast.error('Lỗi khi xuất Excel');
        }
<<<<<<< HEAD
=======
=======
    const handleExportHistory = () => {
        const data = filteredTransactions.map(t => ({
            'Ngày': new Date(t.date).toLocaleDateString('en-GB') + ' ' + new Date(t.date).toLocaleTimeString('en-GB'),
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
        XLSX.writeFile(wb, `Lich_Su_Giao_Dich_${new Date().toISOString().split('T')[0]}.xlsx`);
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center relative">
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <div className="relative group flex-1 md:w-80">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Tìm theo mã VT, người dùng, khách..."
                            className="pl-12"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto ml-auto">
                    <div className="flex p-1 bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-white/5 rounded-xl h-10 shadow-sm mr-2">
                        <button onClick={() => setTypeFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'ALL' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tất cả</button>
                        <button onClick={() => setTypeFilter('IN')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'IN' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Nhập kho</button>
                        <button onClick={() => setTypeFilter('OUT')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'OUT' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Xuất kho</button>
                    </div>

                    {canManage && (
                        <>
                            <Button variant="outline" className="h-10 bg-white dark:bg-[#1E293B] border-slate-200/60 dark:border-white/5 transition-colors text-xs font-semibold shadow-sm" onClick={() => window.print()}>
                                <Printer className="mr-2 h-4 w-4 text-slate-500" />
                                <span className="hidden sm:inline">In Lịch Sử</span>
                            </Button>
                            <Button variant="outline" className="h-10 bg-white dark:bg-[#1E293B] border-slate-200/60 dark:border-white/5 transition-colors text-xs font-semibold shadow-sm" onClick={handleExportHistory}>
                                <Download className="mr-2 h-4 w-4 text-emerald-600" />
                                <span className="hidden sm:inline">Xuất Excel</span>
                            </Button>
                        </>
                    )}
                </div>

<<<<<<< HEAD
=======
                {/* Batch Action Bar */}
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                {selectedReceiptIds.length > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white dark:bg-sky-600 rounded-xl flex items-center gap-6 px-5 py-2 animate-in zoom-in-95 duration-300 z-10 shadow-xl border border-slate-200 dark:border-sky-500">
                        <div className="flex items-center gap-3 text-slate-800 dark:text-white border-r border-slate-200 dark:border-white/20 pr-5">
                            <div className="w-7 h-7 bg-sky-100 dark:bg-white/20 text-sky-600 dark:text-white rounded-lg flex items-center justify-center font-black text-xs">{selectedReceiptIds.length}</div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Đã chọn</span>
                        </div>
                        <div className="flex items-center gap-4">
<<<<<<< HEAD
                            <button onClick={() => setSelectedReceiptIds([])} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors">Hủy chọn</button>
                            <Button onClick={handleBatchPrint} className="bg-sky-600 dark:bg-white text-white dark:text-sky-600 hover:bg-sky-700 dark:hover:bg-sky-50 px-4 h-8 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg shadow-sm">
=======
                            <button
                                onClick={() => setSelectedReceiptIds([])}
                                className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors"
                            >
                                Hủy chọn
                            </button>
                            <Button
                                onClick={handleBatchPrint}
                                className="bg-sky-600 dark:bg-white text-white dark:text-sky-600 hover:bg-sky-700 dark:hover:bg-sky-50 px-4 h-8 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg shadow-sm"
                            >
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                <Printer size={14} /> In {selectedReceiptIds.length} phiếu
                            </Button>
                        </div>
                    </div>
                )}
            </div>

<<<<<<< HEAD
=======

>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-widest font-bold text-[10px]">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center">
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
<<<<<<< HEAD
                                        checked={selectedReceiptIds.length === paginatedReceipts.length && paginatedReceipts.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedReceiptIds(paginatedReceipts.map(r => r.receiptId));
=======
<<<<<<< HEAD
                                        checked={selectedReceiptIds.length === paginatedReceipts.length && paginatedReceipts.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedReceiptIds(paginatedReceipts.map(r => r.receiptId));
=======
                                        checked={selectedReceiptIds.length === receiptSummaries.length && receiptSummaries.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedReceiptIds(receiptSummaries.map(r => r.receiptId));
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                            else setSelectedReceiptIds([]);
                                        }}
                                    />
                                </div>
                            </th>
                            <th className="px-6 py-4"><Clock size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Thời gian</th>
                            <th className="px-6 py-4"><Tag size={12} className="inline mr-1 text-indigo-500 -mt-0.5" />Loại</th>
                            <th className="px-6 py-4"><Hash size={12} className="inline mr-1 text-slate-400 -mt-0.5" />Mã phiếu</th>
                            <th className="px-4 py-4 text-right"><Layers size={12} className="inline mr-1 -mt-0.5" />Số mặt hàng</th>
                            <th className="px-4 py-4 text-right"><BarChart2 size={12} className="inline mr-1 -mt-0.5" />Tổng số lượng</th>
                            <th className="px-6 py-4"><UserIcon size={12} className="inline mr-1 text-emerald-500 -mt-0.5" />Người thực hiện</th>
                            <th className="px-6 py-4 text-right"><Settings size={12} className="inline mr-1 -mt-0.5" />Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
<<<<<<< HEAD
                        {isLoadingTx && paginatedReceipts.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}><td colSpan={8} className="px-6 py-4"><div className="h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" /></td></tr>
                        ))}
                        {paginatedReceipts.map((receipt) => (
=======
<<<<<<< HEAD
                        {paginatedReceipts.map((receipt) => (
=======
                        {receiptSummaries.map((receipt) => (
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                            <tr key={receipt.receiptId} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${selectedReceiptIds.includes(receipt.receiptId) ? 'bg-sky-50/50 dark:bg-sky-900/20' : ''}`} onClick={() => toggleSelectReceipt(receipt.receiptId)}>
                                <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                                            checked={selectedReceiptIds.includes(receipt.receiptId)}
                                            onChange={() => toggleSelectReceipt(receipt.receiptId)}
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{new Date(receipt.date).toLocaleDateString('vi-VN')}</span>
<<<<<<< HEAD
                                        <span className="text-[10px] text-slate-400">{receipt.transactions[0]?.transactionTime || new Date(receipt.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
=======
                                        <span className="text-[10px] text-slate-400">{receipt.transactions[0].transactionTime || new Date(receipt.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${receipt.type === 'IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
<<<<<<< HEAD
                                        receipt.type === 'OUT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-sky-100 text-sky-700'}`}>
=======
                                        receipt.type === 'OUT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-sky-100 text-sky-700'
                                        }`}>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                        {receipt.type === 'IN' ? 'Nhập' : receipt.type === 'OUT' ? 'Xuất' : 'Điều chuyển'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-sky-600 dark:text-sky-400 font-bold">{receipt.receiptId || 'N/A'}</td>
                                <td className="px-4 py-4 text-right">
<<<<<<< HEAD
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold whitespace-nowrap">{(receipt.items || receipt.transactions || []).length} mặt hàng</span>
                                </td>
                                <td className={`px-4 py-4 text-right font-bold ${receipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                    {receipt.type === 'IN' ? '+' : '-'}{formatNumber(receipt.totalQuantity || (receipt.items || receipt.transactions || []).reduce((sum: number, i: any) => sum + i.quantity, 0))}
=======
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold whitespace-nowrap">{receipt.itemCount} mặt hàng</span>
                                </td>
                                <td className={`px-4 py-4 text-right font-bold ${receipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                    {receipt.type === 'IN' ? '+' : '-'}{formatNumber(receipt.totalQuantity)}
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-xs uppercase font-bold">{receipt.user}</td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
<<<<<<< HEAD
                                                const items = receipt.items || receipt.transactions || [];
                                                setViewingReceipt({
                                                    receiptId: receipt.receiptId,
                                                    transactions: items,
                                                    type: receipt.type,
                                                    date: receipt.date,
                                                    user: receipt.user,
                                                    transactionTime: items[0]?.transactionTime
=======
                                                setViewingReceipt({
                                                    receiptId: receipt.receiptId,
                                                    transactions: receipt.transactions,
                                                    type: receipt.type,
                                                    date: receipt.date,
                                                    user: receipt.user,
                                                    transactionTime: receipt.transactions[0]?.transactionTime // Lấy time từ giao dịch đầu tiên
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                                });
                                                setIsViewModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-green-600 bg-slate-50 dark:bg-slate-700 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all"
                                            title="Xem chi tiết"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {canManage && (
<<<<<<< HEAD
                                            <button onClick={() => {
                                                const items = receipt.items || receipt.transactions || [];
                                                if (items.length > 1) {
                                                    toast.error('Không thể xóa phiếu có nhiều vật tư. Vui lòng xóa từng vật tư riêng lẻ.');
                                                } else {
                                                    handleDeleteTransaction(items[0]);
                                                }
                                            }} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Xóa"><Trash2 size={16} /></button>
=======
                                            <>
                                                <button onClick={() => {
                                                    if (receipt.itemCount > 1) {
                                                        toast.error('Không thể xóa phiếu có nhiều vật tư. Vui lòng xóa từng vật tư riêng lẻ.');
                                                    } else {
                                                        handleDeleteTransaction(receipt.transactions[0]);
                                                    }
                                                }} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Xóa"><Trash2 size={16} /></button>
                                            </>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
<<<<<<< HEAD
=======
<<<<<<< HEAD
                {/* Pagination controls */}
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                <Pagination
                    currentPage={txPage}
                    totalPages={txTotalPages}
                    total={txTotal}
                    limit={txLimit}
                    onPageChange={setTxPage}
                    onLimitChange={(newLimit) => { setTxLimit(newLimit); setTxPage(1); }}
                    className="px-4 border-t border-slate-200 dark:border-slate-700"
                />
<<<<<<< HEAD
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa giao dịch" maxWidth="max-w-md">
                <div className="space-y-4 pt-2 p-6">
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 font-bold">
                        <p>Đang sửa giao dịch: <span className="text-sky-600">{editingTransaction?.id}</span></p>
                        <p>Vật tư: <span className="text-sky-600">{editingTransaction?.materialId}</span></p>
                    </div>
                    <div>
                        <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Số lượng thực tế</label>
                        <Input type="number" value={editQuantity} onChange={e => setEditQuantity(Number(e.target.value))} className="h-11 rounded-xl font-black" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="font-bold">Hủy</Button>
                        <Button onClick={handleSaveEdit} className="bg-sky-600 text-white font-black px-8">Lưu thay đổi</Button>
=======
=======
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
            </div>



            {/* Edit Transaction Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Chỉnh sửa giao dịch"
                maxWidth="max-w-md"
            >
                <div className="space-y-4 pt-2">
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                        <p>Đang sửa giao dịch: <span className="font-bold">{editingTransaction?.id}</span></p>
                        <p>Vật tư: <span className="font-bold">{editingTransaction?.materialId}</span></p>
                    </div>

                    <Input
                        label="Số lượng thực tế"
                        type="number"
                        value={editQuantity}
                        onChange={e => setEditQuantity(Number(e.target.value))}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveEdit} className="bg-sky-600 text-white">Lưu thay đổi</Button>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                    </div>
                </div>
            </Modal>

<<<<<<< HEAD
            <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setViewingReceipt(null); }} title={viewingReceipt ? `Chi tiết phiếu: ${viewingReceipt.receiptId}` : "Chi tiết giao dịch"} maxWidth="max-w-4xl">
                {viewingReceipt && (
                    <div className="space-y-4 pt-2 p-6 printable-content">
                        <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6">
                            <h1 className="text-2xl font-bold uppercase tracking-widest">PHIẾU {viewingReceipt.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}</h1>
                            <p className="text-sm mt-1">Mã phiếu: <span className="font-mono font-bold">{viewingReceipt.receiptId}</span></p>
                            <p className="text-xs mt-1 italic">Ngày lập: {new Date().toLocaleDateString('vi-VN')} - {new Date().toLocaleTimeString('vi-VN')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                            <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Loại phiếu</label><p className="text-sm"><span className={`px-2 py-1 rounded text-xs font-black uppercase ${viewingReceipt.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{viewingReceipt.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}</span></p></div>
                            <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Thời gian</label><p className="text-sm font-bold">{new Date(viewingReceipt.date).toLocaleDateString('vi-VN')} {viewingReceipt.transactionTime || ''}</p></div>
                            <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Người thực hiện</label><p className="text-sm font-black uppercase text-sky-600">{viewingReceipt.user}</p></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-500">STT</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-500">Mã vật tư</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-500">Tên vật tư</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-500">Đơn vị</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-500">Số lượng</th>
                                        {canManage && <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-500">Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
=======
            {/* View Transaction Details Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setViewingReceipt(null); }}
                title={viewingReceipt ? `Chi tiết phiếu: ${viewingReceipt.receiptId}` : "Chi tiết giao dịch"}
                maxWidth="max-w-4xl"
            >
                {viewingReceipt ? (
                    <div className="space-y-4 printable-content">
                        {/* Header phiếu in */}
                        <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6">
                            <h1 className="text-2xl font-bold uppercase tracking-widest">
                                PHIẾU {viewingReceipt.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}
                            </h1>
                            <p className="text-sm mt-1">Mã phiếu: <span className="font-mono font-bold">{viewingReceipt.receiptId}</span></p>
                            <p className="text-xs mt-1 italic">Ngày lập: {new Date().toLocaleDateString('vi-VN')} - {new Date().toLocaleTimeString('vi-VN')}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Loại phiếu</label>
                                <p className="text-sm mt-1">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${viewingReceipt.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {viewingReceipt.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Thời gian</label>
                                <p className="text-sm mt-1">
                                    {new Date(viewingReceipt.date).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })}
                                    {' '}
                                    {viewingReceipt.transactionTime || new Date(viewingReceipt.date).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Người thực hiện</label>
                                <p className="text-sm font-bold mt-1">{viewingReceipt.user}</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Danh sách vật tư ({viewingReceipt.transactions.length} mặt hàng)</label>
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">STT</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase"><Hash size={11} className="inline mr-1 -mt-0.5" />Mã vật tư</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase"><Package size={11} className="inline mr-1 text-sky-500 -mt-0.5" />Tên vật tư</th>
                                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 uppercase"><Ruler size={11} className="inline mr-1 -mt-0.5" />Đơn vị</th>
                                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase"><BarChart2 size={11} className="inline mr-1 -mt-0.5" />Số lượng</th>
                                        {canManage && <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase"><Settings size={11} className="inline mr-1 -mt-0.5" />Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                    {viewingReceipt.transactions.map((t, idx) => {
                                        const materialInfo = getMaterialInfo(t.materialId);
                                        const isEditing = editingRowId === t.id;
                                        return (
<<<<<<< HEAD
                                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 text-slate-400 font-bold">{idx + 1}</td>
                                                <td className="px-4 py-3 font-mono font-black text-sky-600">{t.materialId}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700">{materialInfo.name}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-500">{materialInfo.unit}</td>
                                                <td className={`px-4 py-3 text-right font-black ${viewingReceipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <input type="number" value={editingQuantity} onChange={(e) => setEditingQuantity(Number(e.target.value))} className="w-20 px-2 py-1 border border-sky-300 rounded text-sm text-right font-black focus:ring-2 focus:ring-sky-500 outline-none" autoFocus />
                                                            <button onClick={async () => { if (editingQuantity <= 0) { toast.error('Số lượng phải > 0'); return; } try { await transactionService.updateTransactionQuantity(t.id, editingQuantity); toast.success('Đã cập nhật'); setEditingRowId(null); onRefresh(); loadReceipts(); } catch (error: any) { toast.error(error.message); } }} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                                                            <button onClick={() => setEditingRowId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
=======
                                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{idx + 1}</td>
                                                <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white">{t.materialId}</td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{materialInfo.name}</td>
                                                <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{materialInfo.unit}</td>
                                                <td className={`px-4 py-3 text-right font-bold ${viewingReceipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <input
                                                                type="number"
                                                                value={editingQuantity}
                                                                onChange={(e) => setEditingQuantity(Number(e.target.value))}
                                                                className="w-24 px-2 py-1 border border-sky-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={async () => {
                                                                    if (editingQuantity <= 0) {
                                                                        toast.error('Số lượng phải lớn hơn 0');
                                                                        return;
                                                                    }
                                                                    try {
                                                                        await transactionService.updateTransactionQuantity(t.id, editingQuantity);
                                                                        toast.success('Cập nhật thành công');
                                                                        setEditingRowId(null);
                                                                        onRefresh();
                                                                    } catch (error: any) {
                                                                        toast.error(error.message || 'Lỗi khi cập nhật');
                                                                    }
                                                                }}
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                                title="Lưu"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingRowId(null);
                                                                    setEditingQuantity(0);
                                                                }}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                title="Hủy"
                                                            >
                                                                <X size={16} />
                                                            </button>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                                        </div>
                                                    ) : (
                                                        <span>{viewingReceipt.type === 'IN' ? '+' : '-'}{formatNumber(t.quantity)}</span>
                                                    )}
                                                </td>
                                                {canManage && (
                                                    <td className="px-4 py-3 text-right">
                                                        {!isEditing && (
<<<<<<< HEAD
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => { setEditingRowId(t.id); setEditingQuantity(t.quantity); }} className="p-1.5 text-slate-400 hover:text-sky-600 bg-slate-50 rounded-lg hover:bg-sky-50"><Edit2 size={14} /></button>
                                                                <button onClick={() => { setIsViewModalOpen(false); setViewingReceipt(null); handleDeleteTransaction(t); }} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
=======
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingRowId(t.id);
                                                                        setEditingQuantity(t.quantity);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded transition-all"
                                                                    title="Sửa số lượng"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setIsViewModalOpen(false);
                                                                        setViewingReceipt(null);
                                                                        handleDeleteTransaction(t);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded transition-all"
                                                                    title="Xóa"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
<<<<<<< HEAD
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 font-black border-t border-slate-200">
                                        <td colSpan={canManage ? 4 : 3} className="px-4 py-4 text-right uppercase text-[10px] text-slate-500 tracking-wider">Tổng cộng:</td>
                                        <td className={`px-4 py-4 text-right ${viewingReceipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{viewingReceipt.type === 'IN' ? '+' : '-'}{formatNumber(viewingReceipt.transactions.reduce((sum, t) => sum + t.quantity, 0))}</td>
=======
                                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                                        <td colSpan={canManage ? 4 : 3} className="px-4 py-3 text-right uppercase text-xs text-slate-600 dark:text-slate-400">Tổng cộng:</td>
                                        <td className={`px-4 py-3 text-right font-bold ${viewingReceipt.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                            {viewingReceipt.type === 'IN' ? '+' : '-'}{formatNumber(viewingReceipt.transactions.reduce((sum, t) => sum + t.quantity, 0))}
                                        </td>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                        {canManage && <td></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
<<<<<<< HEAD
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 print:hidden">
                            <Button variant="outline" onClick={() => window.print()} className="h-11 rounded-xl font-bold gap-2"><Printer size={16} /> In phiếu</Button>
                            <Button variant="ghost" onClick={() => { setIsViewModalOpen(false); setViewingReceipt(null); }} className="h-11 rounded-xl font-bold px-8">Đóng</Button>
                        </div>
                    </div>
                )}
=======

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 print:hidden">
                            <Button variant="success" onClick={() => window.print()} className="flex items-center gap-2">
                                <Printer size={16} /> In phiếu
                            </Button>
                            <Button variant="secondary" onClick={() => { setIsViewModalOpen(false); setViewingReceipt(null); }}>Đóng</Button>
                        </div>
                    </div>
                ) : null}
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
            </Modal>

            {/* Hidden Printable Area for Batch Print */}
            <div className="hidden print:block space-y-20 p-4">
<<<<<<< HEAD
                {paginatedReceipts.filter(r => selectedReceiptIds.includes(r.receiptId)).map((r) => (
                    <div key={r.receiptId} className="page-break-after-always">
                        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                            <h1 className="text-2xl font-bold uppercase tracking-widest">PHIẾU {r.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}</h1>
                            <p className="text-sm mt-1">Mã phiếu: <span className="font-mono font-bold">{r.receiptId}</span></p>
                            <p className="text-xs mt-1 italic">Ngày lập: {new Date().toLocaleDateString('vi-VN')} - {new Date().toLocaleTimeString('vi-VN')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-10 pb-4 border-b border-slate-200">
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Loại phiếu</label><p className="text-sm font-bold uppercase">{r.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}</p></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Thời gian</label><p className="text-sm font-bold">{new Date(r.date).toLocaleDateString('vi-VN')} {(r.items || r.transactions || [])[0]?.transactionTime || ''}</p></div>
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
                                    {(r.items || r.transactions || []).map((t: any, idx: number) => {
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
                                        <td className="border border-slate-800 px-4 py-2 text-right">{formatNumber(r.totalQuantity || (r.items || r.transactions || []).reduce((sum: number, i: any) => sum + i.quantity, 0))}</td>
=======
<<<<<<< HEAD
                {paginatedReceipts.filter(r => selectedReceiptIds.includes(r.receiptId)).map((r, pIdx) => (
=======
                {receiptSummaries.filter(r => selectedReceiptIds.includes(r.receiptId)).map((r, pIdx) => (
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
                    <div key={r.receiptId} className="page-break-after-always">
                        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                            <h1 className="text-2xl font-bold uppercase tracking-widest">
                                PHIẾU {r.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}
                            </h1>
                            <p className="text-sm mt-1">Mã phiếu: <span className="font-mono font-bold">{r.receiptId}</span></p>
                            <p className="text-xs mt-1 italic">Ngày lập: {new Date().toLocaleDateString('vi-VN')} - {new Date().toLocaleTimeString('vi-VN')}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-10 pb-4 border-b border-slate-200">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Loại phiếu</label>
                                <p className="text-sm font-bold uppercase">{r.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Thời gian</label>
                                <p className="text-sm font-bold">
                                    {new Date(r.date).toLocaleDateString('vi-VN')} {r.transactions[0].transactionTime || new Date(r.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Người thực hiện</label>
                                <p className="text-sm font-bold uppercase">{r.user}</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <table className="w-full border-collapse border border-slate-800">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="border border-slate-800 px-4 py-2 text-xs font-bold uppercase">STT</th>
                                        <th className="border border-slate-800 px-4 py-2 text-xs font-bold uppercase">Mã VT</th>
                                        <th className="border border-slate-800 px-4 py-2 text-xs font-bold uppercase">Tên vật tư</th>
                                        <th className="border border-slate-800 px-4 py-2 text-xs font-bold uppercase">ĐVT</th>
                                        <th className="border border-slate-800 px-4 py-2 text-right text-xs font-bold uppercase">Số lượng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {r.transactions.map((t, idx) => {
                                        const mat = getMaterialInfo(t.materialId);
                                        return (
                                            <tr key={t.id}>
                                                <td className="border border-slate-800 px-4 py-2 text-center text-xs">{idx + 1}</td>
                                                <td className="border border-slate-800 px-4 py-2 text-center font-mono text-xs font-bold">{t.materialId}</td>
                                                <td className="border border-slate-800 px-4 py-2 text-xs">{mat.name}</td>
                                                <td className="border border-slate-800 px-4 py-2 text-center text-xs">{mat.unit}</td>
                                                <td className="border border-slate-800 px-4 py-2 text-right font-bold text-xs">{formatNumber(t.quantity)}</td>
                                            </tr>
                                        )
                                    })}
                                    <tr className="bg-slate-50 font-bold">
                                        <td colSpan={4} className="border border-slate-800 px-4 py-2 text-right text-xs">TỔNG CỘNG:</td>
                                        <td className="border border-slate-800 px-4 py-2 text-right text-xs">{formatNumber(r.totalQuantity)}</td>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
                                    </tr>
                                </tbody>
                            </table>
                        </div>
<<<<<<< HEAD
                        <div className="mt-12 grid grid-cols-2 text-center">
                            <div><p className="font-bold text-xs uppercase tracking-widest">Người lập phiếu</p><p className="text-[10px] italic mt-1">(Ký, họ tên)</p></div>
                            <div><p className="font-bold text-xs uppercase tracking-widest">Người nhận/giao hàng</p><p className="text-[10px] italic mt-1">(Ký, họ tên)</p></div>
=======

                        <div className="mt-12 grid grid-cols-2 text-center">
                            <div>
                                <p className="font-bold text-xs uppercase">Người lập phiếu</p>
                                <p className="text-[10px] italic mt-1">(Ký, họ tên)</p>
                            </div>
                            <div>
                                <p className="font-bold text-xs uppercase">Người nhận/giao hàng</p>
                                <p className="text-[10px] italic mt-1">(Ký, họ tên)</p>
                            </div>
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
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
<<<<<<< HEAD
=======

>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
