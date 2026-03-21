import React from 'react';
import { Search, Plus, Check, LayoutGrid, List } from 'lucide-react';
import { Material } from '@/types';
import { ClassificationFilter, ClassificationType } from '@/components/business';
import { EmptyState } from '@/components/business';
import { Package } from 'lucide-react';

interface ReceiptMaterialSearchProps {
    materialSearch: string;
    setMaterialSearch: (val: string) => void;
    receiptSearchClass: string;
    setReceiptSearchClass: (val: string) => void;
    materials: Material[];
    receiptWorkshop: string;
    selectedItems: any[];
    toggleMaterialSelection: (id: string) => void;
    localFormatNumber: (val: any) => string;
}

export const ReceiptMaterialSearch: React.FC<ReceiptMaterialSearchProps> = ({
    materialSearch,
    setMaterialSearch,
    receiptSearchClass,
    setReceiptSearchClass,
    materials,
    receiptWorkshop,
    selectedItems,
    toggleMaterialSelection,
    localFormatNumber
}) => {
    const [localSearch, setLocalSearch] = React.useState(materialSearch);
    const [debouncedSearch, setDebouncedSearch] = React.useState(materialSearch);
    const [visibleCount, setVisibleCount] = React.useState(50);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(localSearch), 300);
        return () => clearTimeout(timer);
    }, [localSearch]);

    const filteredMaterials = React.useMemo(() => {
        return (Array.isArray(materials) ? materials : []).filter(m => {
            const matchSearch = String(m.name || '').toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchWorkshop = m.workshop === receiptWorkshop;
            const matchClass = receiptSearchClass === 'ALL' || m.classification === receiptSearchClass;
            return matchSearch && matchWorkshop && matchClass;
        });
    }, [materials, debouncedSearch, receiptWorkshop, receiptSearchClass]);

    React.useEffect(() => {
        setVisibleCount(50);
    }, [debouncedSearch, receiptWorkshop, receiptSearchClass]);

    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

    React.useEffect(() => {
        if (selectedItems.length > 9) {
            setViewMode('list');
        }
    }, [selectedItems.length]);

    return (
        <div className="col-span-12 xl:col-span-8 bg-slate-50 dark:bg-slate-800/20 rounded-[20px] p-6 flex flex-col overflow-hidden border border-slate-200/60 dark:border-slate-700/50 shadow-inner">
            <div className="grid grid-cols-1 gap-4 mb-4 shrink-0">
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Gõ tên vật tư để tìm kiếm..."
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl data-label text-slate-800 dark:text-slate-200 outline-none shadow-sm focus:ring-2 focus:ring-sky-500/20 transition-all uppercase"
                        value={localSearch}
                        onChange={e => setLocalSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <ClassificationFilter
                    value={receiptSearchClass as ClassificationType}
                    onChange={setReceiptSearchClass}
                    styleType="outline"
                />
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Dạng lưới"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Dạng danh sách"
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                {filteredMaterials.length === 0 ? (
                    <EmptyState
                        icon={<Package size={48} />}
                        title="Không tìm thấy vật tư phù hợp"
                    />
                ) : (
                    <div className="flex flex-col gap-4 pb-4">
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                            {filteredMaterials.slice(0, visibleCount).map(m => {
                                const isInCart = selectedItems.some(it => it.materialId === m.id);
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => toggleMaterialSelection(m.id)}
                                        className={`group relative text-left bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-sm active:scale-95 flex ${viewMode === 'grid' ? 'flex-col justify-between p-4 h-full gap-3' : 'flex-row items-center p-3 gap-4'} ${isInCart ? 'border-sky-500 ring-4 ring-sky-500/10 bg-sky-50/20 dark:bg-sky-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-lg'}`}
                                    >
                                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                                            <h5 className={`font-bold text-sm text-foreground uppercase leading-tight group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors ${viewMode === 'list' ? 'truncate' : 'line-clamp-2'}`}>{m.name}</h5>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 data-label text-slate-500 dark:text-slate-400 rounded-md tracking-tighter">{m.workshop}</span>
                                                <span className={`px-2 py-0.5 ${m.classification === 'Vật tư chính' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400'} data-label rounded-md`}>{m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 data-label text-slate-400 rounded-md tracking-tighter">{m.unit}</span>
                                            </div>
                                        </div>
                                        <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mt-auto pt-3 border-t border-slate-50 dark:border-slate-800' : 'pl-4 border-l border-slate-50 dark:border-slate-800 gap-6'}`}>
                                            <div className={viewMode === 'list' ? 'text-right' : ''}>
                                                <p className="data-label text-slate-400 dark:text-slate-500 mb-0.5">Tồn kho</p>
                                                <p className="text-sm font-bold text-foreground tabular-nums">{localFormatNumber(m.quantity)}</p>
                                            </div>
                                            <div className={`px-3 h-8 rounded-xl flex items-center justify-center transition-all data-label ${isInCart ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                                                {isInCart ? <><Check size={14} className="mr-1" /> CHỌN</> : <><Plus size={14} className="mr-1" /> THÊM</>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {filteredMaterials.length > visibleCount && (
                            <button 
                                onClick={() => setVisibleCount(prev => prev + 50)}
                                className="w-full py-3 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-sky-600 font-bold text-xs uppercase rounded-xl transition-colors"
                            >
                                <span className="data-label">Tải thêm <span className="text-sky-400 opacity-60">({filteredMaterials.length - visibleCount} vật tư)</span></span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
