import React from 'react';
import { Minus, Plus, Trash2, Package, Printer } from 'lucide-react';
import { Material } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReceiptCartProps {
    receiptType: string;
    selectedItems: { materialId: string; quantity: number | string }[];
    materials: Material[];
    handleQuantityChange: (id: string, val: string) => void;
    removeSelectedItem: (id: string) => void;
    handleCreateReceipt: () => void;
    onPrintDraft?: () => void;
    totalSelectedQuantity: number;
}

export const ReceiptCart: React.FC<ReceiptCartProps> = ({
    receiptType,
    selectedItems,
    materials,
    handleQuantityChange,
    removeSelectedItem,
    handleCreateReceipt,
    onPrintDraft,
    totalSelectedQuantity
}) => {
    return (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-1">
            <h4 className="section-title mb-3">VẬT TƯ CHỌN <span className="text-sky-500">({selectedItems.length})</span></h4>
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
                            <React.Fragment key={idx}>
                            <div className="flex items-center gap-4 p-3 border-b border-slate-50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase truncate" title={m.name}>{m.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-1.5 py-0.5 rounded-md data-label ${m.classification === 'Vật tư chính' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400'}`}>
                                                {m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}
                                            </span>
                                            <span className="data-label text-slate-400">{m.unit}</span>
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
                                            className={`w-12 h-full bg-transparent text-center font-bold outline-none transition-colors ${receiptType === 'OUT' && Number(item.quantity) > (Number(m.quantity) || 0) ? 'text-rose-500' : 'text-foreground'}`}
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
                            {receiptType === 'OUT' && Number(item.quantity) > (Number(m.quantity) || 0) && (
                                <p className="data-label text-rose-500 ml-1 -mt-1">Vượt quá tồn kho (còn {m.quantity} {m.unit})</p>
                            )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
            <div className="mt-8 flex gap-3">
                {onPrintDraft && (
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onPrintDraft}
                                    disabled={selectedItems.length === 0}
                                    className="h-14 px-5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:disabled:bg-slate-800 text-slate-600 disabled:text-slate-300 dark:text-slate-300 dark:disabled:text-slate-600 rounded-2xl shadow-sm flex items-center justify-center transition-all"
                                >
                                    <Printer size={20} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>In phiếu tạm</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0} className="block flex-1">
                                <button
                                    onClick={handleCreateReceipt}
                                    disabled={selectedItems.length === 0}
                                    className={`w-full h-14 ${receiptType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'} disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-500 rounded-2xl shadow-lg disabled:shadow-none flex items-center justify-between px-6 pointer-events-auto transition-all`}
                                >
                                    <span className="section-title text-white">{receiptType === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}</span>
                                    <span className="bg-white/20 px-3 py-1 rounded-lg data-label text-white tabular-nums">{totalSelectedQuantity} Món</span>
                                </button>
                            </span>
                        </TooltipTrigger>
                        {selectedItems.length === 0 && (
                            <TooltipContent>Chưa có vật tư nào được chọn</TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};
