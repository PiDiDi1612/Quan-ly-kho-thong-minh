import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileSpreadsheet, Download, Upload, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { apiService } from '../../services/api';
import * as XLSX from 'xlsx-js-style';

interface CustomerCode {
    id: string;
    code: string;
    name: string;
    description?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt?: string;
}

interface CustomerCodeManagementProps {
    onUpdate: () => void;
}

export const CustomerCodeManagement: React.FC<CustomerCodeManagementProps> = ({ onUpdate }) => {
    const [customerCodes, setCustomerCodes] = useState<CustomerCode[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<CustomerCode | null>(null);
    const [formData, setFormData] = useState<Partial<CustomerCode>>({
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

    useEffect(() => {
        fetchCustomerCodes();
    }, []);

    const fetchCustomerCodes = async () => {
        try {
            const data = await apiService.get('/api/customer-codes');
            setCustomerCodes(data);
        } catch (error) {
            console.error('Failed to fetch customer codes:', error);
        }
    };

    const handleOpenModal = (code?: CustomerCode) => {
        if (code) {
            setEditingCode(code);
            setFormData(code);
        } else {
            setEditingCode(null);
            setFormData({ code: '', name: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            alert('Vui lòng điền đầy đủ Mã khách và Tên khách.');
            return;
        }

        try {
            const codeToSave = {
                ...formData,
                id: editingCode ? editingCode.id : undefined
            };

            await apiService.post('/api/customer-codes/save', codeToSave);
            setIsModalOpen(false);
            fetchCustomerCodes();
            onUpdate();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Lỗi khi lưu mã khách');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa mã khách',
            message: `Bạn có chắc chắn muốn xóa mã khách này?`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await apiService.post('/api/customer-codes/delete', { id });
                    fetchCustomerCodes();
                    onUpdate();
                } catch (error: any) {
                    alert(error.response?.data?.error || 'Lỗi khi xóa mã khách');
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

                const codes = jsonData.map((row: any) => ({
                    code: row['Mã khách'] || row['code'] || '',
                    name: row['Tên khách'] || row['name'] || '',
                    description: row['Mô tả'] || row['description'] || ''
                })).filter(c => c.code && c.name);

                if (codes.length === 0) {
                    alert('Không tìm thấy dữ liệu hợp lệ trong file Excel.\n\nĐảm bảo file có các cột: "Mã khách", "Tên khách", "Mô tả"');
                    return;
                }

                const result: { imported: number; updated: number; total: number } = await apiService.post('/api/customer-codes/import', { codes });
                alert(`Nhập thành công!\n\n- Mới: ${result.imported}\n- Cập nhật: ${result.updated}\n- Tổng: ${result.total}`);
                fetchCustomerCodes();
                onUpdate();
            } catch (error: any) {
                alert(error.response?.data?.error || 'Lỗi khi nhập Excel');
            }
        };
        input.click();
    };

    const handleExportExcel = () => {
        if (customerCodes.length === 0) {
            alert('Không có dữ liệu để xuất.');
            return;
        }

        const data = customerCodes.map(c => ({
            'Mã khách': c.code,
            'Tên khách': c.name,
            'Mô tả': c.description || '',
            'Ngày tạo': new Date(c.createdAt).toLocaleDateString('vi-VN')
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Mã khách');

        const fileName = `Ma_khach_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Cấu hình mã khách</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Tổng số mã khách: <span className="text-blue-600 font-bold">{customerCodes.length}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        leftIcon={<Download size={16} />}
                        onClick={handleExportExcel}
                        className="bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    >
                        Xuất Excel
                    </Button>
                    <Button
                        variant="secondary"
                        leftIcon={<Upload size={16} />}
                        onClick={handleImportExcel}
                        className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                    >
                        Nhập Excel
                    </Button>
                    <Button
                        onClick={() => handleOpenModal()}
                        leftIcon={<Plus size={16} />}
                        className="shadow-lg shadow-blue-500/20"
                    >
                        Thêm mã khách
                    </Button>
                </div>
            </div>

            <div className="bg-transparent">
                <table className="w-full text-left text-sm border-separate border-spacing-y-3 px-1">
                    <thead>
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">Mã khách</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">Tên khách</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">Mô tả</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">Ngày tạo</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customerCodes.map(c => (
                            <tr key={c.id} className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 group">
                                <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-100 dark:border-slate-700 group-hover:border-blue-100 dark:group-hover:border-blue-900/50">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{c.code}</span>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-blue-100 dark:group-hover:border-blue-900/50">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-blue-100 dark:group-hover:border-blue-900/50">
                                    <span className="text-slate-600 dark:text-slate-400 text-xs">{c.description || '-'}</span>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-blue-100 dark:group-hover:border-blue-900/50">
                                    <span className="text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                                </td>
                                <td className="px-6 py-5 rounded-r-2xl border-y border-r border-slate-100 dark:border-slate-700 group-hover:border-blue-100 dark:group-hover:border-blue-900/50 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenModal(c)}
                                            className="!p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600"
                                        >
                                            <Edit2 size={18} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(c.id)}
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

                {customerCodes.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Chưa có mã khách nào</p>
                        <p className="text-xs mt-1">Nhấn "Thêm mã khách" hoặc "Nhập Excel" để bắt đầu</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCode ? "Chỉnh sửa mã khách" : "Thêm mã khách mới"}
            >
                <div className="space-y-4">
                    <Input
                        label="Mã khách"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        placeholder="VD: KH001"
                        required
                    />
                    <Input
                        label="Tên khách"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Khách hàng A"
                        required
                    />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mô tả (tùy chọn)</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ghi chú về khách hàng..."
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                        <Button onClick={handleSave}>Lưu thông tin</Button>
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
