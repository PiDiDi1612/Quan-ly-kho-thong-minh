import React from 'react';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { Material } from '@/types';

interface ReceiptCartProps {
    selectedItems: { materialId: string; quantity: number | string }[];
    materials: Material[];
    handleQuantityChange: (id: string, val: string) => void;
    removeSelectedItem: (id: string) => void;
    handleCreateReceipt: () => void;
    totalSelectedQuantity: number;
}

export const ReceiptCart: React.FC<ReceiptCartProps> = ({
    selectedItems,
    materials,
    handleQuantityChange,
    removeSelectedItem,
    handleCreateReceipt,
    totalSelectedQuantity
}) => {
    return (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-1">
            <h4 className="font-black text-sm text-slate-800 dark:text-white mb-3">VẬT TƯ CHỌN ({selectedItems.length})</h4>
            {selectedItems.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                    <Package size={32} className="text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-400 text-center">Chưa có vật tư nào</p>
                    <p className="text-xs font-medium text-slate-400 text-center mt-1">Tìm và chọn ở danh sách bên dưới</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {selectedItems.map((item, idx) => {
                        const m = materials.find(x => x.id === item.materialId);
                        if (!m) return null;
                        return (
                            <div key={idx} className="flex items-center gap-4 p-3 border-b border-slate-50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase truncate" title={m.name}>{m.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${m.classification === 'Vật tư chính' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400'}`}>
                                                {m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{m.unit}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-inner h-11">
                                        <button onClick={() => {
                                            const qty = Number(item.quantity) || 0;
                                            if (qty > 1) handleQuantityChange(m.id, String(qty - 1));
                                        }} className="w-8 h-full flex justify-center items-center text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all" disabled={!item.quantity || Number(item.quantity) <= 1}><Minus size={14} /></button>
                                        <input
                                            type="text"
                                            className="w-12 h-full bg-transparent text-center font-black text-slate-800 dark:text-white outline-none"
                                            value={item.quantity}
                                            onChange={e => handleQuantityChange(m.id, e.target.value)}
                                        />
                                        <button onClick={() => {
                                            const qty = Number(item.quantity) || 0;
                                            handleQuantityChange(m.id, String(qty + 1));
                                        }} className="w-8 h-full flex justify-center items-center text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => removeSelectedItem(m.id)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="mt-8">
                <button
                    onClick={handleCreateReceipt}
                    disabled={selectedItems.length === 0}
                    className="w-full h-14 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-500 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-sky-600/20 disabled:shadow-none flex items-center justify-between px-6"
                >
                    <span>LẬP PHIẾU NGAY</span>
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-xs tabular-nums">{totalSelectedQuantity} Món</span>
                </button>
            </div>
        </div>
    );
};
