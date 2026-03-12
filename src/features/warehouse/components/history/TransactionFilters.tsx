import React from 'react';
import { Search, Download, Printer, X } from 'lucide-react';
import { TransactionType } from '@/types';
import { Button } from '@/components/ui/button';

interface TransactionFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    typeFilter: TransactionType | 'ALL';
    setTypeFilter: (type: TransactionType | 'ALL') => void;
    dateRange: { from: string; to: string } | undefined;
    setDateRange: (range: { from: string; to: string } | undefined) => void;
    handleExportHistory: () => void;
    selectedReceiptIds: string[];
    setSelectedReceiptIds: (ids: string[]) => void;
    handleBatchPrint: () => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
    searchTerm, setSearchTerm, typeFilter, setTypeFilter, dateRange, setDateRange, handleExportHistory,
    selectedReceiptIds, setSelectedReceiptIds, handleBatchPrint
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center relative">
            <div className="flex gap-4 items-center w-full md:w-auto">
                <div className="relative group flex-1 md:w-96">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="TÌM THEO MÃ VT, NGƯỜI DÙNG, KHÁCH..."
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto ml-auto">
                <div className="flex items-center border border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1E293B] rounded-xl h-11 shadow-sm px-3">
                    <input 
                        type="date" 
                        value={dateRange?.from || ''} 
                        onChange={(e) => setDateRange({ from: e.target.value, to: dateRange?.to || '' })}
                        className="text-xs bg-transparent outline-none text-slate-600 dark:text-slate-300 font-bold"
                    />
                    <span className="text-slate-400 mx-2 text-xs">tới</span>
                    <input 
                        type="date" 
                        value={dateRange?.to || ''} 
                        onChange={(e) => setDateRange({ from: dateRange?.from || '', to: e.target.value })}
                        className="text-xs bg-transparent outline-none text-slate-600 dark:text-slate-300 font-bold"
                    />
                    {(dateRange?.from || dateRange?.to) && (
                        <button onClick={() => setDateRange(undefined)} className="ml-2 text-slate-400 hover:text-rose-500 transition-colors">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex p-1 bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-white/5 rounded-xl h-11 shadow-sm">
                    <button onClick={() => setTypeFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'ALL' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tất cả</button>
                    <button onClick={() => setTypeFilter('IN')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'IN' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Nhập</button>
                    <button onClick={() => setTypeFilter('OUT')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${typeFilter === 'OUT' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Xuất</button>
                </div>

                <Button variant="outline" onClick={handleExportHistory} className="h-11 rounded-xl font-bold gap-2 bg-white dark:bg-slate-800 border-slate-200">
                    <Download size={16} className="text-emerald-600" /> Xuất Excel
                </Button>
            </div>

            {/* Batch Action Bar */}
            {selectedReceiptIds.length > 0 && (
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white dark:bg-sky-600 rounded-xl flex items-center gap-6 px-5 py-2 animate-in zoom-in-95 duration-300 z-10 shadow-xl border border-slate-200 dark:border-sky-500">
                    <div className="flex items-center gap-3 text-slate-800 dark:text-white border-r border-slate-200 dark:border-white/20 pr-5">
                        <div className="w-7 h-7 bg-sky-100 dark:bg-white/20 text-sky-600 dark:text-white rounded-lg flex items-center justify-center font-black text-xs">{selectedReceiptIds.length}</div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Đã chọn</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedReceiptIds([])} className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors">Hủy</button>
                        <Button onClick={handleBatchPrint} className="bg-sky-600 dark:bg-white text-white dark:text-sky-600 hover:bg-sky-700 dark:hover:bg-sky-50 px-4 h-8 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg shadow-sm">
                            <Printer size={14} /> In {selectedReceiptIds.length} phiếu
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
