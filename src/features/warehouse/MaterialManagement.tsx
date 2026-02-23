import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Package,
    Search,
    Download,
    Plus,
    Moon,
    Sun,
    RefreshCcw,
    LayoutDashboard,
    AlertTriangle,
    ShoppingCart,
    Edit2,
    Trash2,
    Eye,
    X,
    Filter,
    History,
    BarChart2,
    Check,
    Settings,
    Info,
    Calendar,
    Users,
    RotateCcw,
    Clock,
    Tag,
    Hash,
    ArrowDownLeft,
    ArrowUpRight,
    Layers,
    Archive,
    Ruler,
    FileSpreadsheet,
    Printer,
    Camera,
    Warehouse,
    PlusCircle,
    ClipboardList
} from 'lucide-react';
import { Material, WorkshopCode, MaterialClassification, Transaction, TransactionType, User } from '../../types';
import { WORKSHOPS, CLASSIFICATIONS } from '../../constants';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DateInput } from '../../components/ui/DateInput'; // Import DateInput
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SupplierManagement } from './SupplierManagement';
import { apiService } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { materialService } from '../../domain';
import * as XLSX from 'xlsx-js-style';

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

export const MaterialManagement: React.FC<MaterialManagementProps> = ({ materials, transactions, currentUser, onUpdate, canManage }) => {
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [workshopFilter, setWorkshopFilter] = useState<WorkshopCode | 'ALL'>('ALL');
    const [classFilter, setClassFilter] = useState<MaterialClassification | 'ALL'>('ALL');
    // Default to current month (Local Time)
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
    const [isGlobalHistoryOpen, setIsGlobalHistoryOpen] = useState(false);
    const [isGlobalAnalysisOpen, setIsGlobalAnalysisOpen] = useState(false);
    const [isCustomerCodeModalOpen, setIsCustomerCodeModalOpen] = useState(false);
    const [dashboardTab, setDashboardTab] = useState<'INFO' | 'HISTORY' | 'ANALYSIS'>('INFO');

    // Excel Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importExcelData, setImportExcelData] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});

    // Customer Codes
    const [customerCodes, setCustomerCodes] = useState<any[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadCustomerCodes();
    }, []);

    const loadCustomerCodes = async () => {
        try {
            const data = await apiService.get('/api/customer-codes');
            setCustomerCodes(data);
        } catch (e) {
            console.error(e);
        }
    };

    const [formData, setFormData] = useState<Partial<Material>>({
        name: '',
        classification: 'Vật tư chính',
        unit: '',
        quantity: 0,
        minThreshold: 0,
        workshop: 'OG',
        origin: '',
        note: '',
        image: ''
    });

    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [mergeFormData, setMergeFormData] = useState({
        name: '',
        classification: 'Vật tư chính' as MaterialClassification,
        unit: '',
        workshop: 'OG' as WorkshopCode,
        origin: '',
        note: ''
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

    // Formatting
    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

    // Data State
    const [fetchedMaterials, setFetchedMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch data when dates or base materials change
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // If we have local materials update, we want to reflect that, 
                // but we also need the stock calculations from server.
                // So we always fetch from server when dates change or "Refresh" is needed.
                // We depend on 'materials' prop effectively acting as a signal.
                const data = await materialService.getMaterialsWithStock(startDate, endDate);
                setFetchedMaterials(data);
            } catch (error) {
                console.error('Failed to fetch stock data:', error);
                toast.error('Lỗi khi tải dữ liệu tồn kho');
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            loadData();
        }, 300); // Debounce slightly to prevent rapid firing on date inputs

        return () => clearTimeout(timer);
    }, [startDate, endDate, materials]); // Refetch if parent updates or filters change

    const materialInventory = fetchedMaterials; // Alias for compatibility with existing code structure

    const filteredMaterials = useMemo(() => {
        const term = debouncedSearch.toLowerCase();
        return materialInventory.filter(m => {
            const matchesSearch =
                m.name.toLowerCase().includes(term) ||
                m.id.toLowerCase().includes(term) ||
                (m.origin || '').toLowerCase().includes(term);
            const matchesWorkshop = workshopFilter === 'ALL' || m.workshop === workshopFilter;
            const matchesClass = classFilter === 'ALL' || m.classification === classFilter;
            return matchesSearch && matchesWorkshop && matchesClass;
        });
    }, [materialInventory, debouncedSearch, workshopFilter, classFilter]);

    // Handlers
    const handleOpenModal = (material?: Material) => {
        if (material) {
            setEditingMaterial(material);
            setFormData(material);
        } else {
            setEditingMaterial(null);
            setFormData({
                name: '',
                classification: 'Vật tư chính',
                unit: '',
                quantity: 0,
                minThreshold: 0,
                workshop: 'OG',
                origin: '',
                note: '',
                image: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.unit) {
            toast.warning('Vui lòng điền tên vật tư và đơn vị tính');
            return;
        }

        try {
            // NEW SERVICE LOGIC
            if (editingMaterial) {
                if (formData.id && formData.id !== editingMaterial.id) {
                    toast.error('Không thể thay đổi mã vật tư. Vui lòng tạo mới nếu muốn thay đổi mã.');
                    return;
                }

                await materialService.updateMaterial(editingMaterial.id, {
                    ...formData,
                    quantity: undefined, // Prevent quantity update via this form
                    workshop: undefined, // Prevent workshop update
                } as any);

                toast.success('Cập nhật vật tư thành công');
            } else {
                await materialService.createMaterial({
                    id: formData.id || undefined, // Support custom ID or auto-gen
                    name: formData.name!,
                    classification: formData.classification!,
                    unit: formData.unit!,
                    workshop: formData.workshop!,
                    quantity: 0,
                    minThreshold: parseNumber(formData.minThreshold),
                    origin: formData.origin,
                    note: formData.note,
                    image: formData.image
                } as any);
                toast.success('Tạo vật tư thành công');
            }

            setIsModalOpen(false);
            onUpdate();
        } catch (error: any) {
            console.error('Failed to save material:', error);
            const msg = error.message || 'Lỗi khi lưu vật tư';
            toast.error(msg);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa vật tư',
            message: 'Bạn có chắc chắn muốn xóa vật tư này? Thao tác này không thể hoàn tác.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await materialService.deleteMaterial(id);
                    onUpdate();
                    toast.success('Đã xóa vật tư');
                } catch (error: any) {
                    console.error('Failed to delete material:', error);
                    toast.error(error.message || 'Lỗi khi xóa vật tư');
                }
            }
        });
    };

    // Handle open merge modal
    const handleOpenMergeModal = () => {
        if (selectedMaterials.length < 2) {
            toast.warning('Vui lòng chọn ít nhất 2 vật tư để hợp nhất.');
            return;
        }

        const selectedItems = materials.filter(m => selectedMaterials.includes(m.id));

        // Validate: all materials must have same workshop
        const workshops = [...new Set(selectedItems.map(m => m.workshop))];
        if (workshops.length > 1) {
            toast.error('Chỉ có thể hợp nhất vật tư cùng kho. Vật tư được chọn thuộc các kho: ' + workshops.join(', '));
            return;
        }

        // Validate: all materials must have same unit
        const units = [...new Set(selectedItems.map(m => m.unit))];
        if (units.length > 1) {
            toast.error('Chỉ có thể hợp nhất vật tư cùng đơn vị. Vật tư được chọn có đơn vị: ' + units.join(', '));
            return;
        }

        // Set default merge form data from first material
        setMergeFormData({
            name: selectedItems[0].name,
            classification: selectedItems[0].classification,
            unit: selectedItems[0].unit,
            workshop: selectedItems[0].workshop,
            origin: selectedItems[0].origin || '',
            note: selectedItems[0].note || ''
        });
        setIsMergeModalOpen(true);
    };

    // Handle merge materials
    const handleMergeMaterials = async () => {
        if (!mergeFormData.name || !mergeFormData.unit) {
            toast.warning('Vui lòng nhập tên vật tư và đơn vị.');
            return;
        }

        try {
            await materialService.mergeMaterials(
                selectedMaterials,
                {
                    name: mergeFormData.name,
                    classification: mergeFormData.classification,
                    unit: mergeFormData.unit,
                    workshop: mergeFormData.workshop,
                    origin: mergeFormData.origin,
                    note: mergeFormData.note
                },
                currentUser?.id || 'SYSTEM',
                'legacy-auth-bypass' // TODO: implement real auth
            );

            setIsMergeModalOpen(false);
            setSelectedMaterials([]);
            onUpdate();
            toast.success('Hợp nhất vật tư thành công!');
        } catch (error: any) {
            console.error('Merge failed:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Lỗi không xác định';
            toast.error(`Hợp nhất thất bại: ${errorMessage}`);
        }
    };

    const handleExportExcel = () => {
        const data = filteredMaterials.map(m => ({
            'Mã VT': m.id,
            'Tên vật tư': m.name,
            'Phân loại': m.classification,
            'Đơn vị': m.unit,
            'Số lượng': m.quantity,
            'Cảnh báo': m.minThreshold,
            'Xưởng': m.workshop,
            'Xuất xứ': m.origin,
            'Ghi chú': m.note
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kho Vật Tư");
        XLSX.writeFile(wb, `Kho_Vat_Tu_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Generic import handler (simplified for this component)
    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const dataBuf = evt.target?.result;
                    const wb = XLSX.read(dataBuf, { type: 'array' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                    if (data.length > 0) {
                        const headers = data[0].map(h => h?.toString().trim() || '');
                        setExcelHeaders(headers);
                        setImportExcelData(data.slice(1));

                        // Auto mapping logic could go here
                        setColumnMapping({}); // Reset or auto-map
                        setIsImportModalOpen(true);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        };
        input.click();
    };

    const MATERIAL_FIELDS = [
        { key: 'id', label: 'Mã Vật tư (Nếu có)' },
        { key: 'name', label: 'Tên Vật tư (*)' },
        { key: 'classification', label: 'Phân loại' },
        { key: 'unit', label: 'Đơn vị (*)' },
        { key: 'quantity', label: 'Số lượng' },
        { key: 'minThreshold', label: 'Định mức tồn' },
        { key: 'workshop', label: 'Mã Xưởng' },
        { key: 'origin', label: 'Xuất xứ' },
        { key: 'note', label: 'Ghi chú' }
    ];

    const handleProcessImport = async () => {
        if (!columnMapping['name'] || !columnMapping['unit']) {
            toast.warning('Vui lòng ánh xạ cột Tên vật tư và Đơn vị tính');
            return;
        }

        let successCount = 0;

        const rowsToImport = importExcelData.map(row => {
            const getValue = (key: string) => {
                const colIndex = excelHeaders.indexOf(columnMapping[key]);
                return colIndex !== -1 ? row[colIndex] : null;
            };
            // Map to array format expected by MaterialService
            return [
                getValue('name'),
                getValue('classification') || 'Vật tư chính',
                getValue('unit'),
                getValue('workshop') || 'OG',
                getValue('minThreshold'),
                getValue('origin'),
                getValue('note')
            ];
        });

        // Prepend header needed by implementation
        const fullData = [['Header'], ...rowsToImport] as any[][];
        const result = await materialService.importFromExcel(fullData);
        if (result.errors.length > 0) {
            toast.warning(`Có ${result.errors.length} lỗi xãy ra. Đã nhập/cập nhật ${result.imported + result.updated} dòng.`);
        } else {
            toast.success(`Đã nhập ${result.imported} mới, cập nhật ${result.updated} dòng.`);
        }
        successCount = result.imported + result.updated;

        toast.success(`Đã nhập khẩu thành công ${successCount} vật tư.`);
        setIsImportModalOpen(false);
        onUpdate();
    };

    useEffect(() => {
        const handleOpen = () => handleOpenModal();
        const handleImport = () => handleImportClick();
        const handleExport = () => handleExportExcel();
        const handlePrint = () => window.print();

        window.addEventListener('open-material-modal', handleOpen);
        window.addEventListener('import-material-excel', handleImport);
        window.addEventListener('export-excel', handleExport);
        window.addEventListener('print-material', handlePrint);

        return () => {
            window.removeEventListener('open-material-modal', handleOpen);
            window.removeEventListener('import-material-excel', handleImport);
            window.removeEventListener('export-excel', handleExport);
            window.removeEventListener('print-material', handlePrint);
        };
    }, [handleOpenModal, handleImportClick, handleExportExcel]);

    return (
        <div className="space-y-5 animate-fade-up">
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative group flex-1">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-sky-500 transition-colors" />
                    <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tìm vật tư theo tên, mã hoặc xuất xứ..."
                        className="pl-12"
                    />
                </div>
                <div className="flex flex-wrap gap-4">
                    {/* Filters */}
                    <div className="flex p-1 bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-white/5 rounded-xl">
                        <button onClick={() => setWorkshopFilter('ALL')} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${workshopFilter === 'ALL' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tất cả Xưởng</button>
                        {WORKSHOPS.map(w => (
                            <button key={w.code} onClick={() => setWorkshopFilter(w.code)} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${workshopFilter === w.code ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{w.code}</button>
                        ))}
                    </div>

                    <div className="flex p-1 bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-white/5 rounded-xl">
                        <button onClick={() => setClassFilter('ALL')} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${classFilter === 'ALL' ? 'bg-slate-800 dark:bg-slate-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tất cả Loại</button>
                        {CLASSIFICATIONS.map(c => (
                            <button key={c} onClick={() => setClassFilter(c as MaterialClassification)} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${classFilter === c ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{c === 'Vật tư chính' ? 'Chính' : 'Phụ'}</button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-white dark:bg-[#1E293B] border border-slate-200/60 dark:border-white/5 rounded-xl">
                        <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Từ</span>
                            <DateInput value={startDate} onChange={val => setStartDate(val)} className="w-36" placeholder="dd/mm/yyyy" />
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Đến</span>
                            <DateInput value={endDate} onChange={val => setEndDate(val)} className="w-36" placeholder="dd/mm/yyyy" />
                        </div>
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-red-500 transition-colors" title="Xóa lọc ngày">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Removed internal action bar - buttons moved to App.tsx Header */}
            <div className="print:block hidden print-header">
                <h1 className="text-2xl font-bold uppercase tracking-widest">DANH SÁCH VẬT TƯ TRONG KHO</h1>
                <p className="text-sm mt-1">Ngày lập: {new Date().toLocaleDateString('vi-VN')} - {new Date().toLocaleTimeString('vi-VN')}</p>
                <div className="flex gap-10 mt-2 text-xs font-bold uppercase">
                    <span>Xưởng: {workshopFilter === 'ALL' ? 'Tất cả' : workshopFilter}</span>
                    <span>Phân loại: {classFilter === 'ALL' ? 'Tất cả' : classFilter}</span>
                </div>
            </div>

            <div className="neo-card-static overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-white/5">
                            <th className="px-4 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-center">Ảnh</th>
                            <th className="px-4 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider"><Package size={13} className="inline mr-1 text-sky-500 -mt-0.5" />Vật tư & Mã</th>
                            <th className="px-4 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-center"><Warehouse size={13} className="inline mr-1 text-amber-500 -mt-0.5" />Xưởng</th>
                            <th className="px-4 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-center"><Archive size={13} className="inline mr-1 text-slate-400 -mt-0.5" />Tồn đầu</th>
                            <th className="px-4 py-3 font-semibold text-green-600 dark:text-green-400 text-[10px] uppercase tracking-wider text-center"><ArrowDownLeft size={13} className="inline mr-1 -mt-0.5" />Nhập</th>
                            <th className="px-4 py-3 font-semibold text-red-600 dark:text-red-400 text-[10px] uppercase tracking-wider text-center"><ArrowUpRight size={13} className="inline mr-1 -mt-0.5" />Xuất</th>
                            <th className="px-4 py-3 font-semibold text-sky-600 dark:text-sky-400 text-[10px] uppercase tracking-wider text-center"><BarChart2 size={13} className="inline mr-1 -mt-0.5" />Tồn cuối</th>
                            <th className="px-4 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider"><Ruler size={13} className="inline mr-1 -mt-0.5" />Đơn vị</th>
                            <th className="px-4 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider"><Tag size={13} className="inline mr-1 -mt-0.5" />Loại</th>
                            <th className="px-4 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-right"><Settings size={13} className="inline mr-1 -mt-0.5" />Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {materialInventory.map((m, idx) => (
                            <tr key={m.id} className={`table-row-hover transition-colors group ${idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                                <td className="px-3 py-3 text-center">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 overflow-hidden mx-auto flex items-center justify-center">
                                        {m.image ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" /> : <Package size={18} className="text-slate-300 dark:text-slate-600" />}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm leading-tight">{m.name}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">#{m.id} · {m.origin}</p>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs text-center">{m.workshop}</td>
                                <td className="px-4 py-3 text-center font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{m.openingStock !== undefined ? formatNumber(m.openingStock) : '-'}</td>
                                <td className="px-4 py-3 text-center font-semibold text-green-600 dark:text-green-400 tabular-nums">{m.periodIn !== undefined ? formatNumber(m.periodIn) : '-'}</td>
                                <td className="px-4 py-3 text-center font-semibold text-red-600 dark:text-red-400 tabular-nums">{m.periodOut !== undefined ? formatNumber(m.periodOut) : '-'}</td>
                                <td className="px-4 py-3 text-center font-bold text-sky-600 dark:text-sky-400 tabular-nums">{formatNumber(m.closingStock ?? m.quantity)}</td>
                                <td className="px-4 py-3">
                                    <span className="text-xs text-slate-400 dark:text-slate-500">{m.unit}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${m.classification === 'Vật tư chính' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>
                                        {m.classification === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setViewingMaterial(m); setDashboardTab('INFO'); setIsDetailModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all"><Eye size={16} /></button>
                                        {canManage && (
                                            <>
                                                <button onClick={() => handleOpenModal(m)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* SIMPLIFIED MATERIAL EDIT MODAL */}
            <Modal
                isOpen={isModalOpen || isDetailModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setIsDetailModalOpen(false);
                    setEditingMaterial(null);
                    setViewingMaterial(null);
                }}
                title={isDetailModalOpen ? "Chi tiết vật tư" : (editingMaterial ? `Chỉnh sửa: ${editingMaterial.name}` : "Thêm vật tư mới")}
                maxWidth={isDetailModalOpen ? "max-w-3xl" : "max-w-3xl"}
                contentClassName="p-0"
            >
                {isModalOpen && (
                    <div className="bg-slate-50/50 dark:bg-[#0f172a] p-4 no-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* HEADER PROFILE MINI */}
                            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div
                                    className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer hover:border-emerald-400 transition-all group/img relative"
                                    onClick={() => imageInputRef.current?.click()}
                                    title="Nhấn để thêm/thay ảnh"
                                >
                                    {formData.image
                                        ? <img src={formData.image} className="w-full h-full object-cover" alt="preview" />
                                        : <Camera size={22} className="text-slate-300 group-hover/img:text-emerald-400 transition-colors" />}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                        <Camera size={16} className="text-white" />
                                    </div>
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setFormData(prev => ({ ...prev, image: reader.result as string }));
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-tight italic">{(editingMaterial || viewingMaterial)?.name || "Đang tạo vật tư mới"}</h2>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
                                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">#{(editingMaterial || viewingMaterial)?.id || "NEW-ITEM"}</span>
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full uppercase">{(editingMaterial || viewingMaterial)?.workshop || "OG"}</span>
                                    </p>
                                </div>
                            </div>

                            {/* LIST-BASED FORM GROUPS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Group 1: Basic Information */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-3 ml-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><Info size={18} /></div>
                                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Thông tin cơ bản</h3>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[20px] overflow-hidden shadow-sm">
                                        <div className="p-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase italic tracking-tighter">Tên vật tư (*)</p>
                                            <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nhập tên..." />
                                        </div>
                                        <div className="p-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase italic tracking-tighter">Mã vật tư (Tùy chỉnh)</p>
                                            <input type="text" disabled={!!editingMaterial} className={`w - full px - 4 py - 2.5 bg - slate - 50 dark: bg - slate - 900 / 50 border border - slate - 200 dark: border - slate - 700 rounded - xl font - bold text - xs text - emerald - 600 dark: text - emerald - 400 outline - none focus: border - emerald - 500 transition - all uppercase ${!!editingMaterial ? 'opacity-50 cursor-not-allowed' : ''} `} value={formData.id || ''} onChange={e => setFormData({ ...formData, id: e.target.value })} placeholder="Hệ thống tự tạo..." />
                                        </div>
                                        <div className="p-4 flex gap-4">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase italic tracking-tighter">Đơn vị (*)</p>
                                                <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-all" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="VD: cái" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase italic tracking-tighter">Xuất xứ</p>
                                                <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-all" value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value })} placeholder="VD: Việt Nam" />
                                            </div>
                                        </div>

                                        {/* Customer Code selection - MOVED TO COLUMN 1 */}
                                        <div className="p-4 border-t border-slate-50 dark:border-slate-700/50">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase italic tracking-tighter">Chọn mã khách (tùy chọn)</p>
                                            <select
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-white outline-none focus:border-purple-500 transition-all accent-purple-600"
                                                value={formData.customerCode || ''}
                                                onChange={e => setFormData({ ...formData, customerCode: e.target.value })}
                                            >
                                                <option value="">-- Không chọn --</option>
                                                {customerCodes.map(cc => (
                                                    <option key={cc.id} value={cc.code}>{cc.code} - {cc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* Group 2: Management & Storage */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-3 ml-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400"><Settings size={18} /></div>
                                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Quản lý & Lưu kho</h3>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[20px] overflow-hidden shadow-sm">
                                        <div className="p-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase italic tracking-tighter">Phân loại hệ thống</p>
                                            <div className="flex gap-2">
                                                {CLASSIFICATIONS.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setFormData({ ...formData, classification: c as MaterialClassification })}
                                                        className={`flex - 1 py - 2 rounded - xl text - [9px] font - black uppercase transition - all border ${formData.classification === c ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'} `}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase italic tracking-tighter">Xưởng quản lý</p>
                                            <select disabled={!!editingMaterial} className={`w - full px - 4 py - 2.5 bg - slate - 50 dark: bg - slate - 900 / 50 border border - slate - 200 dark: border - slate - 700 rounded - xl font - bold text - xs text - slate - 800 dark: text - white outline - none focus: border - emerald - 500 transition - all accent - emerald - 600 ${!!editingMaterial ? 'opacity-50 cursor-not-allowed' : ''} `} value={formData.workshop} onChange={e => setFormData({ ...formData, workshop: e.target.value as WorkshopCode })}>
                                                {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="p-4">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase italic tracking-tighter">Định mức an toàn (Cảnh báo tồn kho thấp)</p>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl font-black text-xs text-red-600 outline-none focus:border-red-500 transition-all font-mono"
                                                value={formData.minThreshold}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9.,]/g, '');
                                                    const parts = val.split(/[.,]/);
                                                    if (parts.length <= 2) {
                                                        setFormData({ ...formData, minThreshold: val as any });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* FOOTER ACTIONS */}
                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingMaterial(null);
                                    }}
                                    className="px-6 py-3 rounded-xl hover:bg-slate-100 font-bold uppercase text-[11px]"
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-emerald-500/30 font-bold uppercase text-[11px]"
                                >
                                    {editingMaterial ? 'Lưu thay đổi' : 'Tạo vật tư mới'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {isDetailModalOpen && viewingMaterial && (
                    <div className="bg-white dark:bg-[#1e293b] p-6">
                        <div className="grid grid-cols-12 gap-8 h-[600px]">
                            {/* LEFT SIDEBAR - MENU */}
                            <div className="col-span-3 border-r border-slate-100 dark:border-slate-700 pr-6 space-y-2">
                                <div className="mb-8 text-center">
                                    <div className="w-24 h-24 mx-auto bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 mb-4">
                                        <Package size={48} className="text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h3 className="font-extrabold text-slate-800 dark:text-white uppercase leading-tight">{viewingMaterial.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-2">#{viewingMaterial.id}</p>
                                </div>

                                <button
                                    onClick={() => setDashboardTab('INFO')}
                                    className={`w - full flex items - center gap - 3 px - 4 py - 3 rounded - xl text - xs font - bold uppercase transition - all ${dashboardTab === 'INFO' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'} `}
                                >
                                    <Info size={16} /> Thông tin chung
                                </button>
                                <button
                                    onClick={() => setDashboardTab('HISTORY')}
                                    className={`w - full flex items - center gap - 3 px - 4 py - 3 rounded - xl text - xs font - bold uppercase transition - all ${dashboardTab === 'HISTORY' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'} `}
                                >
                                    <History size={16} /> Lịch sử giao dịch
                                </button>
                                <button
                                    onClick={() => setDashboardTab('ANALYSIS')}
                                    className={`w - full flex items - center gap - 3 px - 4 py - 3 rounded - xl text - xs font - bold uppercase transition - all ${dashboardTab === 'ANALYSIS' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'} `}
                                >
                                    <BarChart2 size={16} /> Biểu đồ biến động
                                </button>
                            </div>

                            {/* RIGHT CONTENT */}
                            <div className="col-span-9 overflow-y-auto pr-2 no-scrollbar">
                                {dashboardTab === 'INFO' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tồn kho hiện tại</p>
                                                <p className="text-3xl font-black text-slate-800 dark:text-white">{formatNumber(viewingMaterial.quantity)} <span className="text-sm font-bold text-slate-400">{viewingMaterial.unit}</span></p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Định mức an toàn</p>
                                                <p className="text-3xl font-black text-slate-800 dark:text-white">{formatNumber(viewingMaterial.minThreshold)} <span className="text-sm font-bold text-slate-400">{viewingMaterial.unit}</span></p>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase flex items-center gap-2">
                                                <Settings size={16} className="text-slate-400" />
                                                Thông tin chi tiết
                                            </h4>
                                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                                    <span className="text-xs font-medium text-slate-500">Phân loại</span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{viewingMaterial.classification}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                                    <span className="text-xs font-medium text-slate-500">Kho quản lý</span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{viewingMaterial.workshop}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                                    <span className="text-xs font-medium text-slate-500">Xuất xứ</span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{viewingMaterial.origin || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                                    <span className="text-xs font-medium text-slate-500">Mã khách</span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{viewingMaterial.customerCode || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <span className="text-xs font-medium text-slate-500 block mb-2">Ghi chú</span>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 italic">
                                                    {viewingMaterial.note || 'Không có ghi chú thêm.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {dashboardTab === 'HISTORY' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                            {transactions.filter(t => t.materialId === viewingMaterial.id).length > 0 ? (
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest font-bold">
                                                        <tr>
                                                            <th className="px-4 py-3">Ngày</th>
                                                            <th className="px-4 py-3">Loại</th>
                                                            <th className="px-4 py-3 text-right">Số lượng</th>
                                                            <th className="px-4 py-3">Người thực hiện</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {transactions
                                                            .filter(t => t.materialId === viewingMaterial.id)
                                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                            .map(t => (
                                                                <tr key={t.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px - 2 py - 1 rounded text - [10px] font - bold uppercase ${t.type === 'IN' ? 'bg-green-100 text-green-700' :
                                                                            t.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                                                            } `}>
                                                                            {t.type === 'IN' ? 'Nhập' : t.type === 'OUT' ? 'Xuất' : 'Điều chuyển'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">{formatNumber(t.quantity)}</td>
                                                                    <td className="px-4 py-3 text-slate-500">{t.user}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-8 text-center text-slate-400">
                                                    <History size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs font-bold uppercase">Chưa có lịch sử giao dịch</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Analysis tab placeholder */}
                                {dashboardTab === 'ANALYSIS' && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <BarChart2 size={48} className="mb-4 opacity-50 text-emerald-300" />
                                        <p className="text-sm font-bold uppercase">Tính năng đang phát triển</p>
                                        <p className="text-xs mt-1">Biểu đồ biến động tồn kho sẽ sớm ra mắt.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Nhập khẩu từ Excel"
                maxWidth="max-w-4xl"
            >
                {/* Excel Import Modal Content - Keep existing structure but simplify hooks call */}
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Vui lòng ánh xạ các cột từ file Excel:</p>
                    <div className="grid grid-cols-2 gap-4">
                        {MATERIAL_FIELDS.map(field => (
                            <div key={field.key} className="flex flex-col">
                                <label className="text-xs font-bold uppercase text-slate-500 mb-1">{field.label}</label>
                                <select
                                    className="px-3 py-2 border rounded-lg text-sm bg-slate-50 font-bold"
                                    value={columnMapping[field.key] || ''}
                                    onChange={e => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                                >
                                    <option value="">-- Chọn cột --</option>
                                    {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleProcessImport} className="bg-emerald-600 text-white">Tiến hành Nhập ({importExcelData.length} dòng)</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isMergeModalOpen}
                onClose={() => setIsMergeModalOpen(false)}
                title="Hợp nhất vật tư"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-4 p-4">
                    <div className="bg-emerald-50 p-4 rounded-lg flex gap-3 text-emerald-700 text-sm">
                        <AlertTriangle size={20} className="shrink-0" />
                        <div>
                            <p className="font-bold">Hành động này sẽ gộp {selectedMaterials.length} vật tư đã chọn thành một.</p>
                            <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
                                <li>Tổng số lượng tồn sẽ được cộng dồn.</li>
                                <li>Lịch sử giao dịch của các mã cũ sẽ bị xóa (hoặc chuyển sang mã mới tùy cấu hình).</li>
                                <li>Các mã vật tư cũ sẽ bị xóa khỏi hệ thống.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Input
                            label="Tên vật tư sau hợp nhất (*)"
                            value={mergeFormData.name}
                            onChange={e => setMergeFormData({ ...mergeFormData, name: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Đơn vị (*)"
                                value={mergeFormData.unit}
                                onChange={e => setMergeFormData({ ...mergeFormData, unit: e.target.value })}
                            />
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Kho quản lý</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                                    value={mergeFormData.workshop}
                                    onChange={e => setMergeFormData({ ...mergeFormData, workshop: e.target.value as WorkshopCode })}
                                    disabled
                                >
                                    {WORKSHOPS.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Phân loại</label>
                                <div className="flex gap-2">
                                    {CLASSIFICATIONS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setMergeFormData({ ...mergeFormData, classification: c as MaterialClassification })}
                                            className={`flex - 1 py - 1.5 rounded text - xs font - bold border ${mergeFormData.classification === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'} `}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Input
                                label="Xuất xứ"
                                value={mergeFormData.origin}
                                onChange={e => setMergeFormData({ ...mergeFormData, origin: e.target.value })}
                            />
                        </div>
                        <Input
                            label="Ghi chú"
                            value={mergeFormData.note}
                            onChange={e => setMergeFormData({ ...mergeFormData, note: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setIsMergeModalOpen(false)}>Hủy</Button>
                        <Button className="bg-emerald-600 text-white" onClick={handleMergeMaterials}>Xác nhận Hợp nhất</Button>
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

