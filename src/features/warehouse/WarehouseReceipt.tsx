import React from 'react';
import {
    FileText,
    AlertCircle,
    ShoppingCart,
    Minus,
    Plus,
    Trash2,
    Search,
    Check,
    Calendar,
    Printer,
    Package
} from 'lucide-react';
import { Material, TransactionType } from '@/types';
import { WORKSHOPS } from '@/constants';

interface WarehouseReceiptProps {
    receiptType: TransactionType;
    setReceiptType: (type: TransactionType) => void;
    receiptWorkshop: string;
    setReceiptWorkshop: (w: any) => void;
    receiptId: string;
    setReceiptId: (id: string) => void;
    receiptTimeDisplay: string;
    setReceiptTimeDisplay: (t: string) => void;
    receiptTime: string;
    setReceiptTime: (t: string) => void;
    orderCode: string;
    setOrderCode: (c: string) => void;
    receiptSupplier: string;
    setReceiptSupplier: (s: string) => void;
    selectedItems: any[];
    setSelectedItems: (items: any[]) => void;
    materials: Material[];
    receiptSearchWorkshop: string;
    setReceiptSearchWorkshop: (w: string) => void;
    receiptSearchClass: string;
    setReceiptSearchClass: (c: string) => void;
    materialSearch: string;
    setMaterialSearch: (s: string) => void;
    modalError: string | null;
    suppliers: any[]; // Danh sách NCC
    handleCreateReceipt: () => void;
    requestConfirm: (title: string, msg: string, onConfirm: () => void, type?: any) => void;
    formatNumber: (n: any) => string;
    parseNumber: (n: any) => number;
}

export const WarehouseReceipt: React.FC<WarehouseReceiptProps> = ({
    receiptType,
    setReceiptType,
    receiptWorkshop,
    setReceiptWorkshop,
    receiptId,
    setReceiptId,
    receiptTimeDisplay,
    setReceiptTimeDisplay,
    receiptTime,
    setReceiptTime,
    orderCode,
    setOrderCode,
    receiptSupplier,
    setReceiptSupplier,
    selectedItems,
    setSelectedItems,
    materials,
    receiptSearchWorkshop,
    setReceiptSearchWorkshop,
    receiptSearchClass,
    setReceiptSearchClass,
    materialSearch,
    setMaterialSearch,
    modalError,
    suppliers,
    handleCreateReceipt,
    requestConfirm,
    formatNumber,
    parseNumber
}) => {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e293b] rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in duration-300">
            <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
                {/* CỘT TRÁI (4): THÔNG TIN PHIẾU & HÀNG CHỜ */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 overflow-hidden">
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase flex items-center gap-2 mb-2">
                            <FileText size={16} className="text-blue-600" /> Thông tin phiếu
                        </h3>

                        {modalError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} />
                                <p className="text-xs font-medium">{modalError}</p>
                            </div>
                        )}

                        <div className="flex p-1 bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setReceiptType(TransactionType.IN)} className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${receiptType === 'IN' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>Nhập kho</button>
                            <button onClick={() => setReceiptType(TransactionType.OUT)} className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${receiptType === 'OUT' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>Xuất kho</button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Xưởng thực hiện</label>
                                <select className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 shadow-sm transition-all" value={receiptWorkshop} onChange={e => setReceiptWorkshop(e.target.value as any)}>
                                    {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Mã phiếu</label>
                                    <input type="text" className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:border-blue-500 shadow-sm transition-all" value={receiptId} onChange={e => setReceiptId(e.target.value.toUpperCase())} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Ngày tạo phiếu</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 shadow-sm"
                                            placeholder="dd/mm/yyyy"
                                            value={receiptTimeDisplay}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setReceiptTimeDisplay(val);
                                                const parts = val.split('/');
                                                if (parts.length === 3) {
                                                    const [d, m, y] = parts;
                                                    if (y.length === 4 && m.length <= 2 && d.length <= 2) {
                                                        setReceiptTime(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
                                                    }
                                                }
                                            }}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setReceiptTime(val);
                                                        if (val) {
                                                            const [y, m, d] = val.split('-');
                                                            setReceiptTimeDisplay(`${d}/${m}/${y}`);
                                                        }
                                                    }}
                                                />
                                                <div className="pointer-events-none text-slate-400">
                                                    <Calendar size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {receiptType === TransactionType.IN && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Mã NCC</label>
                                            <input
                                                type="text"
                                                list="supplier-codes"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:border-blue-500 shadow-sm transition-all"
                                                placeholder="Gõ hoặc chọn mã NCC"
                                                value={orderCode}
                                                onChange={e => {
                                                    const inputCode = e.target.value.toUpperCase();
                                                    setOrderCode(inputCode);
                                                    // Tự động điền tên NCC khi tìm thấy mã khớp
                                                    const matchedSupplier = suppliers.find(s => s.code === inputCode);
                                                    if (matchedSupplier) {
                                                        setReceiptSupplier(matchedSupplier.name);
                                                    }
                                                }}
                                            />
                                            <datalist id="supplier-codes">
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.code}>{s.name}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Tên NCC</label>
                                            <input
                                                type="text"
                                                list="supplier-names"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 shadow-sm transition-all"
                                                placeholder="Gõ hoặc chọn tên NCC"
                                                value={receiptSupplier}
                                                onChange={e => {
                                                    const inputName = e.target.value;
                                                    setReceiptSupplier(inputName);
                                                    // Tự động điền mã NCC khi tìm thấy tên khớp
                                                    const matchedSupplier = suppliers.find(s => s.name === inputName);
                                                    if (matchedSupplier) {
                                                        setOrderCode(matchedSupplier.code);
                                                    }
                                                }}
                                            />
                                            <datalist id="supplier-names">
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.name}>{s.code}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                    </>
                                )}
                                {receiptType === TransactionType.OUT && (
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Mã đơn hàng</label>
                                        <input type="text" className="w-full px-3 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:border-blue-500 shadow-sm" placeholder="DH..." value={orderCode} onChange={e => setOrderCode(e.target.value.toUpperCase())} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-sm">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><ShoppingCart size={16} /></div>
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Hàng chờ</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">{selectedItems.length} Item</span>
                                <button onClick={() => setSelectedItems([])} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase hover:underline">Xóa hết</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                            {selectedItems.length > 0 ? (
                                selectedItems.map((it, idx) => {
                                    const m = materials.find(mat => mat.id === it.materialId);
                                    const currentInWorkshop = materials.find(mat => mat.name === m?.name && mat.workshop === receiptWorkshop);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-blue-200 dark:hover:border-blue-700 transition-all">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="font-bold text-sm uppercase truncate text-slate-700 dark:text-slate-200 leading-tight group-hover:text-blue-700 transition-colors">{m?.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Tồn {receiptWorkshop}: <span className="text-slate-600 dark:text-slate-400">{formatNumber(currentInWorkshop?.quantity || 0)}</span></p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-1 border border-slate-200/50 dark:border-slate-700">
                                                    <button onClick={() => setSelectedItems(selectedItems.map((x, i) => i === idx ? { ...x, quantity: Math.max(0.01, parseNumber(x.quantity) - 1) } : x))} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500"><Minus size={12} /></button>
                                                    <input type="text" className="w-16 bg-transparent text-center text-sm font-bold outline-none text-slate-800 dark:text-white" value={it.quantity} onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                                        const parts = val.split(/[.,]/);
                                                        if (parts.length <= 2) {
                                                            setSelectedItems(selectedItems.map((x, i) => i === idx ? { ...x, quantity: val } : x));
                                                        }
                                                    }} />
                                                    <button onClick={() => setSelectedItems(selectedItems.map((x, i) => i === idx ? { ...x, quantity: parseNumber(x.quantity) + 1 } : x))} className="w-6 h-6 flex items-center justify-center text-blue-500 hover:text-blue-700"><Plus size={12} /></button>
                                                </div>
                                                <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3 opacity-60">
                                    <ShoppingCart size={48} className="stroke-1" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-center px-8">Chưa có vật tư nào trong phiếu</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: TÌM VẬT TƯ NGUỒN (WIDER) */}
                <div className="col-span-12 xl:col-span-8 bg-slate-50 dark:bg-slate-800/20 rounded-[20px] p-6 flex flex-col overflow-hidden border border-slate-200/60 dark:border-slate-700/50 shadow-inner">
                    <div className="grid grid-cols-1 gap-4 mb-4 shrink-0">
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Gõ tên vật tư để tìm kiếm..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-800 dark:text-slate-200 outline-none shadow-sm focus:border-blue-500 transition-all" value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <button onClick={() => setReceiptSearchClass('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all border ${receiptSearchClass === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-[#0f172a] text-slate-400 border-slate-200 dark:border-slate-700'}`}>Tất cả Loại</button>
                        <button onClick={() => setReceiptSearchClass('Vật tư chính')} className={`px-6 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all border ${receiptSearchClass === 'Vật tư chính' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#0f172a] text-slate-400 border-slate-200 dark:border-slate-700'}`}>Chính</button>
                        <button onClick={() => setReceiptSearchClass('Vật tư phụ')} className={`px-6 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all border ${receiptSearchClass === 'Vật tư phụ' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-[#0f172a] text-slate-400 border-slate-200 dark:border-slate-700'}`}>Phụ</button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {materials.filter(m => {
                                const matchSearch = m.name.toLowerCase().includes(materialSearch.toLowerCase());
                                const matchWorkshop = m.workshop === receiptWorkshop; // Auto-filter by selected receiptWorkshop
                                const matchClass = receiptSearchClass === 'ALL' || m.classification === receiptSearchClass;
                                return matchSearch && matchWorkshop && matchClass;
                            }).map(m => {
                                const isInCart = selectedItems.some(it => it.materialId === m.id);
                                return (
                                    <button key={m.id} onClick={() => {
                                        if (isInCart) {
                                            setSelectedItems(selectedItems.filter(it => it.materialId !== m.id));
                                        } else {
                                            setSelectedItems([...selectedItems, { materialId: m.id, quantity: 1 }]);
                                        }
                                    }} className={`group relative p-4 text-left bg-white dark:bg-[#1e293b] border rounded-2xl transition-all shadow-sm active:scale-95 flex flex-col justify-between gap-3 h-full ${isInCart ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50/10 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:shadow-md'}`}>
                                        <div className="min-w-0">
                                            <h5 className="font-extrabold text-[12px] text-slate-800 dark:text-white uppercase line-clamp-2 leading-tight mb-2 group-hover:text-blue-700">{m.name}</h5>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8px] font-extrabold text-slate-500 dark:text-slate-300 rounded-md uppercase">{m.workshop}</span>
                                                <span className={`px-2 py-0.5 ${m.classification === 'Vật tư chính' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'} text-[8px] font-extrabold rounded-md uppercase`}>{m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8px] font-extrabold text-slate-400 uppercase rounded-md">{m.unit}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50 dark:border-slate-700">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Số lượng tồn</p>
                                                <p className="text-sm font-extrabold text-slate-800 dark:text-white">{formatNumber(m.quantity)}</p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isInCart ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                                {isInCart ? <Check size={16} /> : <Plus size={16} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {materials.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600 gap-4">
                                <Package size={64} className="opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 italic">Không tìm thấy vật tư phù hợp</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-200/50">
                        <button
                            onClick={() => requestConfirm(
                                'Xác nhận in',
                                'Bạn có chắc chắn muốn in phiếu tạm này không?',
                                () => {
                                    window.print();
                                },
                                'info'
                            )}
                            disabled={selectedItems.length === 0}
                            className="px-6 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded-xl font-extrabold uppercase text-[10px] flex items-center gap-2 shadow-sm hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >
                            <Printer size={16} /> In phiếu tạm
                        </button>
                        <button
                            onClick={handleCreateReceipt}
                            disabled={selectedItems.length === 0}
                            className={`px-10 py-3.5 rounded-xl font-extrabold shadow-lg flex items-center gap-2 uppercase text-[11px] tracking-widest active:scale-[0.98] transition-all disabled:opacity-30 ${receiptType === 'IN'
                                ? 'bg-gradient-to-br from-green-600 via-green-600 to-emerald-600 shadow-green-500/30 text-white'
                                : 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 shadow-blue-500/30 text-white'
                                } hover:shadow-[0_0_25px_rgba(0,0,0,0.15)] hover:translate-y-[-2px]`}
                        >
                            Xác nhận hoàn tất <Check size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
