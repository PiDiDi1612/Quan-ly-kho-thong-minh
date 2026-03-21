import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
    FileText, Calendar, Search, Filter, Download, Trash2, Printer,
    AlertCircle, Check, ArrowRight, Activity, Clock, User as UserIcon, ArrowRightLeft, Package, ArrowLeft
} from 'lucide-react';
import { Transaction, ActivityLog, User, TransactionType, WorkshopCode, Material } from '../../types';
import { WORKSHOPS } from '../../constants';
import { Modal } from '../../components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '../../components/ui/date-input';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { apiService } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface ReportViewerProps {
    transactions: Transaction[];
    activityLogs: ActivityLog[];
    materials: Material[];
    currentUser: User | null;
    onRefresh: () => void;
    onBack?: () => void;
    initialTab?: 'history' | 'activity' | 'inventory';
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
    transactions,
    activityLogs,
    materials,
    currentUser,
    onRefresh,
    onBack,
    initialTab = 'history'
}) => {
    const toast = useToast();
    const toStartOfDay = (value: string) => {
        const d = new Date(value);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    };

    const toEndOfDay = (value: string) => {
        const d = new Date(value);
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    };

    const toTimestamp = (value: string) => {
        const t = new Date(value).getTime();
        return Number.isNaN(t) ? 0 : t;
    };

    const [activeTab, setActiveTab] = useState<'history' | 'activity' | 'inventory'>(initialTab as any);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

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

    // --- HISTORY STATE ---
    const [historyFilter, setHistoryFilter] = useState({
        type: 'ALL',
        workshop: 'ALL',
        startDate: '',
        endDate: '',
        orderCode: ''
    });
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());

    const toggleReceiptSelection = (receiptId: string) => {
        const newSelected = new Set(selectedReceipts);
        if (newSelected.has(receiptId)) newSelected.delete(receiptId);
        else newSelected.add(receiptId);
        setSelectedReceipts(newSelected);
    };

    const toggleAllSelection = () => {
        const allReceiptIds = new Set(filteredTransactions.map(t => t.receiptId));
        if (selectedReceipts.size === allReceiptIds.size && allReceiptIds.size > 0) {
            setSelectedReceipts(new Set());
        } else {
            setSelectedReceipts(allReceiptIds);
        }
    };

    const handleBulkPrint = async () => {
        if (selectedReceipts.size === 0) return;
        try {
            const response = await fetch(`${apiService.getBaseUrl()}/api/export/receipts/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ receiptIds: Array.from(selectedReceipts) })
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Phieu_HangLoat_${new Date().getTime()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi in hàng loạt");
        }
    };

    const handlePrintSingle = async (receiptId: string) => {
        try {
            const response = await fetch(`${apiService.getBaseUrl()}/api/export/receipt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ receiptId })
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Phieu_${receiptId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi in phiếu");
        }
    };

    // --- ACTIVITY STATE ---
    const [activityFilter, setActivityFilter] = useState({
        userId: 'ALL',
        entityType: 'ALL',
        startDate: '',
        endDate: ''
    });

    const isAdmin = currentUser?.role === 'ADMIN';

    // --- HISTORY LOGIC ---
    const filteredTransactions = useMemo(() => {
        const sTerm = historySearchTerm.toLowerCase();
        const safeTransactions = Array.isArray(transactions) ? transactions : [];
        return safeTransactions.filter(t => {
            const matchType = historyFilter.type === 'ALL' || t.type === historyFilter.type;
            const matchWorkshop = historyFilter.workshop === 'ALL' || t.workshop === historyFilter.workshop;
            const txTime = toTimestamp(t.date);
            const matchStart = !historyFilter.startDate || txTime >= toStartOfDay(historyFilter.startDate);
            const matchEnd = !historyFilter.endDate || txTime <= toEndOfDay(historyFilter.endDate);
            const matchOrder = !historyFilter.orderCode || (t.orderCode || '').toLowerCase().includes(historyFilter.orderCode.toLowerCase());
            const matchSearch = !sTerm ||
                (t.materialName || '').toLowerCase().includes(sTerm) ||
                (t.receiptId || '').toLowerCase().includes(sTerm) ||
                (t.orderCode || '').toLowerCase().includes(sTerm);

            return matchType && matchWorkshop && matchStart && matchEnd && matchOrder && matchSearch;
        });
    }, [transactions, historyFilter, historySearchTerm]);

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws_data: any[][] = [];

        const headerStyle = {
            fill: { fgColor: { rgb: "D9EAD3" } },
            font: { bold: true, sz: 14, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
        };
        const cellStyle = {
            font: { sz: 14 },
            alignment: { vertical: "center" },
            border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
        };
        const titleStyle = {
            font: { bold: true, sz: 16, color: { rgb: "20124D" } },
            alignment: { horizontal: "center" }
        };

        ws_data.push([{ v: "BÁO CÁO LỊCH SỬ GIAO DỊCH VẬT TƯ", t: "s", s: titleStyle }]);
        ws_data.push([{ v: `Ngày xuất: ${new Date().toLocaleString('en-GB')}`, t: "s", s: { alignment: { horizontal: "center" }, font: { sz: 14 } } }]);
        ws_data.push([]);

        const groupedByReceipt: { [key: string]: Transaction[] } = {};
        filteredTransactions.forEach(t => {
            if (!groupedByReceipt[t.receiptId]) groupedByReceipt[t.receiptId] = [];
            groupedByReceipt[t.receiptId].push(t);
        });

        Object.keys(groupedByReceipt).forEach(receiptId => {
            const txs = groupedByReceipt[receiptId];
            if (txs.length === 0) return;
            const firstTx = txs[0];
            ws_data.push([{ v: `MÃ PHIẾU: ${receiptId}`, t: "s", s: { font: { bold: true, sz: 14 } } }]);
            ws_data.push([{ v: `Ngày: ${firstTx.date} | Xưởng: ${firstTx.workshop} | Loại: ${firstTx.type === 'IN' ? 'Nhập' : firstTx.type === 'OUT' ? 'Xuất' : 'Điều chuyển'}`, t: "s", s: { font: { sz: 14 } } }]);

            ws_data.push([
                { v: "Mã vật tư", t: "s", s: headerStyle },
                { v: "Tên vật tư", t: "s", s: headerStyle },
                { v: "Số lượng", t: "s", s: headerStyle },
                { v: "Mã đơn hàng", t: "s", s: headerStyle }
            ]);

            txs.forEach(t => {
                ws_data.push([
                    { v: t.materialId, t: "s", s: cellStyle },
                    { v: t.materialName, t: "s", s: cellStyle },
                    { v: t.quantity, t: "n", s: { ...cellStyle, alignment: { horizontal: "center" } } },
                    { v: t.orderCode || "", t: "s", s: cellStyle }
                ]);
            });
            ws_data.push([]);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
        ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } });
        ws['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 15 }, { wch: 25 }];

        XLSX.utils.book_append_sheet(wb, ws, "Lịch sử giao dịch");
        XLSX.writeFile(wb, `LichSu_GD_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDeleteTransaction = async (tx: Transaction) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa giao dịch',
            message: `Bạn có chắc chắn muốn xóa phiếu ${tx.receiptId}? Tồn kho sẽ được hoàn tác. Thao tác này không thể hoàn tác.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await apiService.post('/api/transactions/delete_with_revert', { id: tx.id });
                    onRefresh();
                } catch (error) {
                    console.error(error);
                    toast.error("Lỗi khi xóa giao dịch");
                }
            }
        });
    };

    // --- ACTIVITY LOGIC ---
    const filteredActivityLogs = useMemo(() => {
        const safeLogs = Array.isArray(activityLogs) ? activityLogs : [];
        return safeLogs.filter(log => {
            const matchUser = activityFilter.userId === 'ALL' || log.userId === activityFilter.userId;
            const matchType = activityFilter.entityType === 'ALL' || log.entityType === activityFilter.entityType;
            const logTime = toTimestamp(log.timestamp);
            const matchStart = !activityFilter.startDate || logTime >= toStartOfDay(activityFilter.startDate);
            const matchEnd = !activityFilter.endDate || logTime <= toEndOfDay(activityFilter.endDate);
            return matchUser && matchType && matchStart && matchEnd;
        });
    }, [activityLogs, activityFilter]);

    const handleDeleteLog = async (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa nhật ký',
            message: 'Bạn có xóa nhật ký này?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await apiService.post('/api/activity_logs/delete', { id });
                    onRefresh();
                } catch (e) {
                    toast.error('Lỗi xóa nhật ký');
                }
            }
        });
    };

    const handleClearLogs = async () => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa tất cả nhật ký',
            message: 'Xóa tất cả nhật ký? Hành động này không thể hoàn tác.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await apiService.post('/api/activity_logs/clear', {});
                    onRefresh();
                } catch (e) {
                    toast.error('Lỗi xóa tất cả nhật ký');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                            <div className="relative col-span-1 md:col-span-2 group">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    placeholder="Tìm phiếu, vật tư, đơn hàng..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all uppercase placeholder:text-slate-400"
                                    value={historySearchTerm}
                                    onChange={e => setHistorySearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all uppercase text-slate-700 dark:text-slate-200"
                                    value={historyFilter.type}
                                    onChange={e => setHistoryFilter({ ...historyFilter, type: e.target.value })}
                                >
                                    <option value="ALL">Tất cả loại phiếu</option>
                                    <option value="IN">Nhập kho</option>
                                    <option value="OUT">Xuất kho</option>
                                    <option value="TRANSFER">Điều chuyển</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all uppercase text-slate-700 dark:text-slate-200"
                                    value={historyFilter.workshop}
                                    onChange={e => setHistoryFilter({ ...historyFilter, workshop: e.target.value })}
                                >
                                    <option value="ALL">Tất cả xưởng</option>
                                    {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Từ ngày:</span>
                                <DateInput value={historyFilter.startDate} onChange={val => setHistoryFilter({ ...historyFilter, startDate: val })} className="w-40" />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Đến ngày:</span>
                                <DateInput value={historyFilter.endDate} onChange={val => setHistoryFilter({ ...historyFilter, endDate: val })} className="w-40" />
                            </div>

                            <div className="ml-auto flex gap-3">
                                {selectedReceipts.size > 0 && (
                                    <button
                                        className="h-11 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center gap-2"
                                        onClick={handleBulkPrint}
                                    >
                                        <Printer size={18} className="stroke-[3]" />
                                        In phiếu ({selectedReceipts.size})
                                    </button>
                                )}
                                <button
                                    className="h-11 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2"
                                    onClick={handleExportExcel}
                                >
                                    <Download size={18} className="stroke-[3]" />
                                    Xuất Excel
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-6 py-5 w-10">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer transition-all"
                                                checked={selectedReceipts.size > 0 && selectedReceipts.size === new Set(filteredTransactions.map(t => t.receiptId)).size}
                                                onChange={toggleAllSelection}
                                            />
                                        </th>
                                        <th className="px-6 py-5 table-header-text">Mã phiếu</th>
                                        <th className="px-6 py-5 table-header-text">Ngày</th>
                                        <th className="px-6 py-5 table-header-text">Loại</th>
                                        <th className="px-6 py-5 table-header-text">Vật tư & Chi tiết</th>
                                        <th className="px-6 py-5 table-header-text text-center">Số lượng</th>
                                        <th className="px-6 py-5 table-header-text">Xưởng</th>
                                        <th className="px-6 py-5 table-header-text">Người lập</th>
                                        <th className="px-6 py-5 text-center table-header-text">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {filteredTransactions.map(tx => (
                                        <tr key={tx.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer transition-all"
                                                    checked={selectedReceipts.has(tx.receiptId)}
                                                    onChange={() => toggleReceiptSelection(tx.receiptId)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{tx.receiptId}</span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-[11px] text-slate-400 uppercase tabular-nums">
                                                {new Date(tx.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${tx.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                    tx.type === 'OUT' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800' :
                                                        'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-800'
                                                    }`}>
                                                    {tx.type === 'IN' ? 'Nhập' : tx.type === 'OUT' ? 'Xuất' : 'Điều chuyển'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{tx.materialName}</span>
                                                    {tx.orderCode && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{tx.orderCode}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-black text-lg text-slate-800 dark:text-white tabular-nums">
                                                {tx.quantity.toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase">{tx.workshop}</span>
                                                    {tx.targetWorkshop && (
                                                        <>
                                                            <ArrowRight size={12} className="text-slate-300" />
                                                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-[10px] font-black text-emerald-600 uppercase">{tx.targetWorkshop}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tx.user}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handlePrintSingle(tx.receiptId)} className="p-2.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-all" title="In phiếu"><Printer size={18} /></button>
                                                    {currentUser?.role === 'ADMIN' && (
                                                        <button onClick={() => handleDeleteTransaction(tx)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-all" title="Xóa giao dịch"><Trash2 size={18} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === 'activity' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                        <div className="flex items-center gap-4">
                            {onBack && (
                                <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 dark:text-white uppercase tracking-tight">
                                    <Activity className="text-sky-500" size={24} /> Nhật ký hoạt động
                                </h3>
                                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Lịch sử thao tác thay đổi dữ liệu hệ thống.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            {isAdmin && filteredActivityLogs.length > 0 && (
                                <button
                                    onClick={handleClearLogs}
                                    className="h-11 px-6 border-2 border-rose-100 dark:border-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95"
                                >
                                    <Trash2 size={16} className="stroke-[3]" /> Xóa tất cả
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredActivityLogs.map(log => (
                            <div key={log.id} className="group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-start gap-5">
                                <div className={`p-3.5 rounded-2xl shadow-inner ${log.entityType === 'TRANSACTION' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                    log.entityType === 'SYSTEM' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                                        log.entityType === 'USER' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                                            log.entityType === 'MATERIAL' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' :
                                                'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                                    }`}>
                                    {log.entityType === 'TRANSACTION' ? <ArrowRightLeft size={20} className="stroke-[2.5]" /> :
                                        log.entityType === 'SYSTEM' ? <Clock size={20} className="stroke-[2.5]" /> :
                                            log.entityType === 'USER' ? <UserIcon size={20} className="stroke-[2.5]" /> :
                                                <Activity size={20} className="stroke-[2.5]" />}
                                </div>
                                <div className="flex-1 pt-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{log.action}</h4>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg">{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{log.details}</p>
                                    <div className="flex items-center gap-1.5 mt-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{log.username}</span>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button onClick={() => handleDeleteLog(log.id)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                        <div className="flex items-center gap-4">
                            {onBack && (
                                <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 dark:text-white uppercase tracking-tight">
                                    <Package className="text-emerald-500" size={24} /> Báo cáo tồn kho
                                </h3>
                                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Tổng hợp số lượng vật tư hiện tại.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                className="h-11 px-6 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:border-emerald-200 dark:hover:text-emerald-400 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95 group bg-white dark:bg-slate-900"
                                onClick={() => {
                                    const wb = XLSX.utils.book_new();
                                    const data = materials.map(m => ({
                                        'Mã VT': m.id,
                                        'Tên vật tư': m.name,
                                        'Phân loại': m.classification,
                                        'ĐVT': m.unit,
                                        'Xưởng': m.workshop,
                                        'Tồn kho': m.quantity,
                                        'Định mức': m.minThreshold,
                                        'Cảnh báo': m.quantity <= m.minThreshold ? 'CẦN NHẬP' : 'ỔN ĐỊNH'
                                    }));
                                    const ws = XLSX.utils.json_to_sheet(data);
                                    XLSX.utils.book_append_sheet(wb, ws, "Tồn Kho Hiện Tại");
                                    XLSX.writeFile(wb, `BaoCao_TonKho_${new Date().toISOString().split('T')[0]}.xlsx`);
                                }}
                            >
                                <Download size={16} className="text-emerald-500 group-hover:scale-110 transition-transform stroke-[3]" /> Xuất Excel
                            </button>
                            <button
                                className="h-11 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2"
                                onClick={() => window.print()}
                            >
                                <Printer size={18} className="stroke-[3]" /> In báo cáo
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-6 py-5 table-header-text">Vật tư & Mã</th>
                                        <th className="px-6 py-5 table-header-text text-center">Phân loại</th>
                                        <th className="px-6 py-5 table-header-text text-center">Kho</th>
                                        <th className="px-6 py-5 table-header-text text-right">Tồn hiện tại</th>
                                        <th className="px-6 py-5 table-header-text text-right">Định mức</th>
                                        <th className="px-6 py-5 table-header-text text-center">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {materials.length > 0 ? materials.sort((a, b) => b.quantity - a.quantity).map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{m.name}</span>
                                                    <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{m.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${m.classification === 'Vật tư chính' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                                    {m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase rounded-xl tracking-wider">{m.workshop}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end leading-none gap-1">
                                                    <span className={`text-lg font-black tabular-nums ${m.quantity <= m.minThreshold ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                                                        {m.quantity.toLocaleString('vi-VN')}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-400 tabular-nums">
                                                {m.minThreshold.toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {m.quantity <= m.minThreshold ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse shadow-sm">
                                                        <AlertCircle size={12} className="stroke-[3]" /> Cần nhập ngay
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                        <Check size={12} className="stroke-[3]" /> Ổn định
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <Package size={48} />
                                                    <p className="font-black uppercase tracking-widest text-xs">Không có dữ liệu tồn kho</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

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
