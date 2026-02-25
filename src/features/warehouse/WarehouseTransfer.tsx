import React, { useState } from 'react';
import {
    ArrowRightLeft,
    X,
    AlertCircle,
    ShoppingCart,
    Minus,
    Plus,
    Trash2,
    Search,
    Check,
    Inbox
} from 'lucide-react';
import { Material, WorkshopCode, TransactionType } from '@/types';
import { WORKSHOPS } from '@/constants';

interface WarehouseTransferProps {
    materials: Material[];
    transferForm: any;
    setTransferForm: (form: any) => void;
    modalError: string | null;
    handleTransfer: () => void;
    formatNumber: (num: any) => string;
    parseNumber: (val: any) => number;
    receiptSearchClass: string;
    setReceiptSearchClass: (c: any) => void;
}

export const WarehouseTransfer: React.FC<WarehouseTransferProps> = ({
    materials,
    transferForm,
    setTransferForm,
    modalError,
    handleTransfer,
    formatNumber,
    parseNumber,
    receiptSearchClass,
    setReceiptSearchClass
}) => {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e293b] rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in duration-300">
            <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
                {/* CỘT TRÁI (4): THÔNG TIN ĐIỀU CHUYỂN & HÀNG CHỜ */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 overflow-hidden">
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase flex items-center gap-2 mb-2">
                            <ArrowRightLeft size={16} className="text-sky-600" /> Thông tin điều chuyển
                        </h3>

                        {modalError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} />
                                <p className="text-xs font-medium">{modalError}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Kho nguồn</label>
                                <select
                                    className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500 transition-all shadow-sm"
                                    value={transferForm.fromWorkshop}
                                    onChange={e => setTransferForm({ ...transferForm, fromWorkshop: e.target.value as any, items: [] })}
                                >
                                    {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Kho đích</label>
                                <select
                                    className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500 transition-all shadow-sm"
                                    value={transferForm.toWorkshop}
                                    onChange={e => setTransferForm({ ...transferForm, toWorkshop: e.target.value as any })}
                                >
                                    {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Mã đơn hàng</label>
                                <input type="text" className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500 transition-all shadow-sm" placeholder="VD: MDH001" value={transferForm.orderCode} onChange={e => setTransferForm({ ...transferForm, orderCode: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Mã phiếu</label>
                                <input type="text" className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500 transition-all shadow-sm" placeholder="Tự động" value={transferForm.receiptId} onChange={e => setTransferForm({ ...transferForm, receiptId: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-sm">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-sky-100/50 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400"><ShoppingCart size={16} /></div>
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Danh mục điều chuyển</h4>
                            </div>
                            <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full text-[10px] font-bold">{(Array.isArray(transferForm.items) ? transferForm.items : []).length} Item</span>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 p-3">
                            {Array.isArray(transferForm.items) && transferForm.items.length > 0 ? (
                                transferForm.items.map((item: any, idx: number) => {
                                    const mList = Array.isArray(materials) ? materials : [];
                                    const mat = mList.find(m => m.id === item.materialId);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-sky-200 dark:hover:border-sky-700 transition-all">
                                            <div className="min-w-0 flex-1 mr-3">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase line-clamp-1 group-hover:text-sky-700 dark:group-hover:text-sky-400">{mat?.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Tồn: {mat?.quantity} {mat?.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-1 border border-slate-200/50 dark:border-slate-700">
                                                    <button onClick={() => {
                                                        const newItems = [...transferForm.items];
                                                        const current = parseNumber(newItems[idx].quantity);
                                                        newItems[idx].quantity = Math.max(0, current - 1);
                                                        setTransferForm({ ...transferForm, items: newItems });
                                                    }} className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors w-6 h-6 flex items-center justify-center"><Minus size={12} /></button>
                                                    <input type="text" className="w-16 bg-transparent text-center text-sm font-bold text-slate-800 dark:text-white outline-none" value={item.quantity || ''} onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                                        const newItems = [...transferForm.items];
                                                        newItems[idx].quantity = val;
                                                        setTransferForm({ ...transferForm, items: newItems });
                                                    }} />
                                                    <button onClick={() => {
                                                        const newItems = [...transferForm.items];
                                                        const current = parseNumber(newItems[idx].quantity);
                                                        newItems[idx].quantity = current + 1;
                                                        setTransferForm({ ...transferForm, items: newItems });
                                                    }} className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors w-6 h-6 flex items-center justify-center"><Plus size={12} /></button>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const items = Array.isArray(transferForm.items) ? transferForm.items : [];
                                                        setTransferForm({ ...transferForm, items: items.filter((_: any, i: number) => i !== idx) });
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3 opacity-60">
                                    <ArrowRightLeft size={48} className="stroke-1" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-center px-8">Chọn vật tư từ danh sách bên phải để thêm vào phiếu</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleTransfer}
                        disabled={transferForm.items.length === 0}
                        className="btn-gradient-primary w-full py-4 text-white rounded-xl font-extrabold hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Check size={18} /> Xác nhận điều chuyển
                    </button>
                </div>

                {/* CỘT PHẢI (8): TÌM KIẾM & CHỌN VẬT TƯ (GRID VIEW) */}
                <div className="col-span-12 xl:col-span-8 bg-slate-50 dark:bg-slate-800/30 rounded-[20px] p-6 flex flex-col overflow-hidden border border-slate-200/60 dark:border-slate-700/50 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 shrink-0">
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Tìm vật tư kho nguồn..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-800 dark:text-slate-200 outline-none shadow-sm focus:border-sky-500 transition-all" value={transferForm.search} onChange={e => setTransferForm({ ...transferForm, search: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar">
                            <button onClick={() => setReceiptSearchClass('ALL')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${receiptSearchClass === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Tất cả</button>
                            <button onClick={() => setReceiptSearchClass('Vật tư chính')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${receiptSearchClass === 'Vật tư chính' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Chính</button>
                            <button onClick={() => setReceiptSearchClass('Vật tư phụ')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${receiptSearchClass === 'Vật tư phụ' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Phụ</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(Array.isArray(materials) ? materials : []).filter(m => {
                                const search = String(transferForm.search || '').toLowerCase();
                                const matchSearch = String(m.name || '').toLowerCase().includes(search);
                                const matchClass = receiptSearchClass === 'ALL' || m.classification === receiptSearchClass;
                                const matchWorkshop = m.workshop === transferForm.fromWorkshop;
                                return matchSearch && matchWorkshop && matchClass;
                            }).map(m => {
                                const safeItems = Array.isArray(transferForm.items) ? transferForm.items : [];
                                const isInCart = safeItems.some((it: any) => it.materialId === m.id);
                                return (
                                    <button key={m.id} onClick={() => {
                                        const items = Array.isArray(transferForm.items) ? transferForm.items : [];
                                        const isInCart = items.some((it: any) => it.materialId === m.id);
                                        if (isInCart) {
                                            setTransferForm({ ...transferForm, items: items.filter((it: any) => it.materialId !== m.id) });
                                        } else {
                                            setTransferForm({ ...transferForm, items: [...items, { materialId: m.id, quantity: 1 }] });
                                        }
                                    }} className={`group relative p-3.5 text-left bg-white dark:bg-[#1e293b] border rounded-xl transition-all shadow-sm active:scale-[0.98] flex flex-col justify-between gap-3 h-full ${Array.isArray(transferForm.items) && transferForm.items.some((it: any) => it.materialId === m.id) ? 'border-sky-500 ring-1 ring-sky-500 bg-sky-50/10 dark:bg-sky-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 hover:shadow-md'}`}>
                                        <div className="min-w-0 w-full">
                                            <h5 className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase line-clamp-2 leading-tight mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400">{m.name}</h5>
                                            <span className={`px-1.5 py-0.5 ${m.classification === 'Vật tư chính' ? 'bg-sky-100/50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' : 'bg-orange-100/50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'} text-[10px] font-bold rounded uppercase inline-block`}>{m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}</span>
                                        </div>
                                        <div className="flex items-end justify-between mt-auto pt-2 border-t border-slate-50 dark:border-slate-700 w-full">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Tồn kho</p>
                                                <p className="text-base font-bold text-slate-800 dark:text-white">{formatNumber(m.quantity)} <span className="text-[10px] text-slate-400 font-medium uppercase font-bold">{m.unit}</span></p>
                                            </div>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isInCart ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-sky-600 group-hover:text-white'}`}>
                                                {isInCart ? <Check size={14} /> : <Plus size={14} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {(Array.isArray(materials) ? materials : []).filter(m => m.workshop === transferForm.fromWorkshop).length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-4 py-20 opacity-60">
                                <Inbox size={48} className="stroke-1" />
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">Xưởng nguồn chưa có vật tư nào</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

