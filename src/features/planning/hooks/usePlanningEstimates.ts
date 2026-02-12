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
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<OrderBudget | null>(null);
    const [viewingBudget, setViewingBudget] = useState<OrderBudget | null>(null);

    const [formData, setFormData] = useState<Partial<OrderBudget>>({
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

    const [materialSearch, setMaterialSearch] = useState('');
    const [selectedMaterialClass, setSelectedMaterialClass] = useState<'ALL' | 'Vật tư chính' | 'Vật tư phụ'>('ALL');

    const budgetFileInputRef = useRef<HTMLInputElement>(null);
    const canModify = currentUser?.role !== 'STAFF';

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
        if (!window.confirm('Bạn có chắc chắn muốn xóa dự toán này?')) return;
        try {
            await apiService.post('/api/budgets/delete', { id });
            onUpdate();
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

    const handleProjectSelect = (projectName: string) => {
        const project = projects.find(p => p.name === projectName);
        if (project) {
            setFormData(prev => ({
                ...prev,
                projectName: project.name,
                address: project.address || prev.address,
                phone: project.phone || prev.phone,
                description: project.description || prev.description
            }));
        } else {
            setFormData(prev => ({ ...prev, projectName }));
        }
    };

    const handleImportBudgetExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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

                const newItems: BudgetItem[] = [...(formData.items || [])];
                const workshopMaterials = materials.filter(m => m.workshop === formData.workshop);

                for (const row of data) {
                    const normalizedRow: any = {};
                    Object.keys(row).forEach(key => normalizedRow[key.trim().toLowerCase()] = row[key]);

                    const materialName = normalizedRow['materialname'] || normalizedRow['tên vật tư'] || normalizedRow['tên vt'] || normalizedRow['vật tư'];
                    const qtyStr = normalizedRow['estimatedqty'] || normalizedRow['số lượng'] || normalizedRow['sl'] || normalizedRow['số lượng dự toán'];
                    const qty = parseFloat(String(qtyStr || '0').replace(/,/g, ''));

                    if (!materialName || qty <= 0) continue;

                    const match = workshopMaterials.find(m => m.name.trim().toLowerCase() === String(materialName).trim().toLowerCase());
                    if (match) {
                        const existingIdx = newItems.findIndex(it => it.materialId === match.id);
                        if (existingIdx >= 0) newItems[existingIdx].estimatedQty += qty;
                        else newItems.push({ materialId: match.id, materialName: match.name, classification: match.classification, estimatedQty: qty, unit: match.unit });
                    }
                }
                setFormData(prev => ({ ...prev, items: newItems }));
            } catch (e) {
                console.error(e);
                toast.error('Lỗi khi nhập Excel dự toán');
            }
            if (e.target) e.target.value = '';
        };
        reader.readAsBinaryString(file);
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
                const bDate = new Date(b.createdAt);
                if (startDate && bDate < new Date(startDate)) return false;
                if (endDate && bDate > new Date(endDate)) return false;
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
        budgetFileInputRef,
        canModify,
        handleOpenModal,
        handleSave,
        handleDelete,
        addBudgetItem,
        updateItemQty,
        removeBudgetItem,
        handleProjectSelect,
        handleImportBudgetExcel,
        getIssuedQuantity,
        filteredBudgets,
        formatNumber
    };
};
