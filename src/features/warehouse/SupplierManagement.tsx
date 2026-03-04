import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileSpreadsheet, Download, Upload, X, Hash, Building2, FileText, Calendar, Settings, Search, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { supplierService } from '../../domain/services/SupplierService';
import { useToast } from '../../hooks/useToast';
import * as XLSX from 'xlsx-js-style';

interface Supplier {
    id: string;
    code: string;
    name: string;
    description?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt?: string;
}

interface SupplierManagementProps {
    onUpdate: () => void;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = ({ onUpdate }) => {
    const toast = useToast();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>({
        code: '',
        name: '',
        description: ''
    });

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // State cho tính năng hợp nhất NCC
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]); // Danh sách ID NCC được chọn
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [mergeFormData, setMergeFormData] = useState<{
        primaryCode: string;
        primaryName: string;
        description: string;
    }>({
        primaryCode: '',
        primaryName: '',
        description: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    useEffect(() => {
        fetchSuppliers();

        const handleAdd = () => handleOpenModal();
        const handleImport = () => handleImportExcel();
        const handleExport = () => handleExportExcel();

        window.addEventListener('open-supplier-modal', handleAdd);
        window.addEventListener('import-supplier-excel', handleImport);
        window.addEventListener('export-supplier-excel', handleExport);

        return () => {
            window.removeEventListener('open-supplier-modal', handleAdd);
            window.removeEventListener('import-supplier-excel', handleImport);
            window.removeEventListener('export-supplier-excel', handleExport);
        };
    }, []);

    const fetchSuppliers = async () => {
        try {
            const data = await supplierService.listSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
            toast.error('Không thể tải danh sách NCC');
        }
    };

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData(supplier);
        } else {
            setEditingSupplier(null);
            // Tự động sinh mã NCC khi thêm mới dùng service
            setFormData({
                code: supplierService.generateSupplierCode(suppliers),
                name: '',
                description: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            toast.warning('Vui lòng điền đầy đủ Mã NCC và Tên NCC.');
            return;
        }

        try {
            const supplierData = {
                code: formData.code,
                name: formData.name,
                description: formData.description || ''
            };

            if (editingSupplier) {
                await supplierService.updateSupplier({ ...supplierData, id: editingSupplier.id });
            } else {
                await supplierService.createSupplier(supplierData);
            }

            setIsModalOpen(false);
            fetchSuppliers();
            onUpdate();
            toast.success(editingSupplier ? 'Cập nhật NCC thành công' : 'Thêm mới NCC thành công');
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi lưu mã NCC');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa mã NCC',
            message: `Bạn có chắc chắn muốn xóa mã NCC này?`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await supplierService.deleteSupplier(id);
                    fetchSuppliers();
                    onUpdate();
                    toast.success('Đã xóa NCC');
                } catch (error: any) {
                    toast.error(error.message || 'Lỗi khi xóa mã NCC');
                }
            }
        });
    };

    const handleImportExcel = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Pass raw json data to service, let service handle mapping and validation
                const result = await supplierService.importFromExcel(jsonData);

                toast.success(`Nhập thành công! Mới: ${result.imported}, Cập nhật: ${result.updated}`);
                fetchSuppliers();
                onUpdate();
            } catch (error: any) {
                toast.error(error.message || 'Lỗi khi nhập Excel');
            }
        };
        input.click();
    };

    const handleExportExcel = () => {
        if (suppliers.length === 0) {
            toast.warning('Không có dữ liệu để xuất.');
            return;
        }

        const data = suppliers.map(c => ({
            'Mã NCC': c.code,
            'Tên NCC': c.name,
            'Mô tả': c.description || '',
            'Ngày tạo': new Date(c.createdAt).toLocaleDateString('vi-VN')
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Mã NCC');

        const fileName = `Ma_NCC_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    // Hàm toggle chọn NCC
    const toggleSelectSupplier = (id: string) => {
        setSelectedSuppliers(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    // Hàm mở modal hợp nhất
    const handleOpenMergeModal = () => {
        if (selectedSuppliers.length < 2) {
            toast.warning('Vui lòng chọn ít nhất 2 NCC để hợp nhất.');
            return;
        }

        const selectedItems = suppliers.filter(s => selectedSuppliers.includes(s.id));
        // Mặc định chọn NCC đầu tiên làm primary
        setMergeFormData({
            primaryCode: selectedItems[0].code,
            primaryName: selectedItems[0].name,
            description: selectedItems[0].description || ''
        });
        setIsMergeModalOpen(true);
    };

    // Hàm xử lý hợp nhất NCC
    const handleMergeSuppliers = async () => {
        if (!mergeFormData.primaryCode || !mergeFormData.primaryName) {
            toast.warning('Vui lòng chọn Mã NCC và Tên NCC chính.');
            return;
        }

        try {
            await supplierService.mergeSuppliers(
                selectedSuppliers,
                mergeFormData.primaryCode,
                mergeFormData.primaryName,
                mergeFormData.description
            );

            setIsMergeModalOpen(false);
            setSelectedSuppliers([]);
            fetchSuppliers();
            onUpdate();
            toast.success('Hợp nhất NCC thành công!');
        } catch (error: any) {
            console.error('Merge failed:', error);
            toast.error(`Hợp nhất thất bại: ${error.message}`);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Action Bar & Search */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-start md:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <div className="relative w-full md:w-96 flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm theo mã, tên NCC, mô tả..."
                        className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all placeholder:text-slate-400"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 p-1 rounded-full shadow-sm"
                        >
                            <X size={14} className="stroke-[3]" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                    <button className="h-11 px-5 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:border-emerald-200 dark:hover:text-emerald-400 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95 group bg-white dark:bg-slate-900 shadow-sm" onClick={handleExportExcel}>
                        <Download size={16} className="text-emerald-500 group-hover:scale-110 transition-transform stroke-[3]" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                    </button>
                    <button className="h-11 px-5 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:border-sky-200 dark:hover:text-sky-400 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95 group bg-white dark:bg-slate-900 shadow-sm" onClick={handleImportExcel}>
                        <FileSpreadsheet size={16} className="text-sky-500 group-hover:scale-110 transition-transform stroke-[3]" />
                        <span className="hidden sm:inline">Nhập Excel</span>
                    </button>
                    <button
                        className="h-11 px-5 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-purple-600 hover:border-purple-200 dark:hover:text-purple-400 font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 active:scale-95 group bg-white dark:bg-slate-900 shadow-sm"
                        onClick={handleOpenMergeModal}
                    >
                        <Settings size={16} className="text-purple-500 group-hover:rotate-90 transition-transform stroke-[3]" />
                        <span className="hidden sm:inline">Hợp nhất</span>
                    </button>
                    <button className="h-11 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center gap-2 ml-1" onClick={() => handleOpenModal()}>
                        <Plus size={18} className="stroke-[3]" />
                        Thêm Mới
                    </button>
                </div>
            </div>
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
                                            if (e.target.checked) {
                                                setSelectedSuppliers(suppliers.map(s => s.id));
                                            } else {
                                                setSelectedSuppliers([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><Hash size={12} className="inline mr-1 text-sky-500 -mt-0.5 stroke-[3]" />Mã NCC</th>
                                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><Building2 size={12} className="inline mr-1 text-indigo-500 -mt-0.5 stroke-[3]" />Tên NCC</th>
                                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><FileText size={12} className="inline mr-1 text-amber-500 -mt-0.5 stroke-[3]" />Mô tả</th>
                                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest"><Calendar size={12} className="inline mr-1 text-emerald-500 -mt-0.5 stroke-[3]" />Ngày tạo</th>
                                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right"><Settings size={12} className="inline mr-1 -mt-0.5 stroke-[3]" />Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {filteredSuppliers.map((supplier) => (
                                <tr
                                    key={supplier.id}
                                    onClick={() => toggleSelectSupplier(supplier.id)}
                                    className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer ${selectedSuppliers.includes(supplier.id) ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}
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
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                                                className="p-2.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }}
                                                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {suppliers.length === 0 && (
                    <div className="text-center py-24 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                            <FileSpreadsheet size={32} className="opacity-50" />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-widest text-xs text-slate-500">Chưa có NCC nào</p>
                            <p className="text-[11px] mt-1.5 font-bold tracking-wider opacity-75">Nhấn "Thêm Mới" hoặc "Nhập Excel" để bắt đầu</p>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSupplier ? "Chỉnh sửa NCC" : "Thêm NCC mới"}
            >
                <div className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mã nhà cung cấp</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            placeholder="VD: NCC001"
                            disabled={!editingSupplier}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all disabled:opacity-50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên nhà cung cấp</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="VD: CÔNG TY ABC"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mô tả (tùy chọn)</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ghi chú về nhà cung cấp..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all resize-none min-h-[100px]"
                            rows={3}
                        />
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-all rounded-2xl hover:bg-rose-50 dark:hover:bg-slate-800">Hủy bỏ</button>
                        <button onClick={handleSave} className="px-8 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-sky-500/25 transition-all active:scale-95 uppercase text-[11px] tracking-widest flex items-center gap-2">
                            <Settings size={16} className="stroke-[3]" /> Lưu thông tin
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Hợp nhất NCC */}
            <Modal
                isOpen={isMergeModalOpen}
                onClose={() => setIsMergeModalOpen(false)}
                title="Hợp nhất NCC"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-6">
                    <div className="p-5 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800 shadow-inner">
                        <p className="text-sm font-medium text-sky-800 dark:text-sky-300 leading-relaxed">
                            Bạn đang hợp nhất <span className="font-black text-sky-600 dark:text-sky-400 px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900 rounded-lg">{selectedSuppliers.length} NCC</span> thành 1 nhà cung cấp duy nhất.
                        </p>
                        <p className="text-[11px] font-black text-sky-600/70 dark:text-sky-400/70 mt-2 uppercase tracking-wide flex items-center gap-1.5">
                            <ArrowRight size={14} className="stroke-[3]" /> Tất cả phiếu nhập cũ sẽ được cập nhật sang NCC mới.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Danh sách NCC được chọn</h4>
                        <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
                            {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                <div key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <span className="font-black text-sky-600 dark:text-sky-400 text-xs px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded-lg tracking-widest uppercase">{s.code}</span>
                                    <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">{s.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-5 pt-4">
                        <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Chọn thông tin NCC chính</h4>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mã NCC chính</label>
                            <select
                                value={mergeFormData.primaryCode}
                                onChange={e => setMergeFormData({ ...mergeFormData, primaryCode: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 shadow-sm transition-all uppercase tracking-widest"
                            >
                                {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                    <option key={s.id} value={s.code}>{s.code}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên NCC chính</label>
                            <select
                                value={mergeFormData.primaryName}
                                onChange={e => setMergeFormData({ ...mergeFormData, primaryName: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 shadow-sm transition-all uppercase"
                            >
                                {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mô tả</label>
                            <textarea
                                value={mergeFormData.description}
                                onChange={e => setMergeFormData({ ...mergeFormData, description: e.target.value })}
                                placeholder="Nhập mô tả mới hoặc để trống..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 shadow-sm transition-all resize-none min-h-[100px]"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <button onClick={() => setIsMergeModalOpen(false)} className="px-6 py-3 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-all rounded-2xl hover:bg-rose-50 dark:hover:bg-slate-800">Hủy bỏ</button>
                        <button onClick={handleMergeSuppliers} className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-purple-500/25 transition-all active:scale-95 uppercase text-[11px] tracking-widest flex items-center gap-2">
                            <Settings size={16} className="stroke-[3]" /> Xác nhận hợp nhất
                        </button>
                    </div>
                </div>
            </Modal>

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

