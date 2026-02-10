import React from 'react';
import {
    ClipboardList, Search, Plus, Edit2, Trash2, Save, X, ShoppingCart, Check, Download, ExternalLink
} from 'lucide-react';
import { OrderBudget, Material, Transaction, Project, User, WorkshopCode } from '../../types';
import { WORKSHOPS } from '../../constants';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DateInput } from '../../components/ui/DateInput';
import { usePlanningEstimates } from './hooks/usePlanningEstimates';

interface PlanningEstimatesProps {
    budgets: OrderBudget[];
    projects: Project[];
    materials: Material[];
    transactions: Transaction[];
    currentUser: User | null;
    onUpdate: () => void;
}

export const PlanningEstimates: React.FC<PlanningEstimatesProps> = (props) => {
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
        handleImportBudgetExcel,
        getIssuedQuantity,
        filteredBudgets,
        formatNumber
    } = usePlanningEstimates(props);

    const { projects, materials } = props;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Controls */}
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative group flex-1">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Mã/Tên đơn hàng..." className="pl-12" />
                </div>
                <div className="relative group flex-1">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="Tên dự án..." className="pl-12" />
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                        <DateInput value={startDate} onChange={val => setStartDate(val)} placeholder="Từ ngày" className="w-32" />
                        <DateInput value={endDate} onChange={val => setEndDate(val)} placeholder="Đến ngày" className="w-32" />
                    </div>
                    <div className="flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                        <button onClick={() => setWorkshopFilter('ALL')} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${workshopFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Tất cả</button>
                        {WORKSHOPS.map(w => (
                            <button key={w.code} onClick={() => setWorkshopFilter(w.code)} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${workshopFilter === w.code ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{w.code}</button>
                        ))}
                    </div>
                    {canModify && (
                        <Button onClick={() => handleOpenModal()} leftIcon={<Plus size={16} />} className="shadow-lg shadow-blue-500/20">Lập Dự Toán</Button>
                    )}
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-[24px] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Dự án / Đơn hàng</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Xưởng</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Vật tư</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredBudgets.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{b.projectName || 'KHÔNG CÓ DỰ ÁN'}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{b.orderCode}</span>
                                            <span className="text-[9px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{new Date(b.createdAt).toLocaleDateString('en-GB')}</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 italic line-clamp-1">{b.orderName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400">{b.workshop}</span>
                                </td>
                                <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{b.items.length} hạng mục</td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setViewingBudget(b)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"><ExternalLink size={16} /></button>
                                        {canModify && (
                                            <>
                                                <button onClick={() => handleOpenModal(b)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(b.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"><Trash2 size={16} /></button>
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBudget ? "Sửa dự toán" : "Lập dự toán mới"} maxWidth="max-w-[95vw]" contentClassName="overflow-hidden p-4">
                <div className="flex gap-6 h-[80vh]">
                    {/* Column 1: Info (LEFT) */}
                    <div className="w-[320px] flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col gap-5">
                            <h4 className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14} /> Thông tin đơn hàng</h4>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Dự án</label>
                                <Input value={formData.projectName} onChange={e => handleProjectSelect(e.target.value)} placeholder="Gõ tên dự án..." className="h-10 text-sm" list="project-list" />
                                <datalist id="project-list">{projects.map(p => <option key={p.id} value={p.name} />)}</datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase">Ngày lập</label>
                                    <Input type="date" value={formData.createdAt ? new Date(formData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} onChange={e => setFormData({ ...formData, createdAt: new Date(e.target.value).toISOString() })} className="h-10 text-sm" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase">Mã đơn</label>
                                    <Input value={formData.orderCode} onChange={e => setFormData({ ...formData, orderCode: e.target.value.toUpperCase() })} placeholder="DH-..." className="h-10 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Xưởng</label>
                                <select className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold" value={formData.workshop} onChange={e => setFormData({ ...formData, workshop: e.target.value as WorkshopCode, items: [] })}>
                                    {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Tên đơn hàng</label>
                                <Input value={formData.orderName} onChange={e => setFormData({ ...formData, orderName: e.target.value })} placeholder="VD: Cửa nhôm xưởng A..." className="h-10 text-sm" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Ghi chú</label>
                                <textarea className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Thông tin thêm..." rows={3} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 font-bold text-xs">Hủy</Button>
                            <Button onClick={handleSave} className="flex-[2] font-bold text-xs" leftIcon={<Save size={16} />}>Lưu dự toán</Button>
                        </div>
                    </div>

                    {/* Column 2: Selected Items (CENTER) */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl"><ShoppingCart size={18} /></div>
                                <h4 className="font-bold text-slate-800 dark:text-white uppercase text-xs">Vật tư dự toán</h4>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setFormData({ ...formData, items: [] })}
                                    variant="secondary"
                                    className="h-9 text-[10px] font-bold uppercase bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                    leftIcon={<Trash2 size={14} />}
                                >
                                    Xóa hết
                                </Button>
                                <input type="file" ref={budgetFileInputRef} onChange={handleImportBudgetExcel} hidden accept=".xlsx,.xls" />
                                <Button
                                    onClick={() => budgetFileInputRef.current?.click()}
                                    className="h-9 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                    leftIcon={<Download size={14} />}
                                >
                                    Nhập Excel
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {formData.items?.map((it, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase truncate">{it.materialName}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${it.classification === 'Vật tư chính' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {it.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{it.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="number" className="w-24 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 text-center font-extrabold text-blue-600" value={it.estimatedQty} onChange={e => updateItemQty(idx, parseFloat(e.target.value) || 0)} min={0} />
                                        <button onClick={() => removeBudgetItem(idx)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><X size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 3: Material Picker (RIGHT) */}
                    <div className="w-[500px] flex flex-col bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="space-y-3 mb-5">
                            <h4 className="text-[11px] font-extrabold text-blue-600 uppercase flex items-center gap-2"><Search size={14} /> Chọn vật tư</h4>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none shadow-sm" placeholder="Tìm vật tư..." value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} />
                            </div>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                {['ALL', 'Vật tư chính', 'Vật tư phụ'].map(c => (
                                    <button key={c} onClick={() => setSelectedMaterialClass(c as any)} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${selectedMaterialClass === c ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>{c === 'ALL' ? 'Tất cả' : c}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 custom-scrollbar items-start content-start">
                            {materials.filter(m => {
                                const search = materialSearch.toLowerCase();
                                const matchName = m.name.toLowerCase().includes(search);
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
                                        className={`text-left p-3 rounded-xl border shadow-sm transition-all flex flex-col gap-2 relative group active:scale-95 ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-100 hover:border-blue-400'}`}
                                    >
                                        <div className="min-w-0 pr-6">
                                            <p className="font-extrabold text-[12px] uppercase text-slate-800 leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">{m.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8.5px] font-bold text-slate-500 rounded-md uppercase tracking-tighter">{m.workshop}</span>
                                                <span className={`px-1.5 py-0.5 ${m.classification === 'Vật tư chính' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'} text-[8.5px] font-bold rounded-md uppercase tracking-tighter`}>{m.classification === 'Vật tư chính' ? 'Chính' : 'Phụ'}</span>
                                            </div>
                                        </div>

                                        <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
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
                            <div><p className="text-[10px] uppercase font-bold text-slate-400 italic">Trạng thái</p><p className="font-extrabold text-sm text-blue-600">{viewingBudget.status}</p></div>
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
                                    {viewingBudget.items.map((it, idx) => {
                                        const issued = getIssuedQuantity(viewingBudget.orderCode, it.materialId, it.materialName);
                                        const remaining = it.estimatedQty - issued;
                                        return (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50">
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">{it.materialName}</td>
                                                <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{it.unit}</td>
                                                <td className="px-6 py-4 text-center font-extrabold text-blue-600">{formatNumber(it.estimatedQty)}</td>
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
        </div>
    );
};


