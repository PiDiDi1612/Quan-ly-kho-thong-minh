import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, Package, ArrowUpRight, ArrowDownLeft, History, Plus,
  Search, AlertTriangle, X, Warehouse, FileText, Printer, Trash2,
  Edit2, Check, RefreshCcw, ArrowRightLeft, CheckCircle2, Minus,
  List, ChevronRight, Filter, ShoppingCart, HelpCircle, FileSpreadsheet,
  Download, Users, Settings, Activity, Shield, ListChecks, Save,
  AlertCircle, Info, Heart, Inbox, Moon, Sun, Eye, EyeOff,
  ClipboardList, Clock, Globe, LogOut, ArrowRight, RotateCcw, Database
} from 'lucide-react';

import { Material, Transaction, TransactionType, WorkshopCode, OrderBudget, BudgetItem, UserRole, User, Permission, ActivityLog, Project } from '@/types';
import { CLASSIFICATIONS, WORKSHOPS, PERMISSIONS, ROLE_PERMISSIONS } from '@/constants';
import { inventoryService, transactionService, authService, userService, materialService, supplierService } from '@/domain';
import * as XLSX from 'xlsx-js-style';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

import { UserManagement } from './features/admin/UserManagement';
import { MaterialManagement } from './features/warehouse/MaterialManagement';
import { WarehouseTransfer } from './features/warehouse/WarehouseTransfer';
import { useWarehouseTransfer } from './features/warehouse/hooks/useWarehouseTransfer';
import { WarehouseReceipt } from './features/warehouse/WarehouseReceipt';
import { SupplierManagement } from './features/warehouse/SupplierManagement';
import { TransactionHistory } from './features/warehouse/TransactionHistory';
import { debounce } from 'lodash';
import { MaterialMerge } from './features/warehouse/MaterialMerge';
import { PlanningProjects } from './features/planning/PlanningProjects';
import { PlanningEstimates } from './features/planning/PlanningEstimates';
import { ReportViewer } from './features/reports/ReportViewer';
import { AuthScreen } from './features/auth/AuthScreen';
import { AccountModal, type AccountForm } from './features/account/AccountModal';
import { AppSidebar, type AppTab } from './features/layout/AppSidebar';
import { AboutPage } from './features/about/AboutPage';
import { InventoryCheck } from './features/inventory/InventoryCheck';
import { InventoryHistory } from './features/inventory/InventoryHistory';
import { ApprovalQueue } from './features/approval/ApprovalQueue';
import { RequireRole } from './components/RequireRole';
import { apiService } from './services/api';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from './hooks/useToast';
import {
  clearRememberedUsername,
  getRememberedUsername,
  setAuthSession,
  setRememberedUsername
} from './utils/authStorage';

const App: React.FC = () => {
  const toast = useToast();
  // --- CONNECTION CONFIG ---
  const [connectionConfig] = useState<{ mode: 'SERVER' | 'CLIENT' | null, serverIp: string }>(() => {
    const saved = localStorage.getItem('connection_config');
    if (saved) return JSON.parse(saved);
    return { mode: null, serverIp: '' };
  });

  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('GUEST');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isConnectionSetupOpen, setIsConnectionSetupOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [tempIp, setTempIp] = useState('');

  useEffect(() => {
    const storedUsername = getRememberedUsername();
    if (storedUsername) {
      setRememberMe(true);
      setLoginForm(prev => ({ ...prev, username: storedUsername }));
    }
  }, []);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<OrderBudget[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [serverSummary, setServerSummary] = useState<any>(null);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  // --- UI STATE ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  // --- BACKUP STATE ---
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const { user, token, isAuthenticated } = authService.initAuth();
    if (isAuthenticated && user && token) {
      setCurrentUser(user);
      setUserRole(user.role);
      setIsAuthenticated(true);
      setAuthToken(token);
    }
  }, []);

  const [serverIp, setServerIp] = useState<string>('');
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const data = await apiService.get<{ ip: string }>('/api/system-info');
        if (data && data.ip) setServerIp(data.ip);
      } catch (error) { }
    };
    fetchIp();
  }, [connectionConfig.mode, isAuthenticated]);

  const loadData = async (isBackground = false) => {
    if (isSyncing && !isBackground) return;
    if (!isBackground) setIsSyncing(true);
    try {
      const [matRes, txData, projData, budData, suppData, usersData, logsData, summaryData, planningTxData] = await Promise.all([
        materialService.listMaterials({}),
        transactionService.listAllTransactions({}),
        apiService.get<Project[]>('/api/projects?limit=200').then((r: any) => r?.data || r).catch(() => []),
        apiService.get<OrderBudget[]>('/api/budgets/all').catch(() => []),
        supplierService.listSuppliers().catch(() => []),
        currentUser?.role === 'ADMIN' ? userService.listUsers().catch(() => []) : Promise.resolve([]),
        currentUser?.role === 'ADMIN' ? apiService.get<any>('/api/activity_logs?limit=50').then((r: any) => r?.data || r).catch(() => []) : Promise.resolve([]),
        apiService.get<any>('/api/dashboard/summary').catch(() => null),
        apiService.get<Transaction[]>('/api/transactions/planning').catch(() => [])
      ]);

      const allTransactions = [
        ...(Array.isArray(txData) ? txData : []),
        ...(Array.isArray(planningTxData) ? planningTxData : [])
      ];

      setMaterials(Array.isArray(matRes) ? (matRes as any).data || matRes : []);
      setTransactions(allTransactions);
      setProjects(Array.isArray(projData) ? projData : []);
      setBudgets(Array.isArray(budData) ? budData : []);
      setSuppliers(Array.isArray(suppData) ? suppData : []);
      setServerSummary(summaryData);

      (inventoryService as any).allTransactions = allTransactions;
      (inventoryService as any).lastFetchTime = Date.now();
      (inventoryService as any).stockCache.clear();

      if (currentUser?.role === 'ADMIN') {
        const safeUsers = Array.isArray(usersData) ? usersData : [];
        setUsers(safeUsers);
        setActivityLogs(Array.isArray(logsData) ? logsData : []);
        const updatedSelf = currentUser ? safeUsers.find((u: User) => u.id === currentUser.id) : null;
        if (updatedSelf) setCurrentUser(updatedSelf);
      }

      // Fetch pending approval count for admin/manager
      if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')) {
        apiService.get<{ count: number }>('/api/approval/count').then(res => {
          if (res && typeof res.count === 'number') setPendingApprovalCount(res.count);
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      if (!isBackground) setIsSyncing(false);
    }
  };

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  const fetchBackups = async () => {
    try {
      const data: any = await apiService.getRecentBackups();
      setBackups(Array.isArray(data) ? data : (data?.backups || []));
    } catch (error) {
      console.error("Failed to fetch backups", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings' && isAuthenticated) {
      fetchBackups();
    }
  }, [activeTab, isAuthenticated]);

  const handleTriggerServerBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await apiService.triggerBackup();
      if (result.success) {
        toast.success('Đã tạo bản sao lưu trên server: ' + result.filename);
        fetchBackups();
      } else {
        toast.error('Lỗi khi tạo bản sao lưu: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Lỗi kết nối server: ' + error.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    requestConfirm(
      'XÁC NHẬN KHÔI PHỤC DỮ LIỆU',
      `CẢNH BÁO: Toàn bộ dữ liệu hiện tại sẽ bị thay thế bởi bản sao lưu "${filename}". Hệ thống sẽ tự động khởi động lại sau khi khôi phục. Bạn có chắc chắn muốn thực hiện?`,
      async () => {
        try {
          const result = await apiService.restoreBackup(filename);
          if (result.success) {
            toast.success('Khôi phục thành công! Hệ thống đang khởi động lại...');
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          } else {
            toast.error('Lỗi khi khôi phục: ' + result.message);
          }
        } catch (error: any) {
          toast.error('Lỗi kết nối server: ' + error.message);
        }
      },
      'danger'
    );
  };

  const parseNumber = (val: string | number | undefined): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleanVal = val.toString().replace(/,/g, '.');
    const floatVal = parseFloat(cleanVal);
    return isNaN(floatVal) ? 0 : Math.round(floatVal * 100) / 100;
  };

  const handleSaveConnection = (mode: 'SERVER' | 'CLIENT', ip?: string) => {
    apiService.setConfig(mode, ip || '');
    window.location.reload();
  };

  const debouncedLoadData = useMemo(() => debounce(() => {
    loadData(true);
  }, 1000, { leading: false, trailing: true }), []);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiService.initSocket(debouncedLoadData);
    const interval = setInterval(() => loadData(true), 10000);
    return () => {
      clearInterval(interval);
      debouncedLoadData.cancel();
      apiService.disconnectSocket();
    };
  }, [isAuthenticated, debouncedLoadData]);

  useEffect(() => {
    if (!isAuthenticated || !authToken) return;
    const checkTokenExpiry = () => {
      if (authService.isTokenExpired(authToken)) {
        authService.logout();
        setIsAuthenticated(false);
        setAuthToken('');
        setCurrentUser(null);
        toast.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    };
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, authToken, toast]);

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
  }, [activeTab, receiptType, receiptWorkshop]);

  const generateReceiptId = (type: TransactionType, workshop: WorkshopCode) => {
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
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authService.login(loginForm.username.trim().toLowerCase(), loginForm.password.trim(), rememberMe);
      if (!response.success) {
        setLoginError('Thông tin đăng nhập không chính xác');
        setTimeout(() => setLoginError(null), 3000);
        return;
      }
      setAuthToken(response.token);
      if (rememberMe) setRememberedUsername(loginForm.username.trim().toLowerCase());
      else clearRememberedUsername();
      setCurrentUser(response.user);
      setUserRole(response.user.role);
      setIsAuthenticated(true);
      setLoginError(null);
    } catch (error) {
      setLoginError('Không thể kết nối máy chủ.');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setAuthToken('');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const logActivity = (action: string, entityType: ActivityLog['entityType'], entityId?: string, details?: string) => {
    if (!currentUser) return;
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action,
      entityType,
      entityId,
      details: details || action,
      timestamp: new Date().toISOString()
    };
    apiService.post('/api/activity_logs/save', newLog).catch(() => { });
  };

  const hasPermission = (permission: Permission): boolean => authService.hasPermission(currentUser, permission);
  const canModify = hasPermission('MANAGE_WAREHOUSE');

  const formatNumber = (val: number | string | undefined): string => {
    if (val === null || val === undefined) return '0';
    const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(/,/g, ''));
    return isNaN(num) ? '0' : num.toLocaleString('vi-VN');
  };

  const summary = useMemo(() => {
    const safeMaterials = Array.isArray(materials) ? materials : [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    // Calculate local totals
    const lowStockMaterials = safeMaterials.filter(m => (parseNumber(m.quantity ?? 0)) <= (parseNumber(m.minThreshold ?? 0)));
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = safeTransactions.filter(t => t.date === today);

    const baseSummary = {
      totalItems: safeMaterials.length,
      lowStockCount: lowStockMaterials.length,
      lowStockItems: lowStockMaterials.slice(0, 5),
      todayIn: todayTxs.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + (t.quantity || 0), 0),
      todayOut: todayTxs.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + (t.quantity || 0), 0),
      txCount: safeTransactions.length,
      mainItems: safeMaterials.filter(m => m.classification === 'Vật tư chính').length
    };

    if (serverSummary) {
      return {
        ...baseSummary,
        ...serverSummary,
        lowStockItems: Array.isArray(serverSummary.lowStockItems) ? serverSummary.lowStockItems : baseSummary.lowStockItems,
      };
    }

    return baseSummary;
  }, [materials, transactions, serverSummary]);

  const last7DaysData = useMemo(() => {
    const data = [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTxs = safeTransactions.filter(t => t.date === dateStr);
      data.push({
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        in: dayTxs.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + (t.quantity || 0), 0),
        out: dayTxs.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + (t.quantity || 0), 0),
      });
    }
    return data;
  }, [transactions]);

  const requestConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'info') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type });
  };

  const quickRestock = (material: Material) => {
    setReceiptType(TransactionType.IN);
    setReceiptWorkshop(material.workshop);
    setSelectedItems([{ materialId: material.id, quantity: material.minThreshold * 2 }]);
    setIsReceiptModalOpen(true);
    setActiveTab('warehouse_receipt');
  };

  const handleCreateReceipt = () => {
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
  };

  const { transferForm, setTransferForm, handleTransfer, receiptSearchClass, setReceiptSearchClass } = useWarehouseTransfer({
    transactions, currentUser, userRole, activeTab, loadData, logActivity, setActiveTab, requestConfirm, setModalError,
    closeConfirmDialog: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  });

  const handleUpdateAccount = () => {
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
  };

  const handleBackup = async () => {
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
  };

  const handleSaveInventoryCheck = async (data: any) => {
    try {
      const response = await apiService.post('/api/inventory-checks/save', data);
      if (response && (response as any).success) {
        await loadData(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Save inventory check error:', error);
      toast.error('Lỗi khi lưu phiếu kiểm kê');
      return false;
    }
  };

  if (!isAuthenticated) return (
    <>
      <Toaster />
      <AuthScreen
        isConnectionSetupOpen={isConnectionSetupOpen} setIsConnectionSetupOpen={setIsConnectionSetupOpen}
        handleSaveConnection={handleSaveConnection} tempIp={tempIp} setTempIp={setTempIp}
        handleLogin={handleLogin} loginForm={loginForm} setLoginForm={setLoginForm}
        showPassword={showPassword} setShowPassword={setShowPassword} loginError={loginError}
        rememberMe={rememberMe} setRememberMe={setRememberMe}
      />
    </>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background font-sans antialiased text-foreground">
      <Toaster />
      <AppSidebar
        activeTab={activeTab} setActiveTab={setActiveTab} hasPermission={hasPermission}
        currentUser={currentUser} userRole={userRole} onLogout={handleLogout}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        pendingApprovalCount={pendingApprovalCount}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 shrink-0 bg-card border-b border-border flex items-center justify-between px-8 gap-6 z-20 backdrop-blur-md bg-card/80 sticky top-0">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-lg font-extrabold text-foreground tracking-tight whitespace-nowrap">
              {activeTab === 'dashboard' ? '📊 Dashboard' :
                activeTab === 'warehouse_inventory' ? 'Kho Vật Tư' :
                  activeTab === 'warehouse_history' ? 'Lịch Sử Giao Dịch' :
                    activeTab === 'warehouse_receipt' ? 'Lập Phiếu Kho' :
                      activeTab === 'warehouse_approval' ? 'Duyệt Phiếu Xuất Kho' :
                        activeTab === 'warehouse_transfer' ? 'Điều Chuyển' :
                        activeTab === 'warehouse_inventory_check' ? 'Kiểm Kê Kho' :
                        activeTab === 'supplier_management' ? 'Nhà Cung Cấp' :
                          activeTab === 'planning_projects' ? 'Dự Án' :
                            activeTab === 'planning_estimates' ? 'Dự Toán' :
                              activeTab === 'users' ? 'Người Dùng' :
                                activeTab === 'about' ? 'Tác Giả & Giới Thiệu' : 'SmartStock'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end leading-none mr-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic flex items-center gap-1 mb-1">
                <Clock size={10} /> {currentTime.toLocaleDateString('vi-VN')}
              </span>
              <span className="text-2xl font-black text-emerald-600 tabular-nums tracking-tighter shadow-emerald-500/10 transition-all">
                {currentTime.toLocaleTimeString('vi-VN', { hour12: false })}
              </span>
            </div>

            <div className="h-8 w-px bg-border mx-1 hidden lg:block"></div>

            <div className="hidden lg:flex flex-col items-end leading-none mr-2">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Server IP</span>
              <span className="text-xs font-bold text-foreground tabular-nums">{serverIp || 'Local'}</span>
            </div>

            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-muted-foreground hover:text-emerald-600 transition-all" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            <div className="h-8 w-px bg-border mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-foreground leading-none mb-1">{currentUser?.fullName || 'User'}</p>
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-black uppercase text-emerald-600 border-emerald-600/20 bg-emerald-50/50 dark:bg-emerald-950/20">
                  {userRole}
                </Badge>
              </div>
              <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-emerald-600/10 hover:ring-emerald-600/40 transition-all shadow-sm" onClick={() => setIsAccountModalOpen(true)}>
                <AvatarFallback className="bg-emerald-600 text-white font-black">{currentUser?.fullName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="h-9 rounded-xl text-xs font-bold uppercase hidden sm:inline-flex"
              >
                <LogOut size={16} className="mr-1" /> Đăng xuất
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto no-scrollbar scroll-smooth">
          {activeTab === 'dashboard' && (
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'TỔNG VẬT TƯ', value: summary.totalItems, icon: Package, desc: 'Chủng loại đang quản lý', color: 'emerald' },
                  { label: 'NHẬP HÔM NAY', value: summary.todayIn, icon: ArrowDownLeft, desc: 'Số lượng vật tư mới', color: 'blue' },
                  { label: 'XUẤT HÔM NAY', value: summary.todayOut, icon: ArrowUpRight, desc: 'Số lượng đã xuất kho', color: 'amber' },
                  { label: 'CẢNH BÁO TỒN', value: summary.lowStockCount, icon: AlertTriangle, desc: 'Cần bổ sung vật tư', color: 'rose' },
                ].map((stat, i) => (
                  <Card key={i} className={`overflow-hidden border-t-4 border-t-emerald-600 card-lift group`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-6">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">{stat.label}</p>
                        <h3 className="text-4xl font-black tracking-tighter tabular-nums decoration-emerald-500/30 group-hover:underline underline-offset-4 decoration-2">{stat.value}</h3>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <stat.icon size={28} />
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" /> {stat.desc}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="shadow-sm mt-8 border-t-4 border-t-emerald-600 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                    <Activity className="text-emerald-600" size={20} /> Tổng quan nhập xuất 7 ngày gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[280px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={last7DaysData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }} />
                      <Area type="monotone" name="Nhập kho" dataKey="in" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                      <Area type="monotone" name="Xuất kho" dataKey="out" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
                <Card className="lg:col-span-12 xl:col-span-7 shadow-sm">
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                          {summary.lowStockCount > 0 ? (
                            <><AlertTriangle className="text-rose-500" size={20} /> Cảnh báo tồn kho thấp</>
                          ) : (
                            <><CheckCircle2 className="text-emerald-500" size={20} /> Kho hàng ổn định</>
                          )}
                        </CardTitle>
                        <CardDescription>Danh sách vật tư cần nhập thêm ngay lập tức</CardDescription>
                      </div>
                      {summary.lowStockCount > 0 ? (
                        <Badge variant="destructive" className="font-black px-3 py-1 rounded-lg shadow-sm">{summary.lowStockCount} MỤC</Badge>
                      ) : (
                         <Badge className="font-black px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 shadow-none border border-emerald-200 dark:border-emerald-800">0 MỤC</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {Array.isArray(summary.lowStockItems) && summary.lowStockItems.length > 0 ? (
                      <div className="space-y-3">
                        {summary.lowStockItems.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-emerald-600/30 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-105 transition-transform">
                                <Package size={22} />
                              </div>
                              <div>
                                <p className="font-extrabold text-foreground text-sm leading-tight">{m.name}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{m.workshop} · Mã: <span className="text-emerald-600">{m.id}</span></p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-6">
                              <div className="hidden sm:block">
                                <p className="text-xs font-bold text-muted-foreground uppercase leading-none mb-1">Tồn hiện tại</p>
                                <p className="text-lg font-black text-rose-500 tabular-nums leading-none">{formatNumber(m.quantity)} <span className="text-[10px]">{m.unit}</span></p>
                              </div>
                              {canModify && (
                                <Button onClick={() => quickRestock(m)} className="rounded-xl h-10 px-4 bg-emerald-600 hover:bg-emerald-700 btn-hover-effect">
                                  <ShoppingCart size={16} className="mr-2" /> <span className="text-xs font-bold uppercase">Nhập hàng</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mb-4 animate-pulse">
                          <Check size={32} />
                        </div>
                        <p className="font-bold text-lg">Kho hàng ổn định</p>
                        <p className="text-muted-foreground text-sm">Hiện không có vật tư nào dưới mức định mức.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-12 xl:col-span-5 shadow-sm overflow-hidden">
                  <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                      <History className="text-emerald-600" size={20} /> Giao dịch gần đây
                    </CardTitle>
                    <CardDescription>5 phiếu giao dịch mới nhất được thực hiện</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border border-t border-border mt-2">
                      {(Array.isArray(transactions) ? transactions : []).length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                          <History size={40} className="text-slate-200 dark:text-slate-700 mb-3" />
                          <p className="font-bold text-slate-400">Chưa có giao dịch nào.</p>
                          <p className="text-xs text-muted-foreground mt-1 mb-5">Bắt đầu bằng cách lập phiếu nhập kho.</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg dark:bg-emerald-950 dark:hover:bg-emerald-900 shadow-sm"
                            onClick={() => { setActiveTab('warehouse_receipt'); setReceiptType(TransactionType.IN); }}
                          >
                            <Plus size={14} className="mr-1.5" /> Lập phiếu nhập
                          </Button>
                        </div>
                      ) : (
                        (Array.isArray(transactions) ? transactions : []).slice(0, 5).map(t => (
                          <div key={t.id} className="p-5 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12 ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {t.type === 'IN' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate leading-tight mb-1">{t.materialName}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">{t.receiptId.split('/')[0]}</span>
                                  <span className="text-[10px] font-bold text-muted-foreground/80">{t.date} · {t.workshop}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-black tabular-nums transition-all group-hover:scale-110 ${t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'IN' ? '+' : '-'}{formatNumber(t.quantity)}
                              </p>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t.unit}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'warehouse_inventory' && (
            <MaterialManagement materials={materials} transactions={transactions} currentUser={currentUser} onUpdate={loadData} canManage={canModify} />
          )}

          {activeTab === 'warehouse_history' && (
            <TransactionHistory transactions={transactions} materials={materials} currentUser={currentUser} onRefresh={loadData} />
          )}

          {activeTab === 'warehouse_approval' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN', 'MANAGER']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
              <ApprovalQueue onUpdate={loadData} />
            </RequireRole>
          )}

          {(activeTab === 'reports_history' || activeTab === 'reports_activity' || activeTab === 'reports_inventory') && (
            <ReportViewer
              transactions={transactions}
              activityLogs={activityLogs}
              materials={materials}
              currentUser={currentUser}
              onRefresh={loadData}
              onBack={() => setActiveTab('settings')}
              initialTab={activeTab === 'reports_history' ? 'history' : activeTab === 'reports_activity' ? 'activity' : 'inventory'}
            />
          )}

          {activeTab === 'warehouse_receipt' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN', 'MANAGER', 'WAREHOUSE']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
              <WarehouseReceipt
                materials={materials}
                budgets={budgets}
                suppliers={suppliers}
                currentUser={currentUser}
                userRole={userRole}
                loadData={loadData}
                logActivity={logActivity}
                requestConfirm={requestConfirm}
                modalError={modalError}
                setModalError={setModalError}
                closeConfirmDialog={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                createBatchReceipt={(data) => transactionService.createBatchReceipt(data)}
                generateReceiptId={generateReceiptId}
                parseNumber={parseNumber}
                formatNumber={formatNumber}
              />
            </RequireRole>
          )}

          {activeTab === 'warehouse_transfer' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN', 'MANAGER', 'WAREHOUSE']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
              <WarehouseTransfer
                materials={materials}
                transferForm={transferForm}
                setTransferForm={setTransferForm}
                handleTransfer={handleTransfer}
                modalError={modalError}
                formatNumber={formatNumber}
                parseNumber={parseNumber}
                receiptSearchClass={receiptSearchClass}
                setReceiptSearchClass={setReceiptSearchClass}
              />
            </RequireRole>
          )}

          {activeTab === 'supplier_management' && (
            <SupplierManagement suppliers={suppliers} currentUser={currentUser} onUpdate={loadData} />
          )}

          {activeTab === 'warehouse_merge' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN', 'MANAGER']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
              <MaterialMerge materials={materials} currentUser={currentUser} onUpdate={loadData} />
            </RequireRole>
          )}

          {activeTab === 'warehouse_inventory_check' && (
            <div className="max-w-[1400px] mx-auto p-4">
              {showInventoryHistory ? (
                <InventoryHistory onBack={() => setShowInventoryHistory(false)} />
              ) : (
                <InventoryCheck 
                  materials={materials} 
                  onSave={handleSaveInventoryCheck}
                  onViewHistory={() => setShowInventoryHistory(true)}
                />
              )}
            </div>
          )}

          {activeTab === 'planning_projects' && (
            <PlanningProjects projects={projects} currentUser={currentUser} onUpdate={loadData} />
          )}

          {activeTab === 'planning_estimates' && (
            <PlanningEstimates budgets={budgets} projects={projects} materials={materials} transactions={transactions} currentUser={currentUser} onUpdate={loadData} />
          )}

          {activeTab === 'users' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
              <UserManagement
                users={users} currentUser={currentUser}
                onUpdate={() => userService.listUsers().then(d => Array.isArray(d) && setUsers(d))}
              />
            </RequireRole>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Backup Card */}
                <Card className="shadow-lg border-none bg-card/50 backdrop-blur-xl overflow-hidden group lg:col-span-2">
                  <div className="h-2 bg-emerald-600 w-full" />
                  <CardHeader className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shadow-inner group-hover:rotate-12 transition-transform">
                          <Database size={24} />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black">Quản lý Sao lưu Hệ thống</CardTitle>
                          <CardDescription>Bảo vệ và phục hồi dữ liệu kho hàng</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-7 px-3 text-[10px] font-bold border-emerald-600/20 text-emerald-600 bg-emerald-50/50">
                          <Clock size={12} className="mr-1" /> Tự động: 23:30 hàng ngày
                        </Badge>
                        <Button 
                          size="sm" 
                          className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs uppercase"
                          onClick={handleTriggerServerBackup}
                          disabled={isBackingUp}
                        >
                          {isBackingUp ? <RefreshCcw size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                          Sao lưu ngay
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <History size={14} /> Các bản sao lưu trên Server (Tối đa 30 bản)
                        </h4>
                        <div className="border border-border rounded-2xl overflow-hidden bg-background/50">
                          <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                            {backups.length === 0 ? (
                              <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                                <Info size={32} className="opacity-20 mb-2" />
                                <p className="text-sm font-bold">Chưa có bản sao lưu nào trên server</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-border">
                                {Array.isArray(backups) && backups.map((b, idx) => (
                                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-emerald-50/20 transition-colors group/item">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                                        <FileText size={18} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold truncate pr-4">{b.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-muted-foreground font-medium">{new Date(b.mtime).toLocaleString('vi-VN')}</span>
                                          <span className="w-1 h-1 rounded-full bg-border" />
                                          <span className="text-[10px] text-emerald-600 font-bold italic">{(b.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 px-2.5 text-[10px] font-bold uppercase border-emerald-600/20 text-emerald-600 hover:bg-emerald-50"
                                        onClick={() => {
                                          const url = `${apiService.getBaseUrl()}/api/download-db-file?filename=${b.name}`;
                                          const token = localStorage.getItem('auth_token');
                                          fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                                            .then(res => res.blob())
                                            .then(blob => {
                                              const downloadUrl = window.URL.createObjectURL(blob);
                                              const link = document.createElement('a');
                                              link.href = downloadUrl;
                                              link.download = b.name;
                                              link.click();
                                            });
                                        }}
                                      >
                                        <Download size={12} className="mr-1" /> Tải về
                                      </Button>
                                      <RequireRole role={userRole} allowedRoles={['ADMIN']}>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 px-2.5 text-[10px] font-bold uppercase text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                          onClick={() => handleRestoreBackup(b.name)}
                                        >
                                          <RefreshCcw size={12} className="mr-1" /> Khôi phục
                                        </Button>
                                      </RequireRole>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-3 flex items-center gap-2">
                            <AlertCircle size={14} /> Lưu ý quan trọng
                          </h5>
                          <div className="space-y-3">
                            <p className="text-[11px] leading-relaxed font-medium text-amber-800 dark:text-amber-200">
                              • <b>Bản sao lưu trên Server</b> được lưu trữ dài hạn (30 ngày gần nhất).
                            </p>
                            <p className="text-[11px] leading-relaxed font-medium text-amber-800 dark:text-amber-200">
                              • <b>Khôi phục dữ liệu</b> sẽ ghi đè toàn bộ dữ liệu hiện tại. Hãy cẩn trọng!
                            </p>
                            <p className="text-[11px] leading-relaxed font-medium text-amber-800 dark:text-amber-200">
                              • Nên tải bản sao lưu về máy cá nhân (Client) trước khi thực hiện các thay đổi lớn.
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full h-14 border-2 border-dashed border-emerald-600/30 hover:border-emerald-600 hover:bg-emerald-50/30 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 transition-all"
                          onClick={handleBackup}
                        >
                          <Download size={18} className="text-emerald-600" /> Tải bản sao lưu về Client
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Info Card */}
                <Card className="shadow-lg border-none bg-card/50 backdrop-blur-xl overflow-hidden group">
                  <div className="h-2 bg-sky-600 w-full" />
                  <CardHeader className="p-8">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 shadow-inner group-hover:rotate-12 transition-transform">
                        <Activity size={24} />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black">Nhật ký hoạt động</CardTitle>
                        <CardDescription>Theo dõi các thao tác gần đây</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-4">
                    <div className="space-y-3">
                      {(Array.isArray(activityLogs) ? activityLogs : []).slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px]">
                          <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground truncate">{log.details}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{log.username} · {new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                      {(!activityLogs || activityLogs.length === 0) && (
                        <p className="text-xs text-center py-8 text-muted-foreground italic">Chưa có nhật ký hoạt động nào.</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl font-bold text-xs uppercase border-sky-200 text-sky-600 hover:bg-sky-50"
                      onClick={() => setActiveTab('reports_activity')}
                    >
                      Xem tất cả nhật ký <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'about' && <AboutPage />}
        </main>
      </div>

      <AccountModal
        isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser!} accountForm={accountForm} setAccountForm={setAccountForm}
        onUpdate={handleUpdateAccount}
      />

      <ConfirmModal
        isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
        title={confirmDialog.title} message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm} type={confirmDialog.type}
      />
      <Toaster />
    </div>
  );
};

export default App;
