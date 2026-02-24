import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { OrderBudget, Material, Transaction, WorkshopCode, User, TransactionType, BudgetItem, Project } from '../../../types';
import { apiService } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';

interface UsePlanningEstimatesProps {
    budgets: OrderBudget[];
    projects: Project[];
    materials: Material[];
    transactions: Transaction[];
    currentUser: User | null;
    onUpdate: () => void;
}

export const usePlanningEstimates = ({ budgets, projects, materials, transactions, currentUser, onUpdate }: UsePlanningEstimatesProps) => {
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [workshopFilter, setWorkshopFilter] = useState<WorkshopCode | 'ALL'>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'Đang thực hiện' | 'Hoàn thành'>('ALL');
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
    const [editingBudget, setEditingBudget] = useState<OrderBudget | null>(null);
    const [viewingBudget, setViewingBudget] = useState<OrderBudget | null>(null);

    const [formData, setFormData] = useState<Partial<OrderBudget>>({
        orderCode: '',
        orderName: '',
        projectCode: '',
        projectName: '',
        address: '',
        phone: '',
        description: '',
        status: 'Đang thực hiện',
        workshop: 'OG',
        items: []
    });

    const [materialSearch, setMaterialSearch] = useState('');
    const [selectedMaterialClass, setSelectedMaterialClass] = useState<'ALL' | 'Vật tư chính' | 'Vật tư phụ'>('ALL');

    const [importData, setImportData] = useState<{ headers: string[], data: any[][] } | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const budgetFileInputRef = useRef<HTMLInputElement>(null);
    const canModify = currentUser?.role === 'ADMIN' || (currentUser?.permissions?.includes('MANAGE_PLANNING') ?? false);

    const formatNumber = (num: number | string | undefined): string => {
        const val = typeof num === 'number' ? num : parseFloat(num?.toString() || '0');
        return isNaN(val) ? '0,00' : val.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleOpenModal = (budget?: OrderBudget) => {
        if (budget) {
            setEditingBudget(budget);
            setFormData(JSON.parse(JSON.stringify(budget)));
        } else {
            setEditingBudget(null);
            setFormData({
                orderCode: '',
                orderName: '',
                projectName: '',
                address: '',
                phone: '',
                description: '',
                status: 'Đang thực hiện',
                workshop: 'OG',
                items: []
            });
        }
        setIsModalOpen(true);
    };

    React.useEffect(() => {
        const handleOpen = () => handleOpenModal();
        const handleImport = () => budgetFileInputRef.current?.click();

        window.addEventListener('open-budget-modal', handleOpen);
        window.addEventListener('import-budget-excel', handleImport);

        return () => {
            window.removeEventListener('open-budget-modal', handleOpen);
            window.removeEventListener('import-budget-excel', handleImport);
        };
    }, [handleOpenModal]);

    const handleSave = async () => {
        if (!formData.orderCode || !formData.items || formData.items.length === 0) {
            toast.warning('Vui lòng nhập mã đơn hàng và chọn ít nhất 1 vật tư');
            return;
        }

        try {
            const budgetToSave = {
                ...formData,
                id: editingBudget ? editingBudget.id : `BG-${Date.now()}`,
                createdAt: formData.createdAt || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            await apiService.post('/api/budgets/save', budgetToSave);
            setIsModalOpen(false);
            onUpdate();
        } catch (error) {
            console.error('Failed to save budget:', error);
            toast.error('Lỗi khi lưu dự toán');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiService.post('/api/budgets/delete', { id });
            onUpdate();
            toast.success('Đã xóa dự toán thành công');
        } catch (error) {
            console.error('Failed to delete budget:', error);
            toast.error('Lỗi khi xóa dự toán');
        }
    };

    const addBudgetItem = (material: Material) => {
        if (formData.items?.some(it => it.materialId === material.id)) return;
        const newItem: BudgetItem = {
            materialId: material.id,
            materialName: material.name,
            classification: material.classification,
            estimatedQty: 0,
            unit: material.unit
        };
        setFormData({ ...formData, items: [...(formData.items || []), newItem] });
    };

    const updateItemQty = (index: number, qty: number) => {
        const safeQty = Math.max(0, qty);
        const newItems = [...(formData.items || [])];
        newItems[index].estimatedQty = safeQty;
        setFormData({ ...formData, items: newItems });
    };

    const removeBudgetItem = (index: number) => {
        const newItems = [...(formData.items || [])];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const generateOrderCode = (projectCode: string, workshop: WorkshopCode) => {
        if (!projectCode) return '';
        const prefix = `${projectCode}-${workshop}`;
        const existingCodes = budgets
            .filter(b => b.orderCode && b.orderCode.startsWith(prefix))
            .map(b => {
                const parts = b.orderCode!.split('-');
                const lastPart = parts[parts.length - 1];
                const seq = parseInt(lastPart);
                return isNaN(seq) ? 0 : seq;
            });

        const nextSeq = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
        return `${prefix}-${String(nextSeq).padStart(2, '0')}`;
    };

    const handleProjectSelect = (projectCode: string) => {
        const project = projects.find(p => p.code === projectCode);
        const workshop = formData.workshop || 'OG';

        const newOrderCode = generateOrderCode(projectCode, workshop);

        // Robust suffix extraction: if current orderName starts with current projectCode + '-', take the rest
        const currentSuffix = (formData.projectCode && formData.orderName?.startsWith(`${formData.projectCode}-`))
            ? formData.orderName.substring(formData.projectCode.length + 1)
            : (formData.orderName || '');

        // Generate new order name with prefix
        const newOrderName = projectCode ? (projectCode + (currentSuffix ? `-${currentSuffix}` : '-')) : '';

        if (project) {
            setFormData(prev => ({
                ...prev,
                projectCode: project.code,
                projectName: project.name,
                address: project.address || prev.address,
                phone: project.phone || prev.phone,
                description: project.description || prev.description,
                orderCode: newOrderCode,
                orderName: newOrderName
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                projectCode,
                projectName: '',
                orderCode: newOrderCode,
                orderName: newOrderName
            }));
        }
    };

    const handleWorkshopChange = (workshop: WorkshopCode) => {
        const newOrderCode = generateOrderCode(formData.projectCode || '', workshop);
        setFormData(prev => ({
            ...prev,
            workshop,
            orderCode: newOrderCode,
            items: []
        }));
    };

    const handleImportBudgetExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const dataBuf = evt.target?.result;
                const wb = XLSX.read(dataBuf, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

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
        if (e.target) e.target.value = '';
    };

    const handleProcessImport = (mappedData: any[]) => {
        const newItems: BudgetItem[] = [...(formData.items || [])];
        const workshopMaterials = materials.filter(m => m.workshop === formData.workshop);
        let count = 0;

        for (const item of mappedData) {
            const materialName = item.materialName;
            const qty = parseFloat(String(item.estimatedQty || '0').replace(/,/g, ''));

            if (!materialName || qty <= 0) continue;

            const match = workshopMaterials.find(m => m.name.trim().toLowerCase() === String(materialName).trim().toLowerCase());
            if (match) {
                const existingIdx = newItems.findIndex(it => it.materialId === match.id);
                if (existingIdx >= 0) newItems[existingIdx].estimatedQty += qty;
                else newItems.push({ materialId: match.id, materialName: match.name, classification: match.classification, estimatedQty: qty, unit: match.unit });
                count++;
            }
        }

        setFormData(prev => ({ ...prev, items: newItems }));
        setIsImportModalOpen(false);
        if (count > 0) {
            toast.success(`Đã thêm ${count} vật tư từ Excel`);
        } else {
            toast.warning('Không tìm thấy vật tư tương ứng trong hệ thống');
        }
    };

    const getIssuedQuantity = (orderCode: string, materialId: string, materialName?: string) => {
        return transactions
            .filter(t => t.type === TransactionType.OUT && t.orderCode === orderCode && (t.materialId === materialId || (!!materialName && t.materialName === materialName)))
            .reduce((sum, t) => sum + t.quantity, 0);
    };

    const filteredBudgets = useMemo(() => {
        return budgets.filter(b => {
            const matchSearch = (b.orderCode || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.orderName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchProject = (b.projectName || '').toLowerCase().includes(projectSearch.toLowerCase());
            const matchWorkshop = workshopFilter === 'ALL' || b.workshop === workshopFilter;
            const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;

            if (startDate || endDate) {
                const bDateStr = b.createdAt?.split('T')[0];
                if (!bDateStr) return false;
                if (startDate && bDateStr < startDate) return false;
                if (endDate && bDateStr > endDate) return false;
            }
            return matchSearch && matchProject && matchWorkshop && matchStatus;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [budgets, searchTerm, projectSearch, workshopFilter, statusFilter, startDate, endDate]);

    return {
        searchTerm, setSearchTerm,
        projectSearch, setProjectSearch,
        workshopFilter, setWorkshopFilter,
        statusFilter, setStatusFilter,
        startDate, setStartDate,
        endDate, setEndDate,
        isModalOpen, setIsModalOpen,
        editingBudget, setEditingBudget,
        viewingBudget, setViewingBudget,
        formData, setFormData,
        materialSearch, setMaterialSearch,
        selectedMaterialClass, setSelectedMaterialClass,
        importData, setImportData,
        isImportModalOpen, setIsImportModalOpen,
        handleProcessImport,
        budgetFileInputRef,
        canModify,
        handleOpenModal,
        handleSave,
        handleDelete,
        addBudgetItem,
        updateItemQty,
        removeBudgetItem,
        handleProjectSelect,
        handleWorkshopChange,
        handleImportBudgetExcel,
        getIssuedQuantity,
        filteredBudgets,
        formatNumber
    };
};
