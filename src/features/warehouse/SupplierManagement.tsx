import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileSpreadsheet, Download, Upload, X, Hash, Building2, FileText, Calendar, Settings, Search } from 'lucide-react';
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
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative w-full md:w-96 flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm theo mã, tên NCC, mô tả..."
                        className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 transition-all placeholder:text-slate-400"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto ml-auto">
                    <Button variant="outline" className="h-10 bg-white dark:bg-[#1E293B] border-slate-200/60 dark:border-white/5 transition-colors text-xs font-semibold shadow-sm" onClick={handleExportExcel}>
                        <Download className="mr-2 h-4 w-4 text-emerald-600" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                    </Button>
                    <Button variant="outline" className="h-10 bg-white dark:bg-[#1E293B] border-slate-200/60 dark:border-white/5 transition-colors text-xs font-semibold shadow-sm" onClick={handleImportExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-sky-600" />
                        <span className="hidden sm:inline">Nhập Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-10 bg-white dark:bg-[#1E293B] border-slate-200/60 dark:border-white/5 transition-colors text-xs font-semibold shadow-sm"
                        onClick={handleOpenMergeModal}
                    >
                        <Settings className="mr-2 h-4 w-4 text-purple-600" />
                        <span className="hidden sm:inline">Hợp nhất NCC</span>
                    </Button>
                    <Button className="h-10 px-5 bg-sky-600 hover:bg-sky-700 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-lg shadow-sky-500/20 ml-1" onClick={() => handleOpenModal()}>
                        <Plus size={14} className="mr-1.5 stroke-[3]" />
                        Thêm Mới
                    </Button>
                </div>
            </div>
            <div className="bg-transparent">
                <table className="w-full text-left text-sm border-separate border-spacing-y-3 px-1">
                    <thead>
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider w-12">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
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
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><Hash size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Mã NCC</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><Building2 size={12} className="inline mr-1 text-indigo-500 -mt-0.5" />Tên NCC</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><FileText size={12} className="inline mr-1 text-amber-500 -mt-0.5" />Mô tả</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><Calendar size={12} className="inline mr-1 text-emerald-500 -mt-0.5" />Ngày tạo</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider text-right"><Settings size={12} className="inline mr-1 -mt-0.5" />Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.map((supplier) => (
                            <tr
                                key={supplier.id}
                                onClick={() => toggleSelectSupplier(supplier.id)}
                                className={`bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 group cursor-pointer ${selectedSuppliers.includes(supplier.id) ? 'bg-sky-50/80 dark:bg-sky-900/30 ring-1 ring-sky-200 dark:ring-sky-800' : ''}`}
                            >
                                <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 transition-all cursor-pointer pointer-events-none"
                                        checked={selectedSuppliers.includes(supplier.id)}
                                        readOnly
                                    />
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <span className="font-bold text-sky-600 dark:text-sky-400">{supplier.code}</span>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{supplier.name}</span>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <span className="text-slate-600 dark:text-slate-400 text-xs">{supplier.description || '-'}</span>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <span className="text-slate-500 text-xs">{new Date(supplier.createdAt).toLocaleDateString('vi-VN')}</span>
                                </td>
                                <td className="px-6 py-5 rounded-r-2xl border-y border-r border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                                            className="!p-2 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-slate-400 hover:text-sky-600"
                                        >
                                            <Edit2 size={18} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }}
                                            className="!p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {suppliers.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Chưa có NCC nào</p>
                        <p className="text-xs mt-1">Nhấn "Thêm NCC" hoặc "Nhập Excel" để bắt đầu</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSupplier ? "Chỉnh sửa NCC" : "Thêm NCC mới"}
            >
                <div className="space-y-4">
                    <Input
                        label="Mã NCC"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        placeholder="VD: NCC001"
                        required
                        disabled={!editingSupplier} // Chỉ cho phép sửa khi edit
                    />
                    <Input
                        label="Tên NCC"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Công ty ABC"
                        required
                    />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mô tả (tùy chọn)</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ghi chú về khách hàng..."
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                        <Button onClick={handleSave}>Lưu thông tin</Button>
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
                <div className="space-y-4">
                    <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800">
                        <p className="text-sm font-medium text-sky-800 dark:text-sky-300">
                            Bạn đang hợp nhất <span className="font-bold">{selectedSuppliers.length} NCC</span> thành 1 NCC duy nhất.
                        </p>
                        <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                            Tất cả phiếu nhập cũ sẽ được cập nhật sang NCC mới.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Danh sách NCC được chọn:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                <div key={s.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                                    <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">{s.code}</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-sm">-</span>
                                    <span className="text-slate-800 dark:text-slate-200 text-sm">{s.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Chọn thông tin NCC chính:</h4>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mã NCC chính</label>
                            <select
                                value={mergeFormData.primaryCode}
                                onChange={e => setMergeFormData({ ...mergeFormData, primaryCode: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            >
                                {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                    <option key={s.id} value={s.code}>{s.code}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tên NCC chính</label>
                            <select
                                value={mergeFormData.primaryName}
                                onChange={e => setMergeFormData({ ...mergeFormData, primaryName: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            >
                                {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mô tả</label>
                            <textarea
                                value={mergeFormData.description}
                                onChange={e => setMergeFormData({ ...mergeFormData, description: e.target.value })}
                                placeholder="Nhập mô tả mới hoặc để trống..."
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsMergeModalOpen(false)}>Hủy bỏ</Button>
                        <Button onClick={handleMergeSuppliers} className="bg-purple-600 hover:bg-purple-700">Xác nhận hợp nhất</Button>
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

