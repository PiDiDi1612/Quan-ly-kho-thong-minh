import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Package, Search, Download, Upload, Plus, RefreshCcw, LayoutDashboard,
    AlertTriangle, ShoppingCart, Edit2, Trash2, Eye, X, Filter, History,
    BarChart2, Check, Settings, Info, Calendar, Users, RotateCcw, Clock,
    Tag, Hash, ArrowDownLeft, ArrowUpRight, Layers, Archive, Ruler,
    FileSpreadsheet, Printer, Camera, Warehouse, PlusCircle, ClipboardList,
    MoreHorizontal, ExternalLink
} from 'lucide-react';
import { Material, WorkshopCode, MaterialClassification, Transaction, TransactionType, User } from '@/types';
import { WORKSHOPS, CLASSIFICATIONS } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from '@/components/ui/date-input';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ExcelMappingModal, ExcelField } from '@/components/ui/excel-mapping-modal';
import { Pagination } from '@/components/ui/pagination';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import { materialService } from '@/domain';
import * as XLSX from 'xlsx-js-style';
import { Modal } from '@/components/ui/modal';
import { MaterialMerge } from './MaterialMerge';

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

// Field metadata for mapping modal
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
    const [dashboardTab, setDashboardTab] = useState<'INFO' | 'HISTORY' | 'ANALYSIS'>('INFO');

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importExcelData, setImportExcelData] = useState<{ headers: string[], data: any[][] } | null>(null);
    const [customerCodes, setCustomerCodes] = useState<any[]>([]);

    useEffect(() => {
        apiService.get('/api/customer-codes').then(setCustomerCodes).catch(console.error);
    }, []);

    const [formData, setFormData] = useState<Partial<Material>>({
        name: '', classification: 'Vật tư chính', unit: '', quantity: 0,
        minThreshold: 0, workshop: 'OG', origin: '', note: '', image: '',
        customerCode: ''
    } as any);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

    // Pagination state
    const [fetchedMaterials, setFetchedMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLimit, setPageLimit] = useState(50);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const isInitialLoad = useRef(true);

    // Reset page to 1 when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, workshopFilter, classFilter]);

    // Load data with server-side pagination
    const loadStockData = useCallback(async () => {
        if (!isInitialLoad.current && isLoading) return;
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
                // Fallback for legacy response
                setFetchedMaterials(result);
                setTotalItems(result.length);
                setTotalPages(1);
            }
        } catch (error) { toast.error('Lỗi khi tải dữ liệu tồn kho'); }
        finally { setIsLoading(false); isInitialLoad.current = false; }
    }, [currentPage, pageLimit, startDate, endDate, debouncedSearch, workshopFilter, classFilter]);

    useEffect(() => {
        const timer = setTimeout(loadStockData, 200);
        return () => clearTimeout(timer);
    }, [loadStockData]);

    // Reload when parent data changes (e.g. after save/delete) but don't flicker
    const materialsRef = useRef(materials);
    useEffect(() => {
        if (materialsRef.current !== materials && !isInitialLoad.current) {
            materialsRef.current = materials;
            loadStockData();
        }
    }, [materials]);

    const handleOpenModal = (material?: Material) => {
        if (material) { setEditingMaterial(material); setFormData(material); }
        else {
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
        if (!formData.name || !formData.unit) { toast.warning('Vui lòng điền đủ thông tin'); return; }
        try {
            if (editingMaterial) {
                await materialService.updateMaterial(editingMaterial.id, { ...formData, quantity: undefined, workshop: undefined } as any);
                toast.success('Cập nhật thành công');
            } else {
                await materialService.createMaterial({ ...formData, quantity: 0, minThreshold: parseNumber(formData.minThreshold) } as any);
                toast.success('Tạo vật tư thành công');
            }
            setIsModalOpen(false); onUpdate();
        } catch (error: any) { toast.error(error.message || 'Lỗi lưu vật tư'); }
    };

    const handleDelete = async (id: string) => {
        setConfirmState({
            isOpen: true, title: 'Xóa vật tư', message: 'Bạn có chắc chắn muốn xóa vật tư này?', type: 'danger',
            onConfirm: async () => {
                try { await materialService.deleteMaterial(id); onUpdate(); toast.success('Đã xóa vật tư'); }
                catch (error: any) { toast.error(error.message || 'Lỗi khi xóa'); }
            }
        });
    };

    const handleExportExcel = () => {
        const data = fetchedMaterials.map(m => ({
            'Mã VT': m.id, 'Tên vật tư': m.name, 'Phân loại': m.classification, 'ĐVT': m.unit,
            'Tồn cuối': m.closingStock ?? m.quantity, 'Cảnh báo': m.minThreshold, 'Xưởng': m.workshop, 'Xuất xứ': m.origin
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kho Vật Tư");
        XLSX.writeFile(wb, `SmartStock_Materials_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.xlsx, .xls';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const wb = XLSX.read(evt.target?.result, { type: 'array' });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                    if (data.length > 0) { setImportExcelData({ headers: data[0].map(h => h?.toString().trim() || ''), data: data.slice(1) }); setIsImportModalOpen(true); }
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
            setIsImportModalOpen(false); onUpdate();
        } catch (e) { toast.error('Lỗi nhập dữ liệu'); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filter Hub */}
            <div className="space-y-3">
                {/* Row 1: Search + Workshop Filter */}
                <div className="flex flex-col xl:flex-row gap-3">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                        <Input
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm vật tư theo mã, tên..."
                            className="pl-11 h-11 bg-card border-border rounded-xl focus-visible:ring-emerald-600/20 font-bold"
                        />
                    </div>
                    <div className="flex bg-muted/50 p-1 rounded-xl h-11 border border-border shrink-0">
                        <button onClick={() => setWorkshopFilter('ALL')} className={`px-4 rounded-lg text-xs font-black transition-all ${workshopFilter === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>TẤT CẢ</button>
                        {WORKSHOPS.map(w => (
                            <button key={w.code} onClick={() => setWorkshopFilter(w.code)} className={`px-4 rounded-lg text-xs font-black transition-all ${workshopFilter === w.code ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{w.code}</button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Classification Filter + Date Filter + Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-muted/50 p-1 rounded-xl h-11 border border-border shrink-0">
                        <button onClick={() => setClassFilter('ALL')} className={`px-4 rounded-lg text-xs font-black transition-all ${classFilter === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>TẤT CẢ</button>
                        {CLASSIFICATIONS.map(c => (
                            <button key={c} onClick={() => setClassFilter(c as any)} className={`px-4 rounded-lg text-xs font-black transition-all ${classFilter === c ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{c === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}</button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl h-11 px-3 shrink-0">
                        <DateInput value={startDate} onChange={setStartDate} className="w-28 border-none bg-transparent h-auto p-0 text-sm font-black" />
                        <span className="text-muted-foreground">→</span>
                        <DateInput value={endDate} onChange={setEndDate} className="w-28 border-none bg-transparent h-auto p-0 text-sm font-black" />
                    </div>

                    {canManage && (
                        <div className="flex gap-2 ml-auto shrink-0">
                            <Button variant="outline" className="h-11 rounded-xl border-emerald-600/20 text-emerald-600 font-bold hover:bg-emerald-50 active:scale-95" onClick={handleExportExcel}>
                                <Download size={18} className="mr-2" /> Xuất Excel
                            </Button>
                            <Button className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/10 font-black btn-hover-effect" onClick={() => handleOpenModal()}>
                                <Plus size={18} className="mr-1.5" /> Thêm Mới
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table Core */}
            <Card className="rounded-2xl overflow-hidden border-border bg-card shadow-sm group">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                            <TableRow className="border-b-2">
                                <TableHead className="w-[60px] font-black uppercase text-[10px] tracking-widest text-muted-foreground">ẢNH</TableHead>
                                <TableHead className="w-[200px] font-black uppercase text-[10px] tracking-widest text-muted-foreground">VẬT TƯ & MÃ</TableHead>
                                <TableHead className="w-[100px] text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">PHÂN LOẠI</TableHead>
                                <TableHead className="w-[80px] text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">KHO</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-muted-foreground">TỒN ĐẦU</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-emerald-600">NHẬP</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-rose-500">XUẤT</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-primary">TỒN CUỐI</TableHead>
                                <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-muted-foreground">THAO TÁC</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && fetchedMaterials.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-12 w-full rounded-lg" /></TableCell></TableRow>
                            ))}
                            {fetchedMaterials.map(m => (
                                <TableRow key={m.id} className="hover:bg-muted/30 transition-colors group/row">
                                    <TableCell>
                                        <div className="w-10 h-10 rounded-lg border border-border overflow-hidden bg-muted shadow-sm shrink-0">
                                            {m.image ? (
                                                <img src={m.image} alt={m.name} className="w-full h-full object-cover transition-transform group-hover/row:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                    <Package size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <div className="flex flex-col">
                                            <span className="font-black text-xs text-foreground line-clamp-1 group-hover/row:text-emerald-600 transition-colors">{m.name}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-tight">{m.id}</span>
                                            {m.customerCode && <span className="text-[9px] font-black text-emerald-600/70 uppercase">KH: {m.customerCode}</span>}
                                            {m.origin && <span className="text-[9px] font-bold text-muted-foreground/60 uppercase italic">{m.origin}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${m.classification === 'Vật tư chính' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'}`}>{m.classification === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}</span>
                                    </TableCell>
                                    <TableCell className="text-center font-black text-[10px] text-muted-foreground/70">{m.workshop}</TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-medium opacity-60">{formatNumber(m.openingStock ?? 0)}</TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-black text-emerald-600/80">{formatNumber(m.periodIn ?? 0)}</TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-black text-rose-500/80">{formatNumber(m.periodOut ?? 0)}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-black ${(m.closingStock ?? m.quantity) <= m.minThreshold ? 'text-rose-600 animate-pulse' : 'text-primary'}`}>{formatNumber(m.closingStock ?? m.quantity)}</span>
                                            {m.unit && <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40">{m.unit}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50" onClick={() => { setViewingMaterial(m); setIsDetailModalOpen(true); }}><ExternalLink size={14} /></Button>
                                            {canManage && (
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50" onClick={() => handleOpenModal(m)}><Edit2 size={14} /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(m.id)}><Trash2 size={14} /></Button>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && fetchedMaterials.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                        <Package size={40} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-bold">Không tìm thấy vật tư nào</p>
                                        <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    total={totalItems}
                    limit={pageLimit}
                    onPageChange={setCurrentPage}
                    onLimitChange={(newLimit) => { setPageLimit(newLimit); setCurrentPage(1); }}
                    className="px-4 border-t border-border"
                />
            </Card>

            {/* Modal Form */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMaterial ? "Cập nhật vật tư" : "Thêm vật tư mới"} maxWidth="max-w-2xl">
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Tên vật tư (*)</label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Phân loại</label>
                            <div className="flex gap-2 p-1 bg-muted rounded-xl h-11">
                                {CLASSIFICATIONS.map(c => (
                                    <button key={c} onClick={() => setFormData({ ...formData, classification: c as any })} className={`flex-1 rounded-lg text-[10px] font-black transition-all ${formData.classification === c ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>{c === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-5">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Đơn vị (*)</label>
                            <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="h-11 rounded-xl font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Xưởng</label>
                            <select value={formData.workshop} disabled={!!editingMaterial} onChange={e => setFormData({ ...formData, workshop: e.target.value as any })} className="h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-600/20 outline-none">
                                {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 block mb-1.5 ml-1">Định mức cảnh báo</label>
                            <Input value={formData.minThreshold} onChange={e => setFormData({ ...formData, minThreshold: e.target.value as any })} className="h-11 rounded-xl font-black text-rose-500 border-rose-100 bg-rose-50/20" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Xuất xứ</label>
                            <Input value={formData.origin || ''} onChange={e => setFormData({ ...formData, origin: e.target.value })} placeholder="VD: Việt Nam, Trung Quốc..." className="h-11 rounded-xl font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Mã khách hàng</label>
                            <Input value={(formData as any).customerCode || ''} onChange={e => setFormData({ ...formData, customerCode: e.target.value } as any)} placeholder="Mã KH (nếu có)" className="h-11 rounded-xl font-bold" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Link ảnh (URL)</label>
                            <div className="flex gap-3">
                                <Input value={formData.image || ''} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." className="flex-1 h-11 rounded-xl font-bold" />
                                {formData.image && (
                                    <div className="w-11 h-11 rounded-xl border border-border overflow-hidden bg-muted shrink-0 shadow-inner">
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">Ghi chú</label>
                        <textarea value={formData.note || ''} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Ghi chú thêm về vật tư..." className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-600/20 outline-none resize-none" />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button variant="ghost" className="flex-1 h-12 rounded-xl font-black text-xs uppercase" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                        <Button className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-black text-xs uppercase btn-hover-effect" onClick={handleSave}>Lưu thông tin</Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Chi tiết vật tư" maxWidth="max-w-4xl">
                {viewingMaterial && (
                    <div className="grid grid-cols-12 gap-8 p-6 h-[600px]">
                        <div className="col-span-3 border-r border-border pr-6 space-y-2">
                            <div className="mb-8 text-center bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl">
                                {viewingMaterial.image ? (
                                    <img src={viewingMaterial.image} alt="" className="w-24 h-24 mx-auto rounded-2xl object-cover mb-3 shadow-lg" />
                                ) : (
                                    <Package size={48} className="mx-auto text-emerald-600 mb-2" />
                                )}
                                <h3 className="font-black text-sm uppercase leading-tight">{viewingMaterial.name}</h3>
                                <span className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 text-center">{viewingMaterial.id}</span>
                            </div>
                            <Button variant={dashboardTab === 'INFO' ? 'default' : 'ghost'} className="w-full justify-start gap-3 rounded-xl font-bold" onClick={() => setDashboardTab('INFO')}><Info size={18} /> Thông tin</Button>
                            <Button variant={dashboardTab === 'HISTORY' ? 'default' : 'ghost'} className="w-full justify-start gap-3 rounded-xl font-bold" onClick={() => setDashboardTab('HISTORY')}><History size={18} /> Lịch sử</Button>
                        </div>
                        <div className="col-span-9 overflow-y-auto pr-2 no-scrollbar">
                            {dashboardTab === 'INFO' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-2 gap-6">
                                        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 shadow-none">
                                            <CardContent className="p-4 text-center">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Tồn hiện tại</p>
                                                <p className="text-3xl font-black text-emerald-600">{formatNumber(viewingMaterial.closingStock ?? viewingMaterial.quantity)}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 shadow-none">
                                            <CardContent className="p-4 text-center">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Định mức an toàn</p>
                                                <p className="text-3xl font-black text-rose-500">{formatNumber(viewingMaterial.minThreshold)}</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="bg-muted/30 p-6 rounded-2xl space-y-4">
                                        <div className="flex justify-between border-b border-border pb-2"><span className="text-xs font-bold text-muted-foreground uppercase">Phân loại</span><span className="text-xs font-black uppercase">{viewingMaterial.classification}</span></div>
                                        <div className="flex justify-between border-b border-border pb-2"><span className="text-xs font-bold text-muted-foreground uppercase">Xưởng</span><span className="text-xs font-black uppercase">{viewingMaterial.workshop}</span></div>
                                        <div className="flex justify-between border-b border-border pb-2"><span className="text-xs font-bold text-muted-foreground uppercase">Xuất xứ</span><span className="text-xs font-black">{viewingMaterial.origin || 'N/A'}</span></div>
                                        {viewingMaterial.customerCode && <div className="flex justify-between border-b border-border pb-2"><span className="text-xs font-bold text-muted-foreground uppercase">Mã khách hàng</span><span className="text-xs font-black uppercase">{viewingMaterial.customerCode}</span></div>}
                                        <div className="pt-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Ghi chú</p>
                                            <p className="text-xs italic text-foreground bg-card p-4 rounded-xl border border-border">{viewingMaterial.note || 'Không có ghi chú.'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {dashboardTab === 'HISTORY' && (
                                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Ngày</TableHead>
                                                <TableHead>Loại</TableHead>
                                                <TableHead className="text-right">Số lượng</TableHead>
                                                <TableHead>Người xử lý</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(Array.isArray(transactions) ? transactions : []).filter(t => t.materialId === viewingMaterial.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="text-xs font-bold">{new Date(t.date).toLocaleDateString('vi-VN')}</TableCell>
                                                    <TableCell><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-black ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{t.type === 'IN' ? 'Nhập' : 'Xuất'}</span></TableCell>
                                                    <TableCell className="text-right font-black text-sm">{formatNumber(t.quantity)}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{t.user}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {importExcelData && (
                <ExcelMappingModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} fields={MATERIAL_FIELDS} excelHeaders={importExcelData.headers} excelData={importExcelData.data} onImport={handleProcessImport} title="Nhập vật tư từ Excel" />
            )}

            <ConfirmModal isOpen={confirmState.isOpen} onClose={() => setConfirmState(p => ({ ...p, isOpen: false }))} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} type={confirmState.type} />
        </div>
    );
};
