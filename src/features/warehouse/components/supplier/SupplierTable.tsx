import React from 'react';
import { Supplier } from '@/types';
import { Edit2, Trash2, Hash, Building2, FileText, Calendar, Settings } from 'lucide-react';
import { EmptyState } from '@/components/business';
import { FileSpreadsheet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SupplierTableProps {
    filteredSuppliers: Supplier[];
    suppliers: Supplier[];
    selectedSuppliers: string[];
    setSelectedSuppliers: (ids: string[]) => void;
    toggleSelectSupplier: (id: string) => void;
    handleOpenModal: (supplier: Supplier) => void;
    handleDelete: (id: string) => void;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
    filteredSuppliers,
    suppliers,
    selectedSuppliers,
    setSelectedSuppliers,
    toggleSelectSupplier,
    handleOpenModal,
    handleDelete
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                            <th className="px-6 py-5 w-12">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500/20 cursor-pointer transition-all"
                                    checked={selectedSuppliers.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedSuppliers(suppliers.map(s => s.id));
                                        else setSelectedSuppliers([]);
                                    }}
                                />
                            </th>
                            <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><Hash size={12} className="inline mr-1 text-sky-500 -mt-0.5 stroke-[3]" />Mã NCC</th>
                            <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><Building2 size={12} className="inline mr-1 text-indigo-500 -mt-0.5 stroke-[3]" />Tên NCC</th>
                            <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><FileText size={12} className="inline mr-1 text-sky-500 -mt-0.5 stroke-[3]" />Mô tả</th>
                            <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><Calendar size={12} className="inline mr-1 text-emerald-500 -mt-0.5 stroke-[3]" />Ngày tạo</th>
                            <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right"><Settings size={12} className="inline mr-1 -mt-0.5 stroke-[3]" />Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {filteredSuppliers.map((supplier) => (
                            <tr
                                key={supplier.id}
                                onClick={() => toggleSelectSupplier(supplier.id)}
                                className={`group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${selectedSuppliers.includes(supplier.id) ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}
                            >
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500/20 cursor-pointer transition-all pointer-events-none"
                                        checked={selectedSuppliers.includes(supplier.id)}
                                        readOnly
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest text-[11px] px-2.5 py-1 bg-sky-50 dark:bg-sky-900/20 rounded-xl">{supplier.code}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight text-sm">{supplier.name}</span>
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">{supplier.description || '-'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-slate-400 text-[11px] font-black tracking-widest bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl">{new Date(supplier.createdAt).toLocaleDateString('en-GB')}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                                                        className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Chỉnh sửa</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }}
                                                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Xóa</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {suppliers.length === 0 && (
                <EmptyState
                    icon={<FileSpreadsheet size={32} className="opacity-50" />}
                    title="Chưa có NCC nào"
                    description='Nhấn "Thêm Mới" hoặc "Nhập Excel" để bắt đầu'
                />
            )}
        </div>
    );
};
