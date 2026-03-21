import React from 'react';
import { Eye, Trash2, Clock, Hash, Layers, Users, RefreshCcw, History as HistoryIcon } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { formatDateStr } from '@/utils/dateUtils';

interface TransactionTableProps {
    receiptData: any[];
    isLoadingTx: boolean;
    selectedReceiptIds: string[];
    setSelectedReceiptIds: (ids: string[]) => void;
    toggleSelectReceipt: (id: string) => void;
    setViewingReceipt: (receipt: any) => void;
    setIsViewModalOpen: (open: boolean) => void;
    canManage: boolean;
    handleDeleteReceipt: (receipt: any) => void;
    formatNumber: (num: number) => string;
    materials: any[];
    txPage: number;
    txLimit: number;
    txTotal: number;
    txTotalPages: number;
    setTxPage: (page: number) => void;
    setTxLimit: (limit: number) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
    receiptData, isLoadingTx, selectedReceiptIds, setSelectedReceiptIds, toggleSelectReceipt,
    setViewingReceipt, setIsViewModalOpen, canManage, handleDeleteReceipt, formatNumber, materials,
    txPage, txLimit, txTotal, txTotalPages, setTxPage, setTxLimit
}) => {
    const getMaterialInfo = (materialId: string) => {
        const material = materials.find(m => m.id === materialId);
        return material || { name: materialId, unit: 'N/A' };
    };
    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
            <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center table-header-text">
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
                            <th className="px-6 py-4 table-header-text"><Clock size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Thời gian</th>
                            <th className="px-6 py-4 table-header-text"><Hash size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Mã phiếu</th>
                            <th className="px-6 py-4 table-header-text"><Layers size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Loại</th>
                            <th className="px-6 py-4 table-header-text"><Users size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Thực hiện</th>
                            <th className="px-6 py-4 text-center table-header-text">Vật tư</th>
                            <th className="px-6 py-4 text-right table-header-text">Tổng SL</th>
                            <th className="px-6 py-4 text-center table-header-text">Trạng thái</th>
                            <th className="px-6 py-4 text-right table-header-text">Thao tác</th>
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
                                        <HistoryIcon className="h-10 w-10 text-slate-200 mb-2" />
                                        <p className="text-slate-400 font-medium">Chưa có giao dịch nào</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            receiptData.map((receipt) => {
                                const firstTx = receipt.transactions[0];
                                const firstMat = firstTx ? getMaterialInfo(firstTx.materialId) : null;
                                const otherCount = receipt.transactions.length - 1;

                                return (
                                <tr 
                                    key={receipt.receiptId} 
                                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                                    onClick={() => { setViewingReceipt(receipt); setIsViewModalOpen(true); }}
                                >
                                    <td className="px-4 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 focus:ring-sky-500 cursor-pointer"
                                            checked={selectedReceiptIds.includes(receipt.receiptId)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleSelectReceipt(receipt.receiptId);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{formatDateStr(receipt.date)}</div>
                                        <div className="text-[10px] text-slate-400 font-mono italic">{receipt.transactions[0]?.transactionTime || ''}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="data-label text-sky-600 dark:text-sky-400 px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded-lg border border-sky-100 dark:border-sky-800/50">
                                            {receipt.receiptId}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg data-label ${receipt.type === 'IN'
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                            }`}>
                                            {receipt.type === 'IN' ? 'Nhập' : 'Xuất'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 tracking-tight uppercase">
                                        {receipt.user}
                                    </td>
                                    <td className="px-6 py-4">
                                        {firstMat ? (
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[200px] mx-auto">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={firstMat.name}>
                                                    {firstMat.name}
                                                </span>
                                                {otherCount > 0 && (
                                                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-900/30 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                                        +{otherCount} khác
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                {receipt.transactions.length} VT
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-black text-sm tabular-nums ${receipt.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {receipt.type === 'IN' ? '+' : '-'}{formatNumber(receipt.totalQuantity)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg data-label ${
                                            receipt.transactions[0]?.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                            receipt.transactions[0]?.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}>
                                            {receipt.transactions[0]?.status === 'pending' ? 'Chờ duyệt' :
                                             receipt.transactions[0]?.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    setViewingReceipt(receipt); 
                                                    setIsViewModalOpen(true); 
                                                }}
                                                className="p-2 text-slate-400 hover:text-sky-600 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-sky-50 transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {canManage && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteReceipt(receipt);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-rose-50 transition-colors"
                                                    title="Hủy phiếu"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700">
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
    );
};
