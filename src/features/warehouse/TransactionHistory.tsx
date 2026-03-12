import React from 'react';
import { Transaction, User } from '@/types';
import { transactionService } from '@/domain';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/business';
import { useTransactionHistory } from './hooks/useTransactionHistory';
import { TransactionFilters } from './components/history/TransactionFilters';
import { TransactionTable } from './components/history/TransactionTable';
import { TransactionDetailModal } from './components/history/TransactionDetailModal';

interface TransactionHistoryProps {
    transactions: Transaction[];
    materials: any[];
    currentUser: User | null;
    onRefresh: () => void;
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ materials, currentUser, onRefresh }) => {
    const { state, actions } = useTransactionHistory(currentUser, onRefresh);
    const toast = useToast();

    const getMaterialInfo = (materialId: string) => {
        const material = materials.find(m => m.id === materialId);
        return material || { name: 'N/A', unit: 'N/A' };
    };

    const handleUpdateQuantity = async (id: string, qty: number) => {
        if (qty <= 0) {
            toast.error('Số lượng phải > 0');
            return;
        }
        try {
            await transactionService.updateTransactionQuantity(id, qty);
            toast.success('Đã cập nhật số lượng');
            actions.setEditingRowId(null);
            actions.loadReceipts();
            onRefresh();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteTransactionItem = (transaction: any) => {
        actions.setConfirmState({
            isOpen: true,
            title: 'Xóa vật tư',
            message: 'Xóa vật tư khỏi phiếu này?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await transactionService.deleteTransaction(transaction.id, currentUser?.id || 'SYSTEM');
                    toast.success('Đã xóa vật tư thành công');
                    actions.setIsViewModalOpen(false);
                    actions.setViewingReceipt(null);
                    actions.loadReceipts();
                    onRefresh();
                    actions.setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    toast.error(error.message);
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <TransactionFilters
                searchTerm={state.searchTerm} setSearchTerm={actions.setSearchTerm}
                typeFilter={state.typeFilter} setTypeFilter={actions.setTypeFilter}
                dateRange={state.dateRange} setDateRange={actions.setDateRange}
                handleExportHistory={actions.handleExportHistory}
                selectedReceiptIds={state.selectedReceiptIds} setSelectedReceiptIds={actions.setSelectedReceiptIds}
                handleBatchPrint={actions.handleBatchPrint}
            />

            <TransactionTable
                receiptData={state.receiptData} isLoadingTx={state.isLoadingTx}
                selectedReceiptIds={state.selectedReceiptIds} setSelectedReceiptIds={actions.setSelectedReceiptIds}
                toggleSelectReceipt={actions.toggleSelectReceipt}
                setViewingReceipt={actions.setViewingReceipt} setIsViewModalOpen={actions.setIsViewModalOpen}
                canManage={state.canManage} handleDeleteReceipt={actions.handleDeleteReceipt}
                formatNumber={formatNumber}
                materials={materials}
                txPage={state.txPage} txLimit={state.txLimit} txTotal={state.txTotal} txTotalPages={state.txTotalPages}
                setTxPage={actions.setTxPage} setTxLimit={actions.setTxLimit}
            />

            <TransactionDetailModal
                isViewModalOpen={state.isViewModalOpen} setIsViewModalOpen={actions.setIsViewModalOpen}
                viewingReceipt={state.viewingReceipt} setViewingReceipt={actions.setViewingReceipt}
                canManage={state.canManage}
                editingRowId={state.editingRowId} setEditingRowId={actions.setEditingRowId}
                editingQuantity={state.editingQuantity} setEditingQuantity={actions.setEditingQuantity}
                materials={materials} formatNumber={formatNumber}
                handleUpdateQuantity={handleUpdateQuantity}
                handleDeleteTransaction={handleDeleteTransactionItem}
            />

            <ConfirmDialog
                dialog={state.confirmState}
                onClose={() => actions.setConfirmState(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Hidden Printable Area for Batch Print */}
            <div className="hidden print:block space-y-20 p-4">
                {state.receiptData.filter(r => state.selectedReceiptIds.includes(r.receiptId)).map((r) => (
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
        </div>
    );
};