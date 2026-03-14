import React from 'react';
import {
    ClipboardList, Search, Plus, Edit2, Trash2, Save, X, ShoppingCart, Check, Download, ExternalLink, Warehouse, Package, Settings, Layers, Calendar, Users
} from 'lucide-react';
import { OrderBudget, Material, Transaction, Project, User, WorkshopCode } from '../../types';
import { WORKSHOPS } from '../../constants';
import { Modal } from '../../components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '../../components/ui/date-input';
import { ExcelMappingModal, ExcelField } from '../../components/ui/excel-mapping-modal';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { usePlanningEstimates } from './hooks/usePlanningEstimates';

interface PlanningEstimatesProps {
    budgets: OrderBudget[];
    projects: Project[];
    materials: Material[];
    transactions: Transaction[];
    currentUser: User | null;
    onUpdate: () => void;
    canManage?: boolean;
}

export const PlanningEstimates: React.FC<PlanningEstimatesProps> = (props) => {
    const hookProps = { ...props };
    const {
        searchTerm, setSearchTerm,
        projectSearch, setProjectSearch,
        workshopFilter, setWorkshopFilter,
        statusFilter, setStatusFilter,
        startDate, setStartDate,
        endDate, setEndDate,
        isModalOpen, setIsModalOpen,
        editingBudget,
        viewingBudget, setViewingBudget,
        formData, setFormData,
        materialSearch, setMaterialSearch,
        selectedMaterialClass, setSelectedMaterialClass,
        budgetFileInputRef,
        canModify,
        handleOpenModal,
        handleSave,
        handleDelete,
        addBudgetItem,
        updateItemQty,
        removeBudgetItem,
        handleProjectSelect,
        handleWorkshopChange,
        handleImportBudgetExcel,
        importData, setImportData,
        isImportModalOpen, setIsImportModalOpen,
        handleProcessImport,
        getIssuedQuantity,
        filteredBudgets,
        formatNumber
    } = usePlanningEstimates(hookProps);

    const [confirmState, setConfirmState] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    const requestDelete = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa dự toán',
            message: 'Bạn có chắc chắn muốn xóa dự toán này? Hành động này không thể hoàn tác.',
            onConfirm: () => {
                handleDelete(id);
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            },
            type: 'danger'
        });
    };

    const ESTIMATE_FIELDS: ExcelField[] = [
        { key: 'materialName', label: 'Tên vật tư (*)', required: true, autoMatchPatterns: ['tên vt', 'vật tư', 'material name'] },
        { key: 'estimatedQty', label: 'Số lượng (*)', required: true, autoMatchPatterns: ['số lượng', 'sl', 'qty', 'dự toán'] }
    ];

    const projects = Array.isArray(props.projects) ? props.projects : [];
    const materials = Array.isArray(props.materials) ? props.materials : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Controls - Compact Design */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-1 min-w-[300px] gap-2">
                    <div className="relative group flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-sky-500 transition-colors" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="MÃ/TÊN ĐƠN HÀNG..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl font-black text-[10px] text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-sm"
                        />
                    </div>
                    <div className="relative group flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            value={projectSearch}
                            onChange={e => setProjectSearch(e.target.value)}
                            placeholder="TÊN DỰ ÁN..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl font-black text-[10px] text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl h-10 border border-slate-200 dark:border-slate-700 shadow-inner">
                    <div className="flex items-center px-2 gap-2 border-r border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Từ</span>
                        <DateInput value={startDate} onChange={val => setStartDate(val)} className="w-24 border-none bg-transparent h-auto p-0 text-[11px] font-bold text-sky-600" />
                    </div>
                    <div className="flex items-center px-2 gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Đến</span>
                        <DateInput value={endDate} onChange={val => setEndDate(val)} className="w-24 border-none bg-transparent h-auto p-0 text-[11px] font-bold text-sky-600" />
                    </div>
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-1 p-1 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"><X size={14} /></button>
                    )}
                </div>

                <div className="flex p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl h-10">
                    <button onClick={() => setWorkshopFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${workshopFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tất cả</button>
                    {WORKSHOPS.map(w => (
                        <button key={w.code} onClick={() => setWorkshopFilter(w.code)} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${workshopFilter === w.code ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{w.code}</button>
                    ))}
                </div>

                {canModify && (
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={() => handleOpenModal()}
                            className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} className="stroke-[3]" />
                            Lập Dự Toán
                        </button>
                    </div>
                )}
            </div>

            {/* Table View */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-[24px] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><ClipboardList size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Dự án / Đơn hàng</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center"><Calendar size={12} className="inline mr-1 text-emerald-500 -mt-0.5" />Ngày tạo</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center"><Warehouse size={12} className="inline mr-1 text-amber-500 -mt-0.5" />Xưởng</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center"><Layers size={12} className="inline mr-1 text-indigo-500 -mt-0.5" />Vật tư</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center"><Users size={12} className="inline mr-1 text-slate-400 -mt-0.5" />Người lập</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right"><Settings size={12} className="inline mr-1 -mt-0.5" />Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {Array.isArray(filteredBudgets) && filteredBudgets.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">{b.projectName || 'KHÔNG CÓ DỰ ÁN'}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{b.orderCode}</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 italic line-clamp-1">{b.orderName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-xs font-bold text-slate-500">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400">{b.workshop}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-xs font-bold text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-2 py-1 rounded-lg">{b.items.length} hạng mục</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{b.createdByName || 'Admin'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setViewingBudget(b)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-xl transition-all"><ExternalLink size={16} /></button>
                                        {canModify && (
                                            <>
                                                <button onClick={() => handleOpenModal(b)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => requestDelete(b.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Estimation Modal (Full-page type) */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBudget ? "Sửa dự toán" : "Lập dự toán mới"} maxWidth="max-w-[98vw]" contentClassName="overflow-hidden p-4">
                <div className="flex gap-6 h-[85vh]">
                    {/* Column 1: Info (LEFT) */}
                    <div className="w-[450px] flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
                        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col gap-5 shadow-sm">
                            <h4 className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest flex items-center gap-2 px-1"><ClipboardList size={14} /> Thông tin đơn hàng</h4>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Tên Dự án</label>
                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-sm text-slate-400 uppercase border border-slate-100 dark:border-slate-700 cursor-not-allowed">
                                    {formData.projectName || '---'}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mã Dự án <span className="text-red-500 font-bold">*</span></label>
                                <select
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                    value={formData.projectCode || ''}
                                    onChange={e => handleProjectSelect(e.target.value)}
                                >
                                    <option value="">-- CHỌN MÃ DỰ ÁN --</option>
                                    {projects.map(p => <option key={p.id} value={p.code}>{p.code}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Ngày lập</label>
                                    <DateInput
                                        value={formData.createdAt ? new Date(formData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                        onChange={val => setFormData({ ...formData, createdAt: new Date(val).toISOString() })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-sky-600 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                    />
                                </div>
                                <div className="w-[160px] space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Mã đơn</label>
                                    <input
                                        type="text"
                                        value={formData.orderCode || ''}
                                        onChange={e => setFormData({ ...formData, orderCode: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-sky-600 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                        placeholder="DH-..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Xưởng</label>
                                <select
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-700 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                    value={formData.workshop}
                                    onChange={e => handleWorkshopChange(e.target.value as WorkshopCode)}
                                >
                                    {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên đơn hàng <span className="text-red-500 font-bold">*</span></label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={formData.projectCode && formData.orderName?.startsWith(`${formData.projectCode}-`)
                                            ? formData.orderName.substring(formData.projectCode.length + 1)
                                            : (formData.orderName || '')}
                                        onChange={e => setFormData({ ...formData, orderName: formData.projectCode ? `${formData.projectCode}-${e.target.value}` : e.target.value })}
                                        placeholder="NHẬP TÊN ĐƠN HÀNG..."
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                        style={formData.projectCode ? { paddingLeft: `${formData.projectCode.length * 9 + 25}px` } : {}}
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-600 font-black text-sm pointer-events-none uppercase z-10 transition-all">
                                        {formData.projectCode ? `${formData.projectCode}-` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Ghi chú</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all resize-none min-h-[80px]"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="THÔNG TIN THÊM..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all">Hủy</button>
                            <button onClick={handleSave} className="flex-[2] px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                                <Save size={16} /> Lưu dự toán
                            </button>
                        </div>
                    </div>

                    {/* Column 2: Selected Items (CENTER) */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-xl"><ShoppingCart size={18} /></div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-wider">Vật tư dự toán</h4>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFormData({ ...formData, items: [] })}
                                    className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    Xóa hết
                                </button>
                                <input type="file" ref={budgetFileInputRef} onChange={handleImportBudgetExcel} hidden accept=".xlsx,.xls" />
                                <button
                                    onClick={() => budgetFileInputRef.current?.click()}
                                    className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Download size={14} />
                                    Nhập Excel
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {formData.items?.map((it, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase truncate">{it.materialName}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${it.classification === 'Vật tư chính' ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-500'}`}>
                                                    {it.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{it.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            className="w-24 h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-sky-600 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm"
                                            value={it.estimatedQty}
                                            onChange={e => updateItemQty(idx, parseFloat(e.target.value) || 0)}
                                            min={0}
                                        />
                                        <button onClick={() => removeBudgetItem(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><X size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 3: Material Picker (RIGHT) */}
                    <div className="w-[600px] flex flex-col bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="space-y-4 mb-5">
                            <h4 className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase flex items-center gap-2 px-1"><Search size={14} /> Chọn vật tư</h4>
                            <div className="relative">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                    placeholder="TÌM VẬT TƯ..."
                                    value={materialSearch}
                                    onChange={e => setMaterialSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                                {['ALL', 'Vật tư chính', 'Vật tư phụ'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedMaterialClass(c as any)}
                                        className={`flex-1 py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${selectedMaterialClass === c ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                    >
                                        {c === 'ALL' ? 'Tất cả' : c.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 custom-scrollbar items-start content-start">
                            {materials.filter(m => {
                                const search = String(materialSearch || '').toLowerCase();
                                const matchName = String(m.name || '').toLowerCase().includes(search);
                                const matchWorkshop = m.workshop === formData.workshop;
                                const matchClass = selectedMaterialClass === 'ALL' || m.classification === selectedMaterialClass;
                                return matchName && matchWorkshop && matchClass;
                            }).map(m => {
                                const isSelected = formData.items?.some(it => it.materialId === m.id);
                                return (
                                    <button
                                        key={m.id}
                                        disabled={isSelected}
                                        onClick={() => addBudgetItem(m)}
                                        className={`text-left p-3 rounded-xl border shadow-sm transition-all flex flex-col gap-2 relative group active:scale-95 ${isSelected ? 'bg-sky-50 border-sky-300' : 'bg-white border-slate-100 hover:border-sky-400'}`}
                                    >
                                        <div className="min-w-0 pr-6">
                                            <p className="font-extrabold text-[12px] uppercase text-slate-800 leading-tight group-hover:text-sky-700 transition-colors line-clamp-2">{m.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8.5px] font-bold text-slate-500 rounded-md uppercase tracking-tighter">{m.workshop}</span>
                                                <span className={`px-1.5 py-0.5 ${m.classification === 'Vật tư chính' ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-500'} text-[8.5px] font-bold rounded-md uppercase tracking-tighter`}>{m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}</span>
                                            </div>
                                        </div>

                                        <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-sky-600 text-white shadow-sm' : 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white'}`}>
                                            {isSelected ? <Check size={12} /> : <Plus size={12} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* View Modal */}
            {viewingBudget && (
                <Modal isOpen={!!viewingBudget} onClose={() => setViewingBudget(null)} title={`Chi tiết dự toán: ${viewingBudget.orderCode}`} maxWidth="max-w-4xl">
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 italic">Dự án</p><p className="font-extrabold text-sm text-slate-800 dark:text-white uppercase">{viewingBudget.projectName}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 italic">Xưởng</p><p className="font-extrabold text-sm text-slate-800 dark:text-white">{viewingBudget.workshop}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 italic">Ngày lập</p><p className="font-extrabold text-sm text-slate-800 dark:text-white">{new Date(viewingBudget.createdAt).toLocaleDateString('en-GB')}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 italic">Trạng thái</p><p className="font-extrabold text-sm text-sky-600">{viewingBudget.status}</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Tên vật tư</th>
                                        <th className="px-6 py-4 text-center">ĐVT</th>
                                        <th className="px-6 py-4 text-center">Dự toán</th>
                                        <th className="px-6 py-4 text-center">Đã xuất</th>
                                        <th className="px-6 py-4 text-right">Còn lại</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(viewingBudget.items) && viewingBudget.items.map((it, idx) => {
                                        const issued = getIssuedQuantity(viewingBudget.orderCode, it.materialId, it.materialName);
                                        const remaining = it.estimatedQty - issued;
                                        return (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50">
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">{it.materialName}</td>
                                                <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{it.unit}</td>
                                                <td className="px-6 py-4 text-center font-extrabold text-sky-600">{formatNumber(it.estimatedQty)}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-600">{formatNumber(issued)}</td>
                                                <td className={`px-6 py-4 text-right font-black ${remaining < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>{formatNumber(remaining)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Modal>
            )}
            {importData && (
                <ExcelMappingModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    fields={ESTIMATE_FIELDS}
                    excelHeaders={importData.headers}
                    excelData={importData.data}
                    onImport={handleProcessImport}
                    title="Nhập vật tư dự toán"
                />
            )}

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
            />
        </div>
    );
};



