import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Package, Search, Download, Plus, RefreshCcw,
    Edit2, Trash2, Eye, X, Check, Info, Calendar, History,
    ArrowDownLeft, ArrowUpRight, Layers, ExternalLink, MoreHorizontal,
    FileSpreadsheet, Upload
} from 'lucide-react';
import { Material, WorkshopCode, MaterialClassification, Transaction, User } from '@/types';
import { WORKSHOPS, CLASSIFICATIONS } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from '@/components/ui/date-input';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ExcelMappingModal } from '@/components/ui/excel-mapping-modal';
import { Pagination } from '@/components/ui/pagination';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import { materialService } from '@/domain';
import * as XLSX from 'xlsx-js-style';
import { Modal } from '@/components/ui/modal';

interface MaterialManagementProps {
    materials: Material[];
    transactions: Transaction[];
    currentUser: User | null;
    onUpdate: () => void;
    canManage: boolean;
}

const parseNumber = (value: any) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

const MATERIAL_FIELDS = [
    { key: 'name', label: 'Tên vật tư', required: true },
    { key: 'classification', label: 'Phân loại (Vật tư chính/phụ)', required: false },
    { key: 'unit', label: 'Đơn vị tính', required: true },
    { key: 'workshop', label: 'Xưởng (OG, CD, CM...)', required: false },
    { key: 'minThreshold', label: 'Định mức tồn tối thiểu', required: false },
    { key: 'origin', label: 'Xuất xứ', required: false },
    { key: 'note', label: 'Ghi chú', required: false },
];

export const MaterialManagement: React.FC<MaterialManagementProps> = ({ materials, transactions, currentUser, onUpdate, canManage }) => {
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [workshopFilter, setWorkshopFilter] = useState<WorkshopCode | 'ALL'>('ALL');
    const [classFilter, setClassFilter] = useState<MaterialClassification | 'ALL'>('ALL');

    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const offset = firstDay.getTimezoneOffset() * 60000;
        return new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [dashboardTab, setDashboardTab] = useState<'INFO' | 'HISTORY'>('INFO');

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importExcelData, setImportExcelData] = useState<{ headers: string[], data: any[][] } | null>(null);

    const [formData, setFormData] = useState<Partial<Material>>({
        name: '', classification: 'Vật tư chính', unit: '', quantity: 0,
        minThreshold: 0, workshop: 'OG', origin: '', note: '', image: '',
        customerCode: ''
    } as any);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

    const [fetchedMaterials, setFetchedMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLimit, setPageLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const isInitialLoad = useRef(true);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, workshopFilter, classFilter]);

    const loadStockData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(pageLimit),
                startDate,
                endDate,
            });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (workshopFilter !== 'ALL') params.set('workshop', workshopFilter);
            if (classFilter !== 'ALL') params.set('classification', classFilter);

            const result = await apiService.get<any>(`/api/materials?${params.toString()}`);
            if (result && Array.isArray(result.data)) {
                setFetchedMaterials(result.data);
                setTotalItems(result.total || 0);
                setTotalPages(result.totalPages || 1);
            } else if (Array.isArray(result)) {
                setFetchedMaterials(result);
                setTotalItems(result.length);
                setTotalPages(1);
            }
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu tồn kho');
        } finally {
            setIsLoading(false);
            isInitialLoad.current = false;
        }
    }, [currentPage, pageLimit, startDate, endDate, debouncedSearch, workshopFilter, classFilter, toast]);

    useEffect(() => {
        const timer = setTimeout(loadStockData, 200);
        return () => clearTimeout(timer);
    }, [loadStockData]);

    const handleOpenModal = (material?: Material) => {
        if (material) {
            setEditingMaterial(material);
            setFormData(material);
        } else {
            setEditingMaterial(null);
            setFormData({
                name: '', classification: 'Vật tư chính', unit: '', quantity: 0,
                minThreshold: 0, workshop: 'OG', origin: '', note: '', image: '',
                customerCode: ''
            } as any);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.unit) {
            toast.warning('Vui lòng điền đủ thông tin');
            return;
        }
        try {
            if (editingMaterial) {
                await materialService.updateMaterial(editingMaterial.id, { ...formData, quantity: undefined, workshop: undefined } as any);
                toast.success('Cập nhật thành công');
            } else {
                await materialService.createMaterial({ ...formData, quantity: 0, minThreshold: parseNumber(formData.minThreshold) } as any);
                toast.success('Tạo vật tư thành công');
            }
            setIsModalOpen(false);
            onUpdate();
            loadStockData();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi lưu vật tư');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmState({
            isOpen: true, title: 'Xóa vật tư', message: 'Bạn có chắc chắn muốn xóa vật tư này?', type: 'danger',
            onConfirm: async () => {
                try {
                    await materialService.deleteMaterial(id);
                    onUpdate();
                    loadStockData();
                    toast.success('Đã xóa vật tư');
                    setConfirmState(p => ({ ...p, isOpen: false }));
                } catch (error: any) {
                    toast.error(error.message || 'Lỗi khi xóa');
                }
            }
        });
    };

    const handleExportExcel = () => {
        const data = fetchedMaterials.map(m => ({
            'Mã VT': m.id,
            'Tên vật tư': m.name,
            'Phân loại': m.classification,
            'ĐVT': m.unit,
            'Tồn đầu': m.openingStock ?? 0,
            'Nhập': m.periodIn ?? 0,
            'Xuất': m.periodOut ?? 0,
            'Tồn cuối': m.closingStock ?? m.quantity,
            'Cảnh báo': m.minThreshold,
            'Xưởng': m.workshop,
            'Xuất xứ': m.origin
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kho Vật Tư");
        XLSX.writeFile(wb, `Kho_Vat_Tu_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const wb = XLSX.read(evt.target?.result, { type: 'array' });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                    if (data.length > 0) {
                        setImportExcelData({ headers: data[0].map(h => h?.toString().trim() || ''), data: data.slice(1) });
                        setIsImportModalOpen(true);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        };
        input.click();
    };

    const handleProcessImport = async (mappedData: any[]) => {
        try {
            const res = await materialService.importFromExcel([['Header'], ...mappedData.map(i => [i.name, i.classification, i.unit, i.workshop, i.minThreshold, i.origin, i.note])]);
            toast.success(`Thành công: ${res.imported} mới, ${res.updated} cập nhật.`);
            setIsImportModalOpen(false);
            onUpdate();
            loadStockData();
        } catch (e) {
            toast.error('Lỗi nhập dữ liệu');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filter Hub */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[300px] group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm vật tư theo mã, tên..."
                            className="pl-12 h-12 bg-white dark:bg-slate-900 border-slate-200 rounded-xl focus-visible:ring-emerald-600/20 font-bold shadow-sm w-full"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 ml-auto">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12 border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
                            <button onClick={() => setWorkshopFilter('ALL')} className={`px-4 rounded-lg text-[10px] font-black tracking-widest transition-all ${workshopFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>TẤT CẢ</button>
                            {WORKSHOPS.map(w => (
                                <button key={w.code} onClick={() => setWorkshopFilter(w.code)} className={`px-4 rounded-lg text-[10px] font-black tracking-widest transition-all ${workshopFilter === w.code ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{w.code}</button>
                            ))}
                        </div>

                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12 border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
                            <button onClick={() => setClassFilter('ALL')} className={`px-4 rounded-lg text-[10px] font-black transition-all ${classFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>TẤT CẢ</button>
                            {CLASSIFICATIONS.map(c => (
                                <button key={c} onClick={() => setClassFilter(c as any)} className={`px-4 rounded-lg text-[10px] font-black transition-all ${classFilter === c ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>{c === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}</button>
                            ))}
                        </div>

                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12 border border-slate-200 dark:border-slate-700 shadow-inner">
                            <div className="flex items-center px-3 gap-2 border-r border-slate-200 dark:border-slate-700">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Từ</span>
                                <DateInput value={startDate} onChange={setStartDate} className="w-24 border-none bg-transparent h-auto p-0 text-[11px] font-black text-emerald-600" />
                            </div>
                            <div className="flex items-center px-3 gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Đến</span>
                                <DateInput value={endDate} onChange={setEndDate} className="w-24 border-none bg-transparent h-auto p-0 text-[11px] font-black text-emerald-600" />
                            </div>
                        </div>

                        <div className="flex gap-2 border-l pl-4 border-slate-200 dark:border-slate-700">
                            {canManage && (
                                <>
                                    <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-emerald-600 shadow-sm p-0 group" onClick={handleExportExcel} title="Xuất Excel">
                                        <Download size={20} className="group-hover:scale-110 transition-transform" />
                                    </Button>
                                    <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-sky-600 shadow-sm p-0 group" onClick={handleImportClick} title="Nhập Excel">
                                        <Upload size={20} className="group-hover:scale-110 transition-transform" />
                                    </Button>
                                    <Button className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-black btn-hover-effect px-6 flex items-center gap-2" onClick={() => handleOpenModal()}>
                                        <Plus size={20} /> <span className="text-[11px] tracking-wider">THÊM MỚI</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Core */}
            <Card className="rounded-2xl overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[60px] font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">ẢNH</TableHead>
                                <TableHead className="w-[250px] font-black uppercase text-[10px] tracking-widest text-slate-400">VẬT TƯ & MÃ</TableHead>
                                <TableHead className="w-[100px] text-center font-black uppercase text-[10px] tracking-widest text-slate-400">PHÂN LOẠI</TableHead>
                                <TableHead className="w-[80px] text-center font-black uppercase text-[10px] tracking-widest text-slate-400">KHO</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-slate-400">TỒN ĐẦU</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-emerald-500">NHẬP</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-rose-500">XUẤT</TableHead>
                                <TableHead className="w-[120px] text-right font-black uppercase text-[10px] tracking-widest text-sky-600">TỒN CUỐI</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-slate-400">THAO TÁC</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-14 w-full rounded-xl" /></TableCell></TableRow>
                                ))
                            ) : fetchedMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-3">
                                            <Package size={48} className="text-slate-200" />
                                            <p className="font-bold text-slate-400">Không tìm thấy vật tư nào</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fetchedMaterials.map(m => (
                                    <TableRow key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-100 dark:border-slate-800">
                                        <TableCell className="py-4">
                                            <div className="w-12 h-12 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-inner group-hover/row:scale-105 transition-transform mx-auto">
                                                {m.image ? (
                                                    <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                        <Package size={20} />
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-black text-sm text-slate-700 dark:text-slate-200 line-clamp-1 group-hover:text-emerald-600 transition-colors">{m.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono font-black text-sky-600 bg-sky-50 dark:bg-sky-900/30 px-1.5 rounded uppercase">{m.id}</span>
                                                    {m.customerCode && <span className="text-[9px] font-black text-emerald-600/70 uppercase">KH: {m.customerCode}</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${m.classification === 'Vật tư chính' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}>{m.classification === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}</span>
                                        </TableCell>
                                        <TableCell className="text-center font-black text-[10px] text-slate-400">{m.workshop}</TableCell>
                                        <TableCell className="text-right text-xs font-bold text-slate-400 tabular-nums">{formatNumber(m.openingStock ?? 0)}</TableCell>
                                        <TableCell className="text-right text-xs font-black text-emerald-600 tabular-nums">{formatNumber(m.periodIn ?? 0)}</TableCell>
                                        <TableCell className="text-right text-xs font-black text-rose-500 tabular-nums">{formatNumber(m.periodOut ?? 0)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-base font-black ${(m.closingStock ?? m.quantity) <= m.minThreshold ? 'text-rose-600 animate-pulse' : 'text-sky-600'}`}>{formatNumber(m.closingStock ?? m.quantity)}</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.unit}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-sky-600 hover:bg-sky-50" onClick={() => { setViewingMaterial(m); setIsDetailModalOpen(true); }}><Eye size={16} /></Button>
                                                {canManage && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-600 hover:bg-amber-50" onClick={() => handleOpenModal(m)}><Edit2 size={16} /></Button>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(m.id)}><Trash2 size={16} /></Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200/60 shadow-sm">
                        Hiển thị <span className="text-emerald-600">{(currentPage - 1) * pageLimit + 1}</span> - <span className="text-emerald-600">{Math.min(currentPage * pageLimit, totalItems)}</span> / {totalItems} vật tư
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        total={totalItems}
                        limit={pageLimit}
                        onPageChange={setCurrentPage}
                        onLimitChange={(newLimit) => { setPageLimit(newLimit); setCurrentPage(1); }}
                    />
                </div>
            </Card>

            {/* Modal Form */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMaterial ? "Cập nhật vật tư" : "Thêm vật tư mới"} maxWidth="max-w-2xl">
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Tên vật tư (*)</label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-14 rounded-2xl font-black border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 shadow-sm bg-white dark:bg-slate-900 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Đơn vị (*)</label>
                                    <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="h-14 rounded-2xl font-black border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 text-sm" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Xưởng</label>
                                    <select value={formData.workshop} disabled={!!editingMaterial} onChange={e => setFormData({ ...formData, workshop: e.target.value as any })} className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-black focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-sm cursor-pointer dark:text-slate-200">
                                        {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Phân loại</label>
                                <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl h-14 border border-slate-200 dark:border-slate-700 shadow-inner">
                                    {CLASSIFICATIONS.map(c => (
                                        <button key={c} onClick={() => setFormData({ ...formData, classification: c as any })} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${formData.classification === c ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-md' : 'text-slate-500'}`}>{c === 'Vật tư chính' ? 'Chính' : 'Phụ'}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-widest text-rose-500 block mb-2 ml-1">Định mức an toàn</label>
                                <Input type="number" value={formData.minThreshold} onChange={e => setFormData({ ...formData, minThreshold: Number(e.target.value) })} className="h-14 rounded-2xl font-black text-rose-600 border-rose-200 bg-rose-50/30 dark:bg-rose-900/10 shadow-sm text-lg" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Xuất xứ</label>
                            <Input value={formData.origin || ''} onChange={e => setFormData({ ...formData, origin: e.target.value })} placeholder="VD: Việt Nam" className="h-14 rounded-2xl font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm" />
                        </div>
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Mã khách hàng</label>
                            <Input value={(formData as any).customerCode || ''} onChange={e => setFormData({ ...formData, customerCode: e.target.value } as any)} placeholder="Mã KH (nếu có)" className="h-14 rounded-2xl font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Link ảnh (URL)</label>
                        <Input value={formData.image || ''} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." className="h-14 rounded-2xl font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm" />
                    </div>

                    <div>
                        <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Ghi chú</label>
                        <textarea value={formData.note || ''} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Ghi chú thêm về vật tư..." className="w-full min-h-[120px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm font-black focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none shadow-sm transition-all" />
                    </div>

                    <div className="flex gap-4 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                        <Button className="flex-[2] h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-sm uppercase tracking-wider btn-hover-effect active:scale-[0.98]" onClick={handleSave}>
                            Lưu thông tin
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="THÔNG TIN CHI TIẾT" maxWidth="max-w-4xl">
                {viewingMaterial && (
                    <div className="grid grid-cols-12 gap-8 p-8 h-[650px]">
                        <div className="col-span-4 border-r border-slate-100 dark:border-slate-800 pr-8 space-y-4">
                            <div className="mb-8 text-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner">
                                {viewingMaterial.image ? (
                                    <img src={viewingMaterial.image} alt="" className="w-32 h-32 mx-auto rounded-2xl object-cover mb-4 shadow-xl ring-4 ring-white" />
                                ) : (
                                    <div className="w-32 h-32 mx-auto rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center mb-4 shadow-lg">
                                        <Package size={48} className="text-emerald-600" />
                                    </div>
                                )}
                                <h3 className="font-black text-sm uppercase leading-tight text-slate-700 dark:text-slate-200">{viewingMaterial.name}</h3>
                                <Badge className="mt-2 bg-emerald-600 text-white hover:bg-emerald-600 border-none font-mono font-black">{viewingMaterial.id}</Badge>
                            </div>

                            <Button variant={dashboardTab === 'INFO' ? 'default' : 'ghost'} className={`w-full justify-start gap-4 h-12 rounded-xl font-bold transition-all ${dashboardTab === 'INFO' ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : ''}`} onClick={() => setDashboardTab('INFO')}><Info size={20} /> Tổng quan</Button>
                            <Button variant={dashboardTab === 'HISTORY' ? 'default' : 'ghost'} className={`w-full justify-start gap-4 h-12 rounded-xl font-bold transition-all ${dashboardTab === 'HISTORY' ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : ''}`} onClick={() => setDashboardTab('HISTORY')}><History size={20} /> Lịch sử xuất/nhập</Button>
                        </div>

                        <div className="col-span-8 overflow-y-auto pr-2 no-scrollbar">
                            {dashboardTab === 'INFO' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center">
                                            <p className="text-[10px] font-black uppercase text-emerald-600/60 mb-2">Tồn kho hiện tại</p>
                                            <p className="text-4xl font-black text-emerald-600">{formatNumber(viewingMaterial.closingStock ?? viewingMaterial.quantity)}</p>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">{viewingMaterial.unit}</span>
                                        </div>
                                        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-800/50 text-center">
                                            <p className="text-[10px] font-black uppercase text-rose-500/60 mb-2">Định mức an toàn</p>
                                            <p className="text-4xl font-black text-rose-500">{formatNumber(viewingMaterial.minThreshold)}</p>
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic">{viewingMaterial.unit}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl space-y-5 border border-slate-100 dark:border-slate-700 shadow-inner">
                                        <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phân loại</span>
                                            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{viewingMaterial.classification}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Xưởng quản lý</span>
                                            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{viewingMaterial.workshop}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Xuất xứ</span>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{viewingMaterial.origin || 'N/A'}</span>
                                        </div>
                                        {viewingMaterial.customerCode && (
                                            <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mã khách hàng</span>
                                                <span className="text-xs font-black uppercase text-emerald-600">{viewingMaterial.customerCode}</span>
                                            </div>
                                        )}
                                        <div className="pt-2">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Ghi chú</p>
                                            <div className="text-xs italic text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm leading-relaxed">
                                                {viewingMaterial.note || 'Không có ghi chú.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {dashboardTab === 'HISTORY' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-700">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Ngày tháng</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Loại</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Số lượng</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Thực hiện</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transactions
                                                    .filter(t => t.materialId === viewingMaterial.id)
                                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                    .slice(0, 50)
                                                    .map(t => (
                                                        <TableRow key={t.id} className="border-slate-100 dark:border-slate-800">
                                                            <TableCell className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{new Date(t.date).toLocaleDateString('vi-VN')} {t.transactionTime || ''}</TableCell>
                                                            <TableCell>
                                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${t.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                    {t.type === 'IN' ? 'Nhập' : 'Xuất'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-sm tabular-nums">
                                                                <span className={t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>
                                                                    {t.type === 'IN' ? '+' : '-'}{formatNumber(t.quantity)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-[10px] font-black text-slate-400 uppercase">{t.user}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                {transactions.filter(t => t.materialId === viewingMaterial.id).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-12 text-slate-300 italic text-xs">Chưa có lịch sử giao dịch nào.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Excel Mapping Modal */}
            {importExcelData && (
                <ExcelMappingModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    fields={MATERIAL_FIELDS}
                    excelHeaders={importExcelData.headers}
                    excelData={importExcelData.data}
                    onImport={handleProcessImport}
                    title="CẤU HÌNH NHẬP VẬT TƯ TỪ EXCEL"
                />
            )}

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(p => ({ ...p, isOpen: false }))}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                type={confirmState.type}
            />
        </div>
    );
};

export default MaterialManagement;
