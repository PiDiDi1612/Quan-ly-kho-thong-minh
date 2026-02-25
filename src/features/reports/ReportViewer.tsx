import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
    FileText, Calendar, Search, Filter, Download, Trash2, Printer,
    AlertCircle, Check, ArrowRight, Activity, Clock, User as UserIcon, ArrowRightLeft
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
    initialTab?: 'history' | 'activity';
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
    transactions,
    activityLogs,
    materials,
    currentUser,
    onRefresh,
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

    const [activeTab, setActiveTab] = useState<'history' | 'activity'>(initialTab);

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
            toast.error("L?i khi in hàng lo?t");
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
            toast.error("L?i khi in phi?u");
        }
    };

    // --- ACTIVITY STATE ---
    const [activityFilter, setActivityFilter] = useState({
        userId: 'ALL',
        entityType: 'ALL',
        startDate: '',
        endDate: ''
    });

    const canManage = currentUser?.permissions.includes('MANAGE_WAREHOUSE') || currentUser?.role === 'ADMIN';
    const isAdmin = currentUser?.role === 'ADMIN';

    // --- HISTORY LOGIC ---
    const filteredTransactions = useMemo(() => {
        const sTerm = historySearchTerm.toLowerCase();
        return transactions.filter(t => {
            const matchType = historyFilter.type === 'ALL' || t.type === historyFilter.type;
            const matchWorkshop = historyFilter.workshop === 'ALL' || t.workshop === historyFilter.workshop;
            const txTime = toTimestamp(t.date);
            const matchStart = !historyFilter.startDate || txTime >= toStartOfDay(historyFilter.startDate);
            const matchEnd = !historyFilter.endDate || txTime <= toEndOfDay(historyFilter.endDate);
            const matchOrder = !historyFilter.orderCode || (t.orderCode || '').toLowerCase().includes(historyFilter.orderCode.toLowerCase());
            const matchSearch = !sTerm ||
                t.materialName.toLowerCase().includes(sTerm) ||
                t.receiptId.toLowerCase().includes(sTerm) ||
                (t.orderCode || '').toLowerCase().includes(sTerm);

            return matchType && matchWorkshop && matchStart && matchEnd && matchOrder && matchSearch;
        });
    }, [transactions, historyFilter, historySearchTerm]);

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws_data: any[][] = [];

        // Styles
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

        // Group by Receipt
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
                    // Atomic revert + delete (supports IN/OUT/TRANSFER)
                    await apiService.post('/api/transactions/delete_with_revert', { id: tx.id });

                    // Refresh Data
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
        return activityLogs.filter(log => {
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

            {/* CONTENT */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {/* FILTERS */}
                    <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative col-span-1 md:col-span-2">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input placeholder="Tìm ki?m phi?u, v?t tu, don hàng..." className="pl-10" value={historySearchTerm} onChange={e => setHistorySearchTerm(e.target.value)} />
                        </div>
                        <select
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-sm"
                            value={historyFilter.type}
                            onChange={e => setHistoryFilter({ ...historyFilter, type: e.target.value })}
                        >
                            <option value="ALL">Tất cả loại phiếu</option>
                            <option value="IN">Nhập kho</option>
                            <option value="OUT">Xuất kho</option>
                            <option value="TRANSFER">Điều chuyển</option>
                        </select>
                        <select
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-sm"
                            value={historyFilter.workshop}
                            onChange={e => setHistoryFilter({ ...historyFilter, workshop: e.target.value })}
                        >
                            <option value="ALL">Tất cả xưởng</option>
                            {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                        </select>
                        <div className="md:col-span-4 flex gap-4 border-t pt-4 border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase text-slate-400">Từ ngày:</span>
                                <DateInput value={historyFilter.startDate} onChange={val => setHistoryFilter({ ...historyFilter, startDate: val })} className="w-36" placeholder="dd/mm/yyyy" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase text-slate-400">Đến ngày:</span>
                                <DateInput value={historyFilter.endDate} onChange={val => setHistoryFilter({ ...historyFilter, endDate: val })} className="w-36" placeholder="dd/mm/yyyy" />
                            </div>
                            <div className="ml-auto flex gap-3">
                                {selectedReceipts.size > 0 && (
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                        onClick={handleBulkPrint}
                                    >
                                        <Printer className="mr-2 h-4 w-4" />
                                        In đã chọn ({selectedReceipts.size})
                                    </Button>
                                )}
                                <Button className="bg-green-600 hover:bg-green-700 text-white shadow-green-500/20" onClick={handleExportExcel}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Xuất Excel
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                checked={selectedReceipts.size > 0 && selectedReceipts.size === new Set(filteredTransactions.map(t => t.receiptId)).size}
                                                onChange={toggleAllSelection}
                                            />
                                        </th>
                                        <th className="px-6 py-4 font-extrabold">Mã phiếu</th>
                                        <th className="px-6 py-4 font-extrabold">Ngày</th>
                                        <th className="px-6 py-4 font-extrabold">Loại</th>
                                        <th className="px-6 py-4 font-extrabold">Vị trí</th>
                                        <th className="px-6 py-4 font-extrabold text-center">Số lượng</th>
                                        <th className="px-6 py-4 font-extrabold">Xưởng</th>
                                        <th className="px-6 py-4 font-extrabold">Người thực hiện</th>
                                        <th className="px-6 py-4 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    checked={selectedReceipts.has(tx.receiptId)}
                                                    onChange={() => toggleReceiptSelection(tx.receiptId)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{tx.receiptId}</td>
                                            <td className="px-6 py-4 font-medium text-slate-500">{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tx.type === 'IN' ? 'bg-green-100 text-green-700' :
                                                    tx.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {tx.type === 'IN' ? 'Nh?p' : tx.type === 'OUT' ? 'Xu?t' : 'Ði?u chuy?n'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-700 dark:text-slate-200">{tx.materialName}</p>
                                                {tx.orderCode && <span className="text-[10px] font-bold text-emerald-500 uppercase">{tx.orderCode}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-lg text-slate-700 dark:text-slate-200">{tx.quantity}</td>
                                            <td className="px-6 py-4 font-medium">{tx.workshop} {tx.targetWorkshop && <span className="text-slate-400"> {tx.targetWorkshop}</span>}</td>
                                            <td className="px-6 py-4 font-medium text-slate-500">{tx.user}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handlePrintSingle(tx.receiptId)}
                                                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="In phiếu"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    {canManage && (
                                                        <button
                                                            onClick={() => handleDeleteTransaction(tx)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Xóa giao dịch"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
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

            {activeTab === 'activity' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <UserIcon size={16} className="text-slate-400" />
                            <select className="bg-transparent font-bold text-sm outline-none" value={activityFilter.userId} onChange={e => setActivityFilter({ ...activityFilter, userId: e.target.value })}>
                                <option value="ALL">Tất cả người dùng</option>
                                {/* Needs Users list? Pass as prop if needed, or just unique current logs */}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-slate-400" />
                            <select className="bg-transparent font-bold text-sm outline-none" value={activityFilter.entityType} onChange={e => setActivityFilter({ ...activityFilter, entityType: e.target.value })}>
                                <option value="ALL">Tất cả hoạt động</option>
                                <option value="TRANSACTION">Giao dịch</option>
                                <option value="SYSTEM">Hệ thống</option>
                                <option value="USER">Người dùng</option>
                                <option value="MATERIAL">Vật tư</option>
                                <option value="BUDGET">Dự toán</option>
                            </select>
                        </div>
                        {isAdmin && filteredActivityLogs.length > 0 && (
                            <Button onClick={handleClearLogs} variant="danger" className="ml-auto">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa tất cả
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {filteredActivityLogs.map(log => (
                            <div key={log.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${log.entityType === 'TRANSACTION' ? 'bg-emerald-50 text-emerald-600' :
                                    log.entityType === 'SYSTEM' ? 'bg-slate-100 text-slate-600' :
                                        log.entityType === 'USER' ? 'bg-purple-50 text-purple-600' :
                                            log.entityType === 'BUDGET' ? 'bg-orange-50 text-orange-600' :
                                                'bg-green-50 text-green-600'
                                    }`}>
                                    {log.entityType === 'TRANSACTION' ? <ArrowRightLeft size={20} /> :
                                        log.entityType === 'SYSTEM' ? <Clock size={20} /> :
                                            <Activity size={20} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{log.action}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                                    <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase">{log.username}</p>
                                </div>
                                {isAdmin && (
                                    <button onClick={() => handleDeleteLog(log.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))}
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


