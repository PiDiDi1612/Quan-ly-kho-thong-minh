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
import { Material, TransactionType, OrderBudget } from '@/types';
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
    budgets: OrderBudget[];
    modalError: string | null;
    suppliers: any[];
    handleCreateReceipt: () => void;
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
    modalError,
    suppliers,
    budgets,
    handleCreateReceipt
}) => {
    const [materialSearch, setMaterialSearch] = React.useState('');
    const [receiptSearchClass, setReceiptSearchClass] = React.useState<'ALL' | 'Vật tư chính' | 'Vật tư phụ'>('ALL');

    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

    const localFormatNumber = (val: any): string => {
        if (val === null || val === undefined) return '0';
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.'));
        return isNaN(num) ? '0' : num.toLocaleString('vi-VN');
    };

    const localParseNumber = (val: any): number => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const clean = String(val).replace(/,/g, '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const activeOrders = (Array.isArray(budgets) ? budgets : []).filter(b =>
        b.status === 'Đang thực hiện' &&
        (b.workshop === receiptWorkshop)
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e293b] rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in duration-300">
            <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
                {/* CỘT TRÁI (4): THÔNG TIN PHIẾU & HÀNG CHỜ */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 overflow-hidden">
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
                                    <input type="text" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all" value={receiptId} onChange={e => setReceiptId(e.target.value.toUpperCase())} />
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

                            <div className="grid grid-cols-1 gap-3 pt-1">
                                {receiptType === TransactionType.IN && (
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mã NCC</label>
                                            <input
                                                type="text"
                                                list="supplier-codes"
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                                placeholder="Mã NCC..."
                                                value={orderCode}
                                                onChange={e => {
                                                    const inputCode = e.target.value.toUpperCase();
                                                    setOrderCode(inputCode);
                                                    const matchedSupplier = safeSuppliers.find(s => s.code === inputCode);
                                                    if (matchedSupplier) {
                                                        setReceiptSupplier(matchedSupplier.name);
                                                    }
                                                }}
                                            />
                                            <datalist id="supplier-codes">
                                                {safeSuppliers.map(s => (
                                                    <option key={s.id} value={s.code}>{s.name}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên nhà cung cấp</label>
                                            <input
                                                type="text"
                                                list="supplier-names"
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                                placeholder="Chọn nhà cung cấp..."
                                                value={receiptSupplier}
                                                onChange={e => {
                                                    const inputName = e.target.value;
                                                    setReceiptSupplier(inputName);
                                                    const matchedSupplier = safeSuppliers.find(s => s.name === inputName);
                                                    if (matchedSupplier) {
                                                        setOrderCode(matchedSupplier.code);
                                                    }
                                                }}
                                            />
                                            <datalist id="supplier-names">
                                                {safeSuppliers.map(s => (
                                                    <option key={s.id} value={s.name}>{s.code}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>
                                )}
                                {receiptType === TransactionType.OUT && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên đơn hàng</label>
                                        <input
                                            type="text"
                                            list="active-order-codes"
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
                                            placeholder="Chọn đơn hàng..."
                                            value={(Array.isArray(budgets) ? budgets : []).find(b => b.orderCode === orderCode)?.orderName || orderCode}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const matched = activeOrders.find(b => b.orderName === val);
                                                if (matched) {
                                                    setOrderCode(matched.orderCode);
                                                } else {
                                                    setOrderCode(val);
                                                }
                                            }}
                                        />
                                        <datalist id="active-order-codes">
                                            {activeOrders.map(b => (
                                                <option key={b.id} value={b.orderName}>{b.orderCode} ({b.projectName})</option>
                                            ))}
                                        </datalist>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-sm">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-sky-100/50 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400"><ShoppingCart size={16} /></div>
                                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Hàng chờ</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full text-[10px] font-black">{selectedItems.length} Item</span>
                                <button onClick={() => setSelectedItems([])} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase transition-colors">Xóa hết</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                            {selectedItems.length > 0 ? (
                                selectedItems.map((it, idx) => {
                                    const m = (Array.isArray(materials) ? materials : []).find(mat => mat.id === it.materialId);
                                    const currentInWorkshop = (Array.isArray(materials) ? materials : []).find(mat => mat.name === m?.name && mat.workshop === receiptWorkshop);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-sky-200 dark:hover:border-sky-700 transition-all">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="font-black text-sm uppercase truncate text-slate-700 dark:text-slate-200 leading-tight group-hover:text-sky-700 transition-colors uppercase">{m?.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Tồn {receiptWorkshop}: <span className="text-slate-600 dark:text-slate-400">{localFormatNumber(currentInWorkshop?.quantity || 0)}</span></p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-1 border border-slate-200/50 dark:border-slate-700">
                                                    <button onClick={() => setSelectedItems(selectedItems.map((x, i) => i === idx ? { ...x, quantity: Math.max(0.01, localParseNumber(x.quantity) - 1) } : x))} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500"><Minus size={12} /></button>
                                                    <input type="text" className="w-16 bg-transparent text-center text-sm font-black outline-none text-slate-800 dark:text-white" value={it.quantity} onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                                        const parts = val.split(/[.,]/);
                                                        if (parts.length <= 2) {
                                                            setSelectedItems(selectedItems.map((x, i) => i === idx ? { ...x, quantity: val } : x));
                                                        }
                                                    }} />
                                                    <button onClick={() => setSelectedItems(selectedItems.map((x, i) => i === idx ? { ...x, quantity: localParseNumber(x.quantity) + 1 } : x))} className="w-6 h-6 flex items-center justify-center text-sky-500 hover:text-sky-700"><Plus size={12} /></button>
                                                </div>
                                                <button onClick={() => setSelectedItems((Array.isArray(selectedItems) ? selectedItems : []).filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"> <Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3 opacity-60">
                                    <ShoppingCart size={48} className="stroke-1" />
                                    <p className="text-[10px] font-black uppercase tracking-wider text-center px-8 leading-relaxed">Chưa có vật tư nào<br />trong hàng chờ</p>
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
                            <input type="text" placeholder="Gõ tên vật tư để tìm kiếm..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none shadow-sm focus:ring-2 focus:ring-sky-500/20 transition-all uppercase" value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <button onClick={() => setReceiptSearchClass('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${receiptSearchClass === 'ALL' ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}>Tất cả Loại</button>
                        <button onClick={() => setReceiptSearchClass('Vật tư chính')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${receiptSearchClass === 'Vật tư chính' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}>Chính</button>
                        <button onClick={() => setReceiptSearchClass('Vật tư phụ')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${receiptSearchClass === 'Vật tư phụ' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}>Phụ</button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                            {(Array.isArray(materials) ? materials : []).filter(m => {
                                const matchSearch = String(m.name || '').toLowerCase().includes(String(materialSearch || '').toLowerCase());
                                const matchWorkshop = m.workshop === receiptWorkshop;
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
                                    }} className={`group relative p-4 text-left bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-sm active:scale-95 flex flex-col justify-between gap-3 h-full ${isInCart ? 'border-sky-500 ring-4 ring-sky-500/10 bg-sky-50/20 dark:bg-sky-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-lg'}`}>
                                        <div className="min-w-0">
                                            <h5 className="font-black text-[12px] text-slate-800 dark:text-white uppercase line-clamp-2 leading-tight mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">{m.name}</h5>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[8px] font-black text-slate-500 dark:text-slate-400 rounded-md uppercase tracking-tighter">{m.workshop}</span>
                                                <span className={`px-2 py-0.5 ${m.classification === 'Vật tư chính' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'} text-[8px] font-black rounded-md uppercase`}>{m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[8px] font-black text-slate-400 uppercase rounded-md tracking-tighter">{m.unit}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 dark:border-slate-800">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight mb-0.5">Số lượng tồn</p>
                                                <p className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{localFormatNumber(m.quantity)}</p>
                                            </div>
                                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${isInCart ? 'bg-sky-600 text-white shadow-lg' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-lg group-hover:scale-110'}`}>
                                                {isInCart ? <Check size={18} /> : <Plus size={18} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {materials.filter(m => m.workshop === receiptWorkshop).length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600 gap-4 opacity-40">
                                <Package size={64} className="stroke-1" />
                                <p className="text-sm font-black uppercase tracking-widest text-center px-12">Xưởng này chưa có vật tư nào<br />vui lòng thêm vật tư mới trước</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button
                            onClick={() => {
                                if (selectedItems.length === 0) return;
                                if (window.confirm('Bạn có chắc chắn muốn in phiếu tạm này không?')) {
                                    window.print();
                                }
                            }}
                            disabled={selectedItems.length === 0}
                            className="px-8 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 shadow-sm hover:shadow-md hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-30 transition-all"
                        >
                            <Printer size={18} /> In phiếu tạm
                        </button>
                        <button
                            onClick={handleCreateReceipt}
                            disabled={selectedItems.length === 0}
                            className={`px-12 py-3.5 rounded-2xl font-black shadow-xl flex items-center gap-3 uppercase text-[11px] tracking-widest active:scale-95 transition-all disabled:opacity-30 ${receiptType === 'IN'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-500/30 text-white'
                                : 'bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-500/40 text-white'
                                } hover:translate-y-[-2px] hover:shadow-2xl`}
                        >
                            {receiptType === 'IN' ? 'Hoàn tất nhập kho' : 'Hoàn tất xuất kho'} <Check size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
