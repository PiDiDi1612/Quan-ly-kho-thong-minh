import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Check, X, Edit2, Trash2, Printer } from 'lucide-react';

interface TransactionDetailModalProps {
    isViewModalOpen: boolean;
    setIsViewModalOpen: (open: boolean) => void;
    viewingReceipt: any;
    setViewingReceipt: (receipt: any) => void;
    canManage: boolean;
    editingRowId: string | null;
    setEditingRowId: (id: string | null) => void;
    editingQuantity: number;
    setEditingQuantity: (qty: number) => void;
    materials: any[];
    formatNumber: (num: number) => string;
    handleUpdateQuantity: (id: string, qty: number) => Promise<void>;
    handleDeleteTransaction: (transaction: any) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
    isViewModalOpen, setIsViewModalOpen, viewingReceipt, setViewingReceipt, canManage,
    editingRowId, setEditingRowId, editingQuantity, setEditingQuantity, materials,
    formatNumber, handleUpdateQuantity, handleDeleteTransaction
}) => {
    if (!viewingReceipt) return null;

    const getMaterialInfo = (materialId: string) => {
        const material = materials.find(m => m.id === materialId);
        return material || { name: 'N/A', unit: 'N/A' };
    };

    return (
        <Modal
            isOpen={isViewModalOpen}
            onClose={() => { setIsViewModalOpen(false); setViewingReceipt(null); }}
            title={`CHI TIẾT PHIẾU: ${viewingReceipt.receiptId}`}
            maxWidth="max-w-4xl"
        >
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
                                                    <button onClick={() => handleUpdateQuantity(t.id, editingQuantity)} className="p-1 text-green-600 hover:bg-green-50 rounded">
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
                                                            onClick={() => handleDeleteTransaction(t)}
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
        </Modal>
    );
};
