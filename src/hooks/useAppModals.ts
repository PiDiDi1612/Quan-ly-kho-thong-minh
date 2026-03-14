import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionType, WorkshopCode, Material, User, ActivityLog } from '@/types';
import { transactionService, userService } from '@/domain';
import { apiService } from '../services/api';
import { useToast } from './useToast';
import { setAuthSession } from '../utils/authStorage';
import { AppTab } from '../features/layout/AppSidebar';
import { AccountForm } from '../features/account/AccountModal';

interface UseAppModalsProps {
  transactions: Transaction[];
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  userRole: string;
  isAuthenticated: boolean;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  loadData: () => Promise<void>;
  logActivity: (action: string, entityType: ActivityLog['entityType'], entityId?: string, details?: string) => void;
  authToken: string;
  parseNumber: (val: any) => number;
}

export const useAppModals = ({
  transactions, currentUser, setCurrentUser, userRole, isAuthenticated,
  activeTab, setActiveTab, loadData, logActivity, authToken, parseNumber
}: UseAppModalsProps) => {
  const toast = useToast();

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; type: 'danger' | 'info'; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });

  const [receiptType, setReceiptType] = useState<TransactionType>(TransactionType.OUT);
  const [receiptWorkshop, setReceiptWorkshop] = useState<WorkshopCode>('OG');
  const [receiptId, setReceiptId] = useState('');
  const [receiptSupplier, setReceiptSupplier] = useState('');
  const [receiptTime, setReceiptTime] = useState('');
  const [receiptTimeDisplay, setReceiptTimeDisplay] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ materialId: string, quantity: number }[]>([]);
  const [orderCode, setOrderCode] = useState('');
  const [accountForm, setAccountForm] = useState<AccountForm>({
    currentPassword: '', newPassword: '', confirmPassword: '', fullName: '', email: ''
  });
  const [modalError, setModalError] = useState<string | null>(null);

  const generateReceiptId = useCallback((type: TransactionType, workshop: WorkshopCode) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = type === TransactionType.IN ? 'PNK' : type === TransactionType.OUT ? 'PXK' : 'PDC';
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    const sameTypeTxs = safeTxs.filter(t => t.receiptId.startsWith(`${prefix}/${workshop}/${year}/`));
    let nextNum = 1;
    if (sameTypeTxs.length > 0) {
      const nums = sameTypeTxs.map(t => parseInt(t.receiptId.split('/')[3], 10) || 0).filter(n => !isNaN(n));
      nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    }
    return `${prefix}/${workshop}/${year}/${nextNum.toString().padStart(5, '0')}`;
  }, [transactions]);

  useEffect(() => {
    if (activeTab === 'warehouse_receipt') {
      setReceiptId(generateReceiptId(receiptType, receiptWorkshop));
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setReceiptTime(`${yyyy}-${mm}-${dd}`);
      setReceiptTimeDisplay(`${dd}/${mm}/${yyyy}`);
      setReceiptSupplier('');
    }
  }, [activeTab, receiptType, receiptWorkshop, generateReceiptId]);

  const requestConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'info') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type });
  }, []);

  const quickRestock = useCallback((material: Material) => {
    setReceiptType(TransactionType.IN);
    setReceiptWorkshop(material.workshop);
    setSelectedItems([{ materialId: material.id, quantity: material.minThreshold * 2 }]);
    setIsReceiptModalOpen(true);
    setActiveTab('warehouse_receipt');
  }, [setActiveTab]);

  const handleCreateReceipt = useCallback(() => {
    if (selectedItems.length === 0) return;
    requestConfirm('Xác nhận lập phiếu', `Hệ thống sẽ ${receiptType === 'IN' ? 'Nhập' : 'Xuất'} hàng.`, async () => {
      const finalId = receiptId.trim() || generateReceiptId(receiptType, receiptWorkshop);
      try {
        const result = await transactionService.createBatchReceipt({
          receiptId: finalId, receiptType, receiptWorkshop,
          receiptTime: receiptTime || new Date().toISOString().split('T')[0],
          receiptSupplier: receiptSupplier || undefined,
          orderCode: orderCode || undefined,
          user: currentUser?.fullName || userRole,
          items: selectedItems.map(item => ({ materialId: item.materialId, quantity: parseNumber(item.quantity) }))
        });
        if (!result.success) { setModalError(result.error || 'Lưu phiếu thất bại'); return; }
        await loadData();
        logActivity(`Lập phiếu ${finalId}`, 'TRANSACTION', finalId);
        setActiveTab('warehouse_inventory');
        setSelectedItems([]); setOrderCode(''); setReceiptId('');
        setIsReceiptModalOpen(false); setConfirmDialog(p => ({ ...p, isOpen: false }));
        toast.success(`Phiếu ${finalId} đã tạo thành công!`);
      } catch (err: any) { setModalError(err.message || 'Lỗi lưu phiếu'); }
    });
  }, [selectedItems, requestConfirm, receiptType, receiptId, generateReceiptId, receiptWorkshop, receiptTime, receiptSupplier, orderCode, currentUser, userRole, parseNumber, loadData, logActivity, setActiveTab, toast]);

  const handleUpdateAccount = useCallback(() => {
    if (!accountForm.currentPassword) { toast.warning('Nhập mật khẩu hiện tại'); return; }
    userService.updateCurrentUser({
      fullName: accountForm.fullName || currentUser?.fullName || '',
      email: accountForm.email || currentUser?.email || '',
      currentPassword: accountForm.currentPassword,
      newPassword: accountForm.newPassword || undefined
    }).then(updated => {
      setCurrentUser(updated); setAuthSession(authToken, updated);
      setIsAccountModalOpen(false); toast.success('Cập nhật thành công!');
    }).catch(err => toast.error(err.message || 'Lỗi cập nhật'));
  }, [accountForm, currentUser, authToken, setCurrentUser, toast]);

  const handleBackup = useCallback(async () => {
    try {
      const url = `${apiService.getBaseUrl()}/api/download-db`;
      const token = localStorage.getItem('auth_token');

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `SmartStock_Backup_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Đã tải xuống bản sao lưu dữ liệu (.db)');
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi tải bản sao lưu dữ liệu.');
    }
  }, [toast]);

  const handleSaveInventoryCheck = useCallback(async (data: any) => {
    try {
      const response = await apiService.post<{ success?: boolean, id?: string }>('/api/inventory-checks/save', data);
      if (response && (response.success || response.id)) {
        toast.success('Đã lưu kết quả kiểm kho');
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Lỗi khi lưu kết quả kiểm kho');
      return false;
    }
  }, [loadData, toast]);

  return {
    isReceiptModalOpen, setIsReceiptModalOpen,
    isTransferModalOpen, setIsTransferModalOpen,
    isAccountModalOpen, setIsAccountModalOpen,
    confirmDialog, setConfirmDialog,
    receiptType, setReceiptType,
    receiptWorkshop, setReceiptWorkshop,
    receiptId, setReceiptId,
    receiptSupplier, setReceiptSupplier,
    receiptTime, setReceiptTime,
    receiptTimeDisplay, setReceiptTimeDisplay,
    selectedItems, setSelectedItems,
    orderCode, setOrderCode,
    accountForm, setAccountForm,
    modalError, setModalError,
    generateReceiptId,
    requestConfirm,
    quickRestock,
    handleCreateReceipt,
    handleUpdateAccount,
    handleBackup,
    handleSaveInventoryCheck
  };
};
