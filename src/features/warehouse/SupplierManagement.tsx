import React from 'react';
import { Plus, FileSpreadsheet, Download, Settings, Search, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/business';
import { useSupplierManagement } from './hooks/useSupplierManagement';
import { SupplierTable } from './components/supplier/SupplierTable';
import { SupplierFormModal } from './components/supplier/SupplierFormModal';
import { SupplierMergeModal } from './components/supplier/SupplierMergeModal';

interface SupplierManagementProps {
    onUpdate: () => void;
    canManage?: boolean;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = ({ onUpdate, canManage }) => {
    const { state, actions } = useSupplierManagement(onUpdate);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Action Bar & Search */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-start md:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <div className="relative w-full md:w-96 flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input
                        type="text"
                        value={state.searchTerm}
                        onChange={e => actions.setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm theo mã, tên NCC, mô tả..."
                        className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all placeholder:text-slate-400"
                    />
                    {state.searchTerm && (
                        <button
                            onClick={() => actions.setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 p-1 rounded-full shadow-sm"
                        >
                            <X size={14} className="stroke-[3]" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                    <button className="h-11 px-5 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:border-emerald-200 dark:hover:text-emerald-400 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95 group bg-white dark:bg-slate-900 shadow-sm" onClick={actions.handleExportExcel}>
                        <Download size={16} className="text-emerald-500 group-hover:scale-110 transition-transform stroke-[3]" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                    </button>
                    {canManage && (
                        <>
                            <button className="h-11 px-5 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:border-sky-200 dark:hover:text-sky-400 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95 group bg-white dark:bg-slate-900 shadow-sm" onClick={actions.handleImportExcel}>
                                <FileSpreadsheet size={16} className="text-sky-500 group-hover:scale-110 transition-transform stroke-[3]" />
                                <span className="hidden sm:inline">Nhập Excel</span>
                            </button>
                            <button
                                className="h-11 px-5 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-purple-600 hover:border-purple-200 dark:hover:text-purple-400 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95 group bg-white dark:bg-slate-900 shadow-sm"
                                onClick={actions.handleOpenMergeModal}
                            >
                                <Settings size={16} className="text-purple-500 group-hover:rotate-90 transition-transform stroke-[3]" />
                                <span className="hidden sm:inline">Hợp nhất</span>
                            </button>
                            <button className="h-11 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center gap-2 ml-1" onClick={() => actions.handleOpenModal()}>
                                <Plus size={18} className="stroke-[3]" />
                                Thêm Mới
                            </button>
                        </>
                    )}
                </div>
            </div>

            <SupplierTable
                filteredSuppliers={state.filteredSuppliers}
                suppliers={state.suppliers}
                selectedSuppliers={state.selectedSuppliers}
                setSelectedSuppliers={actions.setSelectedSuppliers}
                toggleSelectSupplier={actions.toggleSelectSupplier}
                handleOpenModal={actions.handleOpenModal}
                handleDelete={actions.handleDelete}
            />

            <SupplierFormModal
                isOpen={state.isModalOpen}
                onClose={() => actions.setIsModalOpen(false)}
                formData={state.formData}
                setFormData={actions.setFormData}
                editingSupplier={state.editingSupplier}
                handleSave={actions.handleSave}
            />

            <SupplierMergeModal
                isOpen={state.isMergeModalOpen}
                onClose={() => actions.setIsMergeModalOpen(false)}
                suppliers={state.suppliers}
                selectedSuppliers={state.selectedSuppliers}
                mergeFormData={state.mergeFormData}
                setMergeFormData={actions.setMergeFormData}
                handleMergeSuppliers={actions.handleMergeSuppliers}
            />

            <ConfirmDialog
                dialog={state.confirmState}
                onClose={() => actions.setConfirmState(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};
