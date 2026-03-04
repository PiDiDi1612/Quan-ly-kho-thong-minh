import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { materialService } from '@/domain';
import { apiService } from '@/services/api';
import { Material, MaterialClassification, WorkshopCode } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';

const parseNumber = (value: any) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const getDefaultStartDate = () => {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = firstDay.getTimezoneOffset() * 60000;
  return new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
};

const getDefaultEndDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

const defaultFormData: Partial<Material> = {
  name: '',
  classification: 'Vật tư chính',
  unit: '',
  quantity: 0,
  minThreshold: 0,
  workshop: 'OG',
  origin: '',
  note: '',
  image: '',
  customerCode: '',
} as any;

export const useMaterialManagement = (onUpdate: () => void) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [workshopFilter, setWorkshopFilter] = useState<WorkshopCode | 'ALL'>('ALL');
  const [classFilter, setClassFilter] = useState<MaterialClassification | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'INFO' | 'HISTORY'>('INFO');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importExcelData, setImportExcelData] = useState<{ headers: string[]; data: any[][] } | null>(null);
  const [formData, setFormData] = useState<Partial<Material>>(defaultFormData);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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
      setFormData({ ...defaultFormData });
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

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Xóa vật tư',
      message: 'Bạn có chắc chắn muốn xóa vật tư này?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await materialService.deleteMaterial(id);
          onUpdate();
          loadStockData();
          toast.success('Đã xóa vật tư');
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          toast.error(error.message || 'Lỗi khi xóa');
        }
      },
    });
  };

  const handleExportExcel = () => {
    const data = fetchedMaterials.map((m) => ({
      'Mã VT': m.id,
      'Tên vật tư': m.name,
      'Phân loại': m.classification,
      ĐVT: m.unit,
      'Tồn đầu': m.openingStock ?? 0,
      Nhập: m.periodIn ?? 0,
      Xuất: m.periodOut ?? 0,
      'Tồn cuối': m.closingStock ?? m.quantity,
      'Cảnh báo': m.minThreshold,
      Xưởng: m.workshop,
      'Xuất xứ': m.origin,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kho Vật Tư');
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
            setImportExcelData({ headers: data[0].map((h) => h?.toString().trim() || ''), data: data.slice(1) });
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
      const res = await materialService.importFromExcel([
        ['Header'],
        ...mappedData.map((i) => [i.name, i.classification, i.unit, i.workshop, i.minThreshold, i.origin, i.note]),
      ]);
      toast.success(`Thành công: ${res.imported} mới, ${res.updated} cập nhật.`);
      setIsImportModalOpen(false);
      onUpdate();
      loadStockData();
    } catch (e) {
      toast.error('Lỗi nhập dữ liệu');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    workshopFilter,
    setWorkshopFilter,
    classFilter,
    setClassFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isModalOpen,
    setIsModalOpen,
    editingMaterial,
    viewingMaterial,
    setViewingMaterial,
    isDetailModalOpen,
    setIsDetailModalOpen,
    dashboardTab,
    setDashboardTab,
    isImportModalOpen,
    setIsImportModalOpen,
    importExcelData,
    formData,
    setFormData,
    confirmState,
    setConfirmState,
    fetchedMaterials,
    isLoading,
    currentPage,
    setCurrentPage,
    pageLimit,
    setPageLimit,
    totalItems,
    totalPages,
    handleOpenModal,
    handleSave,
    handleDelete,
    handleExportExcel,
    handleImportClick,
    handleProcessImport,
  };
};
