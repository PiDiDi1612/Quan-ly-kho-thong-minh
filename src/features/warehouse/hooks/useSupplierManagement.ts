import { useState, useEffect } from 'react';
import { Supplier } from '@/types';
import { supplierService } from '@/domain/services/SupplierService';
import { useToast } from '@/hooks/useToast';
import * as XLSX from 'xlsx-js-style';

export const useSupplierManagement = (onUpdate: () => void) => {
    const toast = useToast();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Auth & Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>({ code: '', name: '', description: '' });

    // Confirm Modal
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Merge States
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [mergeFormData, setMergeFormData] = useState({ primaryCode: '', primaryName: '', description: '' });

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
            toast.error('Không thể tải danh sách NCC');
        }
    };

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData(supplier);
        } else {
            setEditingSupplier(null);
            setFormData({ code: supplierService.generateSupplierCode(suppliers), name: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            toast.warning('Vui lòng điền đầy đủ Mã NCC và Tên NCC.');
            return;
        }
        try {
            const supplierData = { code: formData.code, name: formData.name, description: formData.description || '' };
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
            isOpen: true, title: 'Xóa mã NCC', message: `Bạn có chắc chắn muốn xóa mã NCC này?`, type: 'danger',
            onConfirm: async () => {
                try {
                    await supplierService.deleteSupplier(id);
                    fetchSuppliers();
                    onUpdate();
                    setConfirmState(p => ({ ...p, isOpen: false }));
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
            'Mã NCC': c.code, 'Tên NCC': c.name, 'Mô tả': c.description || '',
            'Ngày tạo': new Date(c.createdAt).toLocaleDateString('vi-VN')
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Mã NCC');
        XLSX.writeFile(workbook, `Ma_NCC_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleSelectSupplier = (id: string) => {
        setSelectedSuppliers(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
    };

    const handleOpenMergeModal = () => {
        if (selectedSuppliers.length < 2) {
            toast.warning('Vui lòng chọn ít nhất 2 NCC để hợp nhất.');
            return;
        }
        const selectedItems = suppliers.filter(s => selectedSuppliers.includes(s.id));
        setMergeFormData({ primaryCode: selectedItems[0].code, primaryName: selectedItems[0].name, description: selectedItems[0].description || '' });
        setIsMergeModalOpen(true);
    };

    const handleMergeSuppliers = async () => {
        if (!mergeFormData.primaryCode || !mergeFormData.primaryName) {
            toast.warning('Vui lòng chọn Mã NCC và Tên NCC chính.');
            return;
        }
        try {
            await supplierService.mergeSuppliers(selectedSuppliers, mergeFormData.primaryCode, mergeFormData.primaryName, mergeFormData.description);
            setIsMergeModalOpen(false);
            setSelectedSuppliers([]);
            fetchSuppliers();
            onUpdate();
            toast.success('Hợp nhất NCC thành công!');
        } catch (error: any) {
            toast.error(`Hợp nhất thất bại: ${error.message}`);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        state: {
            suppliers, filteredSuppliers, searchTerm, isModalOpen, editingSupplier, formData,
            confirmState, selectedSuppliers, isMergeModalOpen, mergeFormData
        },
        actions: {
            setSearchTerm, setFormData, setIsModalOpen, setConfirmState, setIsMergeModalOpen, setMergeFormData, setSelectedSuppliers,
            handleOpenModal, handleSave, handleDelete, handleImportExcel, handleExportExcel,
            toggleSelectSupplier, handleOpenMergeModal, handleMergeSuppliers
        }
    };
};
