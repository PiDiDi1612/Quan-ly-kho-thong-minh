import React from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { TransactionType, WorkshopCode } from '@/types';
import { WORKSHOPS } from '@/constants';

interface ReceiptFormProps {
    receiptType: TransactionType;
    setReceiptType: (type: TransactionType) => void;
    receiptWorkshop: WorkshopCode;
    setReceiptWorkshop: (ws: WorkshopCode) => void;
    receiptId: string;
    setReceiptId: (id: string) => void;
    receiptTimeDisplay: string;
    setReceiptTimeDisplay: (val: string) => void;
    handleDateChange: (val: string) => void;
    receiptSupplier: string;
    setReceiptSupplier: (val: string) => void;
    orderCode: string;
    setOrderCode: (val: string) => void;
    safeSuppliers: any[];
    activeOrders: any[];
    modalError: string | null;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
    receiptType, setReceiptType,
    receiptWorkshop, setReceiptWorkshop,
    receiptId, setReceiptId,
    receiptTimeDisplay, setReceiptTimeDisplay, handleDateChange,
    receiptSupplier, setReceiptSupplier,
    orderCode, setOrderCode,
    safeSuppliers, activeOrders,
    modalError
}) => {
    return (
        <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase flex items-center gap-2 mb-2">
                <FileText size={16} className="text-sky-600" /> Thông tin phiếu
            </h3>

            {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} />
                    <p className="text-xs font-medium">{modalError}</p>
                </div>
            )}

            <div className="flex p-1 bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-12">
                <button onClick={() => setReceiptType(TransactionType.IN)} className={`flex-1 py-1 rounded-lg font-black text-xs uppercase transition-all ${receiptType === 'IN' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>Nhập kho</button>
                <button onClick={() => setReceiptType(TransactionType.OUT)} className={`flex-1 py-1 rounded-lg font-black text-xs uppercase transition-all ${receiptType === 'OUT' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>Xuất kho</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Xưởng thực hiện</label>
                    <select className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all" value={receiptWorkshop} onChange={e => setReceiptWorkshop(e.target.value as any)}>
                        {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mã phiếu</label>
                        <input type="text" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all" value={receiptId} onChange={e => setReceiptId(e.target.value.toUpperCase())} placeholder="(Tự động)" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Ngày tạo</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm"
                                placeholder="dd/mm/yyyy"
                                value={receiptTimeDisplay}
                                onChange={e => {
                                    const val = e.target.value;
                                    setReceiptTimeDisplay(val);
                                    handleDateChange(val);
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Nhà cung cấp</label>
                    <select className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all" value={receiptSupplier} onChange={e => setReceiptSupplier(e.target.value)}>
                        <option value="">-- Chọn NCC (Tùy chọn) --</option>
                        {safeSuppliers.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Dự toán / Đơn hàng</label>
                    {activeOrders.length > 0 ? (
                        <select className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all" value={orderCode} onChange={e => setOrderCode(e.target.value)}>
                            <option value="">-- Chọn đơn hàng (Tùy chọn) --</option>
                            {activeOrders.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                        </select>
                    ) : (
                        <input
                            type="text"
                            placeholder="Mã đơn hàng / Dự toán (Tùy chọn)"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-sm text-slate-500 dark:text-slate-400 outline-none shadow-sm cursor-not-allowed"
                            value={orderCode}
                            readOnly
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
