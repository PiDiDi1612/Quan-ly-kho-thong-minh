import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    Search, Plus, Edit2, Trash2, Save, X, Settings, Package, Download, Database, MapPin, Phone, StickyNote
} from 'lucide-react';
import { Project, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiService } from '../../services/api';
import { useToast } from '../../hooks/useToast';

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
        name: '',
        address: '',
        phone: '',
        description: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canModify = currentUser?.permissions?.includes('MANAGE_PLANNING') ?? false;

    const handleOpenModal = (pj?: Project) => {
        if (pj) {
            setEditingProject(pj);
            setFormData(pj);
        } else {
            setEditingProject(null);
            setFormData({ name: '', address: '', phone: '', description: '' });
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
        if (!formData.name) {
            toast.warning('Vui lòng nhập tên dự án');
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
        if (!window.confirm('Bạn có chắc chắn muốn xóa cấu hình dự án này?')) return;
        try {
            await apiService.post('/api/projects/delete', { id });
            onUpdate();
        } catch (e) {
            console.error(e);
            toast.error('Lỗi khi xóa dự án');
        }
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                for (const row of data) {
                    const normalizedRow: any = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.trim().toLowerCase()] = row[key];
                    });

                    const name = normalizedRow['name'] || normalizedRow['tên dự án'] || normalizedRow['dự án'] || normalizedRow['tên'];
                    if (!name) continue;

                    const project: Project = {
                        id: `PJ-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: String(name),
                        address: String(normalizedRow['address'] || normalizedRow['địa chỉ'] || ''),
                        phone: String(normalizedRow['phone'] || normalizedRow['số điện thoại'] || normalizedRow['sđt'] || ''),
                        description: String(normalizedRow['description'] || normalizedRow['ghi chú'] || ''),
                        createdAt: new Date().toISOString()
                    };
                    await apiService.post('/api/projects/save', project);
                }
                onUpdate();
                toast.success('Đã nhập thành công danh sách dự án!');
            } catch (err) {
                console.error(err);
                toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative group w-full md:w-96">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tìm dự án theo tên, địa chỉ..."
                        className="pl-12"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {canModify && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleImportExcel} hidden accept=".xlsx,.xls" />
                            <Button
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                leftIcon={<Download size={16} />}
                                className="bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800"
                            >
                                Nhập Excel
                            </Button>
                            <Button onClick={() => handleOpenModal()} leftIcon={<Plus size={16} />} className="shadow-lg shadow-sky-500/20">Thêm Dự Án</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-[24px] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><Database size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Tên dự án</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><MapPin size={12} className="inline mr-1 text-red-400 -mt-0.5" />Địa chỉ</th>
                            <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><Phone size={12} className="inline mr-1 text-emerald-500 -mt-0.5" />Số điện thoại</th>
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
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{pj.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{pj.address || '---'}</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">
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
                                                <button onClick={() => handleDelete(pj.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"><Trash2 size={16} /></button>
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
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tên dự án <span className="text-red-500">*</span></label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ví dụ: Vinhomes Central Park"
                                    className="h-11"
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
                                    placeholder="Ví dụ: Bình Thạnh, TP.HCM"
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
        </div>
    );
};

