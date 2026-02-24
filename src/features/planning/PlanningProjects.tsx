import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    Search, Plus, Edit2, Trash2, Save, X, Settings, Package, Download, Database, MapPin, Phone, StickyNote, FileSpreadsheet
} from 'lucide-react';
import { Project, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ExcelMappingModal, ExcelField } from '../../components/ui/ExcelMappingModal';
import { apiService } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface PlanningProjectsProps {
    projects: Project[];
    currentUser: User | null;
    onUpdate: () => void;
}

export const PlanningProjects: React.FC<PlanningProjectsProps> = ({ projects, currentUser, onUpdate }) => {
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState<Partial<Project>>({
        code: '',
        name: '',
        address: '',
        phone: '',
        description: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<{ headers: string[], data: any[][] } | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Confirm Modal State
    const [confirmState, setConfirmState] = useState<{
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
    });

    const canModify = currentUser?.role === 'ADMIN' || (currentUser?.permissions?.includes('MANAGE_PLANNING') ?? false);

    const PROJECT_FIELDS: ExcelField[] = [
        { key: 'code', label: 'Mã dự án (*)', required: true, autoMatchPatterns: ['mã', 'công trình', 'project code'] },
        { key: 'name', label: 'Tên dự án (*)', required: true, autoMatchPatterns: ['tên', 'project name'] },
        { key: 'address', label: 'Địa chỉ', autoMatchPatterns: ['địa chỉ', 'location'] },
        { key: 'phone', label: 'Số điện thoại', autoMatchPatterns: ['sđt', 'phone', 'liên hệ', 'điện thoại'] },
        { key: 'description', label: 'Ghi chú', autoMatchPatterns: ['mô tả', 'ghi chú', 'note'] }
    ];

    const handleOpenModal = (pj?: Project) => {
        if (pj) {
            setEditingProject(pj);
            setFormData(pj);
        } else {
            setEditingProject(null);
            setFormData({ code: '', name: '', address: '', phone: '', description: '' });
        }
        setIsModalOpen(true);
    };

    React.useEffect(() => {
        const handleOpen = () => handleOpenModal();
        const handleImport = () => fileInputRef.current?.click();

        window.addEventListener('open-project-modal', handleOpen);
        window.addEventListener('import-project-excel', handleImport);

        return () => {
            window.removeEventListener('open-project-modal', handleOpen);
            window.removeEventListener('import-project-excel', handleImport);
        };
    }, []);

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            toast.warning('Vui lòng nhập mã và tên dự án');
            return;
        }

        try {
            const toSave = {
                ...formData,
                id: editingProject ? editingProject.id : `PJ-${Date.now()}`,
                createdAt: formData.createdAt || new Date().toISOString()
            };
            await apiService.post('/api/projects/save', toSave);
            setIsModalOpen(false);
            onUpdate();
        } catch (e) {
            console.error(e);
            toast.error('Lỗi khi lưu cấu hình dự án');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiService.post('/api/projects/delete', { id });
            onUpdate();
            toast.success('Đã xóa cấu hình dự án thành công');
        } catch (e) {
            console.error(e);
            toast.error('Lỗi khi xóa dự án');
        }
    };

    const requestDelete = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa dự án',
            message: 'Bạn có chắc chắn muốn xóa cấu hình dự án này? Hành động này không thể hoàn tác.',
            onConfirm: () => {
                handleDelete(id);
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            },
            type: 'danger'
        });
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const dataBuf = evt.target?.result;
                const wb = XLSX.read(dataBuf, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];

                if (data.length > 0) {
                    setImportData({
                        headers: data[0].map(h => String(h || '').trim()),
                        data: data.slice(1)
                    });
                    setIsImportModalOpen(true);
                }
            } catch (err) {
                console.error(err);
                toast.error('Lỗi khi đọc file Excel');
            }
        };
        reader.readAsArrayBuffer(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleProcessImport = async (mappedData: any[]) => {
        try {
            for (const item of mappedData) {
                if (!item.code || !item.name) continue;

                let phoneStr = String(item.phone || '').trim();
                // Phục hồi số 0 ở đầu nếu Excel tự động chuyển thành số và làm mất
                if (phoneStr.length === 9 && /^[35789]/.test(phoneStr)) {
                    phoneStr = '0' + phoneStr;
                }

                const project: Project = {
                    id: `PJ-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    code: String(item.code),
                    name: String(item.name),
                    address: String(item.address || ''),
                    phone: phoneStr,
                    description: String(item.description || ''),
                    createdAt: new Date().toISOString()
                };
                await apiService.post('/api/projects/save', project);
            }
            setIsImportModalOpen(false);
            onUpdate();
            toast.success(`Đã nhập thành công ${mappedData.length} dự án!`);
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi lưu dữ liệu dự án');
        }
    };

    const filteredProjects = projects.filter(p =>
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-1 min-w-[300px] gap-2">
                    <div className="relative group flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-sky-500 transition-colors" />
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Tìm dự án theo tên, địa chỉ..."
                            className="pl-10 h-10 text-xs bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500/20 transition-all font-bold"
                        />
                    </div>
                </div>
                <div className="flex gap-2 ml-auto">
                    {canModify && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleImportExcel} hidden accept=".xlsx,.xls" />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                leftIcon={<FileSpreadsheet size={16} />}
                                className="h-10 px-4 rounded-xl btn-gradient-info text-white font-black uppercase text-[10px] tracking-wider shadow-sm"
                            >
                                Nhập Excel
                            </Button>
                            <Button
                                onClick={() => handleOpenModal()}
                                leftIcon={<Plus size={14} />}
                                className="h-10 px-5 bg-sky-600 hover:bg-sky-700 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-lg shadow-sky-500/20"
                            >
                                Thêm Dự Án
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-[24px] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest min-w-[150px]"><Database size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Công trình</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><MapPin size={12} className="inline mr-1 text-red-400 -mt-0.5" />Địa chỉ</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center"><Phone size={12} className="inline mr-1 text-emerald-500 -mt-0.5" />SĐT</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><StickyNote size={12} className="inline mr-1 text-amber-500 -mt-0.5" />Ghi chú</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right"><Settings size={12} className="inline mr-1 -mt-0.5" />Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredProjects.map(pj => (
                            <tr key={pj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                                            <Database size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none mb-1">{pj.code}</span>
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{pj.name}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{pj.address || '---'}</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300 text-center">
                                    {pj.phone || '---'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs text-slate-400 italic line-clamp-1">{pj.description || '---'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        {canModify && (
                                            <>
                                                <button onClick={() => handleOpenModal(pj)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => requestDelete(pj.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredProjects.length === 0 && (
                    <div className="py-20 text-center space-y-3">
                        <Package size={48} className="mx-auto text-slate-200" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Không tìm thấy dự án nào</p>
                    </div>
                )}
            </div>

            {/* Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-xl">
                                    <Settings size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                                    {editingProject ? 'Sửa thông tin dự án' : 'Thêm dự án mới'}
                                </h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mã dự án / Mã CT <span className="text-red-500">*</span></label>
                                <Input
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="Ví dụ: LuxD-GD2"
                                    className="h-11 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tên dự án <span className="text-red-500">*</span></label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ví dụ: LuxD giai đoạn 2"
                                    className="h-11 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Số điện thoại</label>
                                <Input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Ví dụ: 0988xxxxxx"
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Địa chỉ</label>
                                <Input
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Ví dụ: Hưng Nguyên, Nghệ An"
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mô tả / Ghi chú</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-sky-500 text-xs transition-all"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Thông tin thêm về dự án..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 font-bold uppercase tracking-wide">Hủy</Button>
                            <Button onClick={handleSave} className="flex-1 h-12 font-bold uppercase tracking-wide shadow-lg shadow-sky-500/20" leftIcon={<Save size={18} />}>Lưu dự án</Button>
                        </div>
                    </div>
                </div>
            )}
            {importData && (
                <ExcelMappingModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    fields={PROJECT_FIELDS}
                    excelHeaders={importData.headers}
                    excelData={importData.data}
                    onImport={handleProcessImport}
                    title="Nhập danh sách dự án"
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

