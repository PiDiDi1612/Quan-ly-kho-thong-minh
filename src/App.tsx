import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Plus,
  Search,
  AlertTriangle,
  X,
  Warehouse,
  FileText,
  Printer,
  Trash2,
  Edit2,
  Check,
  RefreshCcw,
  ArrowRightLeft,
  CheckCircle2,
  Minus,
  List,
  ChevronRight,
  Filter,
  ShoppingCart,
  HelpCircle,
  FileSpreadsheet,
  Download,
  Users,
  Settings,
  Activity,
  Shield,
  ListChecks,
  Save,
  AlertCircle,
  Info,
  Heart,
  Inbox,
  Moon,
  Sun,
  Eye,
  EyeOff,
  ClipboardList,
  Clock,
  Globe
} from 'lucide-react';

import { Material, Transaction, TransactionType, WorkshopCode, OrderBudget, BudgetItem, UserRole, User, Permission, ActivityLog, Project } from '@/types';
import { CLASSIFICATIONS, WORKSHOPS, PERMISSIONS, ROLE_PERMISSIONS } from '@/constants';
import { inventoryService, transactionService, authService, userService, materialService, supplierService } from '@/domain';
import * as XLSX from 'xlsx-js-style';

import { io } from 'socket.io-client';
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
import { apiService } from './services/api';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from './hooks/useToast';
import { jwtDecode } from 'jwt-decode';
import {
  clearAuthSession,
  clearRememberedUsername,
  getAuthToken,
  getAuthUser,
  getRememberedUsername,
  hasRememberedLogin,
  setAuthSession,
  setRememberedUsername
} from './utils/authStorage';

// Socket instance (initialized dynamically)
let socket: any;



const App: React.FC = () => {
  const toast = useToast();
  // --- CONNECTION CONFIG ---
  const [connectionConfig, setConnectionConfig] = useState<{ mode: 'SERVER' | 'CLIENT' | null, serverIp: string }>(() => {
    const saved = localStorage.getItem('connection_config');
    if (saved) return JSON.parse(saved);
    return { mode: null, serverIp: '' };
  });



  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('GUEST');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>(''); // Start with empty token - no auto-login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isConnectionSetupOpen, setIsConnectionSetupOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Remember Me state
  const [rememberMe, setRememberMe] = useState(false);

  // Init rememberMe state based on stored username
  useEffect(() => {
    const storedUsername = getRememberedUsername();
    if (storedUsername) {
      setRememberMe(true);
      setLoginForm(prev => ({ ...prev, username: storedUsername }));
    }
  }, []);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Budgets moved to OrderManagement
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<OrderBudget[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]); // Danh sách NCC
  const [modalError, setModalError] = useState<string | null>(null);

  // Helper for date formatting dd/mm/yyyy
  const formatLocalDate = (dateStr?: string | number) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString('en-GB'); // Formats as dd/mm/yyyy
  };

  const formatNumber = (val: number | string | undefined): string => {
    if (val === null || val === undefined) return '0,00';
    const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
    return isNaN(num) ? '0,00' : num.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [serverSummary, setServerSummary] = useState<any>(null);

  // --- UI STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAuthToken('');
    }
  }, []);

  // --- SYSTEM INFO ---
  const [serverIp, setServerIp] = useState<string>('');

  useEffect(() => {
    // Always try to fetch IP info (server or client connected)
    const fetchIp = async () => {
      try {
        const data = await apiService.get<{ ip: string }>('/api/system-info');
        if (data && data.ip) {
          setServerIp(data.ip);
        }
      } catch (error) {
        // Fallback or keep previous value
      }
    };

    fetchIp();
  }, [connectionConfig.mode, isAuthenticated]);

  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const loadData = async (isBackground = false) => {
    if (isSyncing && !isBackground) return;
    if (!isBackground) setIsSyncing(true);

    const maxRetries = 2;
    let attempt = 0;

    const performLoad = async () => {
      try {
        // Parallel load all essential data
        const [
          matRes,
          transactionsData,
          projectsData,
          budgetsData,
          suppliersData,
          usersData,
          logsData,
          summaryData
        ] = await Promise.all([
          materialService.listMaterials({}),
          transactionService.listTransactions({}),
          apiService.get<Project[]>('/api/projects').catch(() => []),
          apiService.get<OrderBudget[]>('/api/budgets').catch(() => []),
          supplierService.listSuppliers().catch(() => []),
          currentUser?.role === 'ADMIN' ? userService.listUsers().catch(() => []) : Promise.resolve([]),
          currentUser?.role === 'ADMIN' ? apiService.get<ActivityLog[]>('/api/activity_logs').catch(() => []) : Promise.resolve([]),
          apiService.get<any>('/api/dashboard/summary').catch(() => null)
        ]);

        setMaterials(matRes);
        setTransactions(transactionsData);
        setProjects(projectsData);
        setBudgets(budgetsData);
        setSuppliers(suppliersData);
        setServerSummary(summaryData);

        // Load transactions into InventoryService
        (inventoryService as any).allTransactions = transactionsData;
        (inventoryService as any).lastFetchTime = Date.now();
        (inventoryService as any).stockCache.clear();

        if (currentUser?.role === 'ADMIN') {
          setUsers(usersData);
          setActivityLogs(logsData);
          if (currentUser) {
            const updatedSelf = usersData.find((u: User) => u.id === currentUser.id);
            if (updatedSelf) setCurrentUser(updatedSelf);
          }
        }

        setLastSync(new Date());
        setIsFirstLoad(false);
        return true;
      } catch (error) {
        console.error("Failed to load data", error);
        return false;
      }
    };

    let success = await performLoad();
    while (!success && attempt < maxRetries) {
      attempt++;
      console.log(`Retrying data load... Attempt ${attempt}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      success = await performLoad();
    }

    if (!isBackground) setIsSyncing(false);
  };

  // Helper to parse numbers from string inputs (supports comma and dot)
  const parseNumber = (val: string | number | undefined): number => {
    if (val === undefined || val === '' || val === null) return 0;
    if (typeof val === 'number') return val;
    // Replace comma with dot
    const cleanVal = val.toString().replace(/,/g, '.');
    const floatVal = parseFloat(cleanVal);
    // Return 0 if NaN, otherwise round to 2 decimals
    return isNaN(floatVal) ? 0 : Math.round(floatVal * 100) / 100;
  };



  const [tempIp, setTempIp] = useState('');

  const handleSaveConnection = (mode: 'SERVER' | 'CLIENT', ip?: string) => {
    // Delegates to apiService
    apiService.setConfig(mode, ip || '');
    window.location.reload();
  };

  useEffect(() => {
    if (!connectionConfig.mode) return;
    const username = getRememberedUsername();
    if (username) {
      setLoginForm(prev => ({ ...prev, username }));
    }
  }, [connectionConfig.mode]);

  // Use debounce to prevent React from firing loadData thousands of times during bulk excel imports
  const debouncedLoadData = useMemo(() => debounce(() => {
    loadData(true);
  }, 1000, { leading: false, trailing: true }), [isSyncing, connectionConfig.mode]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // We pass debouncedLoadData as callback, but need to be careful with stale closure if loadData uses stale scope.
    // However, apiService handles data_updated event.
    apiService.initSocket(debouncedLoadData); // isBackground=true

    // Poll every 10 seconds to keep data synced
    const interval = setInterval(() => loadData(true), 10000);

    return () => {
      clearInterval(interval);
      debouncedLoadData.cancel();
      apiService.disconnectSocket();
    };
  }, [isAuthenticated, connectionConfig.mode]);

  // Token expiry check - auto-logout when JWT expires
  // Token expiry check - auto-logout when JWT expires
  useEffect(() => {
    if (!isAuthenticated || !authToken) return;

    const checkTokenExpiry = () => {
      if (authService.isTokenExpired(authToken)) {
        // Token expired
        authService.logout(); // Ensure storage is cleared
        setIsAuthenticated(false);
        setAuthToken('');
        setCurrentUser(null);
        toast.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    };

    // Check immediately on mount
    checkTokenExpiry();

    // Then check every minute
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, authToken, toast]);


  // --- NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');


  // --- MODALS STATE ---

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; type: 'danger' | 'info'; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });

  // --- FORM STATES ---

  const [receiptType, setReceiptType] = useState<TransactionType>(TransactionType.OUT);
  const [receiptWorkshop, setReceiptWorkshop] = useState<WorkshopCode>('OG');
  const [receiptSearchWorkshop, setReceiptSearchWorkshop] = useState<WorkshopCode | 'ALL'>('ALL');
  const [receiptSearchClass, setReceiptSearchClass] = useState<'ALL' | 'Vật tư chính' | 'Vật tư phụ'>('ALL');
  const [orderCode, setOrderCode] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [receiptSupplier, setReceiptSupplier] = useState('');
  const [receiptTime, setReceiptTime] = useState('');
  const [receiptTimeDisplay, setReceiptTimeDisplay] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ materialId: string, quantity: number }[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');



  // Budget state moved to OrderManagement

  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopCode>('OG');
  // ordersWorkshopFilter moved to OrderManagement





  const [accountForm, setAccountForm] = useState<AccountForm>({
    currentPassword: '', newPassword: '', confirmPassword: '', fullName: '', email: ''
  });


  // Tự động tạo mã phiếu khi chuyển tab hoặc khi receiptType/receiptWorkshop thay đổi
  useEffect(() => {
    if (activeTab === 'warehouse_receipt') {
      setReceiptId(generateReceiptId(receiptType, receiptWorkshop));

      // Init Date
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setReceiptTime(`${yyyy}-${mm}-${dd}`);
      setReceiptTimeDisplay(`${dd}/${mm}/${yyyy}`);

      setReceiptSupplier('');
    }
  }, [activeTab, receiptType, receiptWorkshop]);

  // --- LOGIC ---

  // Hàm tính toán mã phiếu tự động dựa trên dữ liệu hiện có
  const generateReceiptId = (type: TransactionType, workshop: WorkshopCode) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = type === TransactionType.IN ? 'PNK' : type === TransactionType.OUT ? 'PXK' : 'PDC';

    // Tìm các giao dịch cùng loại, xưởng và năm hiện tại
    const sameTypeTxs = transactions.filter(t =>
      t.receiptId.startsWith(`${prefix}/${workshop}/${year}/`)
    );

    let nextNum = 1;
    if (sameTypeTxs.length > 0) {
      // Trich xuat phan s tu ma phieu (index 3 sau khi split '/')
      const nums = sameTypeTxs.map(t => {
        const parts = t.receiptId.split('/');
        return parseInt(parts[3], 10) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }

    const paddedCount = nextNum.toString().padStart(5, '0');
    return `${prefix}/${workshop}/${year}/${paddedCount}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = loginForm.username.trim().toLowerCase();
    const p = loginForm.password.trim();

    try {
      // Ensure authService has the correct URL before login
      // authService now uses apiService which handles baseUrl automatically

      const response = await authService.login(u, p, rememberMe);

      if (!response.success) {
        setLoginError('Thông tin đăng nhập không chính xác hoặc tài khoản đã bị vô hiệu hóa');
        setTimeout(() => setLoginError(null), 3000);
        return;
      }

      const { user, token } = response;

      setAuthToken(token);
      // authService.login already saves session based on rememberMe flag

      // Handle remember username explicitly
      if (rememberMe) {
        setRememberedUsername(u);
      } else {
        clearRememberedUsername();
      }

      setCurrentUser(user);
      setUserRole(user.role);
      setIsAuthenticated(true);

      setLoginError(null);
    } catch (error) {
      console.error(error);
      setLoginError('Không thể kết nối máy chủ.');
      setTimeout(() => setLoginError(null), 3000);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setAuthToken('');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Helper function to log activities
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
    setActivityLogs(prev => [newLog, ...prev]);

    // Use apiService directly
    apiService.post('/api/activity_logs/save', newLog).catch(e => console.error("Log failed", e));
  };

  // Helper function to check permissions
  // Helper function to check permissions
  const hasPermission = (permission: Permission): boolean => {
    return authService.hasPermission(currentUser, permission);
  };

  const canModify = hasPermission('MANAGE_WAREHOUSE');

  const summary = useMemo(() => {
    // If server has already calculated summary, use it for speed
    if (serverSummary) {
      return {
        ...serverSummary,
        txCount: transactions.length, // local count based on limit
        mainItems: materials.filter(m => m.classification === 'Vật tư chính').length
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date === today);
    const todayIn = todayTransactions.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + t.quantity, 0);
    const todayOut = todayTransactions.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + t.quantity, 0);

    // Dữ liệu cho biểu đồ xưởng
    const workshopData = WORKSHOPS.map(w => ({
      name: w.code,
      total: materials.filter(m => m.workshop === w.code).length,
      quantity: materials.filter(m => m.workshop === w.code).reduce((sum, m) => sum + m.quantity, 0)
    }));

    // Dữ liệu cho biểu đồ hoạt động (7 ngày gần nhất)
    const activityData = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const txs = transactions.filter(t => t.date === dateStr);
      return {
        name: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        inCount: txs.filter(t => t.type === TransactionType.IN).length,
        outCount: txs.filter(t => t.type === TransactionType.OUT).length
      };
    });

    return {
      totalItems: materials.length,
      lowStockItems: materials.filter(m => m.quantity <= m.minThreshold),
      lowStockCount: materials.filter(m => m.quantity <= m.minThreshold).length,
      mainItems: materials.filter(m => m.classification === 'Vật tư chính').length,
      txCount: transactions.length,
      todayIn,
      todayOut,
      workshopData,
      activityData
    };
  }, [materials, transactions, serverSummary]);





  // Hàm tạo mã vật tư tự động theo định dạng VT/Xưởng/00001
  const generateMaterialId = (workshop: WorkshopCode) => {
    const sameWorkshopMaterials = materials.filter(m => m.workshop === workshop && m.id.startsWith(`VT/${workshop}/`));
    let nextNum = 1;
    if (sameWorkshopMaterials.length > 0) {
      const nums = sameWorkshopMaterials.map(m => {
        const parts = m.id.split('/');
        return parseInt(parts[2], 10) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const paddedCount = nextNum.toString().padStart(5, '0');
    return `VT/${workshop}/${paddedCount}`;
  };

  const requestConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'info') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type });
  };



  const quickRestock = (material: Material) => {
    setReceiptType(TransactionType.IN);
    setReceiptWorkshop(material.workshop);
    setSelectedItems([{ materialId: material.id, quantity: material.minThreshold * 2 }]);
    setIsReceiptModalOpen(true);
  };

  const handleCreateReceipt = () => {
    if (selectedItems.length === 0) return;

    requestConfirm('Xác nhận lập phiếu', `Hệ thống sẽ ${receiptType === 'IN' ? 'Nhập' : 'Xuất'} hàng vào kho ${receiptWorkshop}.`, async () => {
      const finalReceiptId = receiptId.trim() || generateReceiptId(receiptType, receiptWorkshop);
      try {
        const result = await transactionService.createBatchReceipt({
          receiptId: finalReceiptId,
          receiptType: receiptType as TransactionType,
          receiptWorkshop: receiptWorkshop as WorkshopCode,
          receiptTime: receiptTime || new Date().toISOString().split('T')[0],
          receiptSupplier: receiptSupplier || undefined,
          orderCode: orderCode || undefined,
          user: currentUser?.fullName || userRole,
          items: selectedItems.map(item => ({
            materialId: item.materialId,
            quantity: parseNumber(item.quantity)
          }))
        });

        if (!result.success) {
          setModalError(result.error || 'Lưu phiếu thất bại');
          return;
        }

        await loadData();
        logActivity(`Lập phiếu ${receiptType === 'IN' ? 'Nhập' : 'Xuất'} ${finalReceiptId}`, 'TRANSACTION', finalReceiptId);
        setActiveTab('warehouse_inventory');
        setModalError(null);
        setSelectedItems([]);
        setOrderCode('');
        setReceiptId('');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        toast.success(`Phiếu ${finalReceiptId} đã được tạo thành công!`);
      } catch (err: any) {
        console.error("Lỗi đồng bộ backend:", err);
        setModalError(err.message || 'Không thể lưu phiếu. Vui lòng thử lại.');
      }
    });
  };




  const {
    transferForm,
    setTransferForm,
    handleTransfer,
    receiptSearchClass: transferSearchClass,
    setReceiptSearchClass: setTransferSearchClass
  } = useWarehouseTransfer({
    transactions,
    currentUser,
    userRole,
    activeTab,
    loadData,
    logActivity,
    setActiveTab,
    requestConfirm,
    setModalError,
    closeConfirmDialog: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  });

  const handleDeleteTransaction = (tx: Transaction) => {
    requestConfirm(
      'Xóa phiếu giao dịch',
      `Bạn có chắc chắn muốn xóa phiếu ${tx.receiptId}? Tồn kho sẽ được hoàn tác tự động.`,
      async () => {
        try {
          await transactionService.deleteTransaction(tx.id, currentUser?.id || 'SYSTEM');
          await loadData();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          toast.success(`Đã xóa phiếu ${tx.receiptId} và hoàn tác tồn kho.`);
        } catch (e: any) {
          console.error(e);
          toast.error(e.message || 'Xóa giao dịch thất bại');
        }
      },
      'danger'
    );
  };
  const handleUpdateAccount = () => {
    if (!accountForm.currentPassword) {
      toast.warning('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (accountForm.newPassword && accountForm.newPassword !== accountForm.confirmPassword) {
      toast.warning('Mật khẩu mới và xác nhận không khớp.');
      return;
    }

    userService.updateCurrentUser({
      fullName: accountForm.fullName || currentUser?.fullName || '',
      email: accountForm.email || currentUser?.email || '',
      currentPassword: accountForm.currentPassword,
      newPassword: accountForm.newPassword || undefined
    })
      .then(updated => {
        setCurrentUser(updated);
        setAuthSession(authToken, updated);
        setUsers(prev => prev.map(u => (u.id === updated.id ? { ...u, ...updated } : u)));
        logActivity('Cập nhật thông tin tài khoản', 'USER', updated.id);
        setIsAccountModalOpen(false);
        setAccountForm({ currentPassword: '', newPassword: '', confirmPassword: '', fullName: updated.fullName || '', email: updated.email || '' });
        toast.success('Cập nhật thông tin thành công!');
      })
      .catch(err => {
        console.error(err);
        toast.error(err.message || 'Không thể cập nhật tài khoản.');
      });
  };

  const handleBackup = async () => {
    try {
      const data = await apiService.post<{ path: string }>('/api/backup', {});
      toast.success(`Đã sao lưu dữ liệu thành công ra Desktop!\nFile: ${data.path}`);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi sao lưu dữ liệu.');
    }
  };
  // --- RENDER LOGIN ---
  if (!isAuthenticated) {
    return (
      <>
        <Toaster />
        <AuthScreen
          isConnectionSetupOpen={isConnectionSetupOpen}
          setIsConnectionSetupOpen={setIsConnectionSetupOpen}
          handleSaveConnection={handleSaveConnection}
          tempIp={tempIp}
          setTempIp={setTempIp}
          handleLogin={handleLogin}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          loginError={loginError}
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950 font-inter text-foreground selection:bg-emerald-100 selection:text-emerald-700">
      <Toaster />
      {/* SIDEBAR */}
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasPermission={hasPermission}
        currentUser={currentUser}
        userRole={userRole}
        onLogout={handleLogout}
        onOpenAccount={() => setIsAccountModalOpen(true)}
      />

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* HEADER 64px */}
        <header className="h-16 shrink-0 bg-card border-b border-border flex items-center justify-between px-6 gap-4 z-10">
          {/* Left: page title */}
          <h2 className="text-base font-semibold text-foreground tracking-tight whitespace-nowrap shrink-0">
            {activeTab === 'dashboard' ? '📊 Tổng quan' :
              activeTab === 'warehouse_inventory' ? 'Danh Sách Vật Tư' :
                activeTab === 'warehouse_transfer' ? 'Điều Chuyển Vật Tư' :
                  activeTab === 'warehouse_receipt' ? 'Lập Phiếu Kho' :
                    activeTab === 'supplier_management' ? 'Quản Lý NCC' :
                      activeTab === 'warehouse_history' ? 'Lịch Sử Giao Dịch' :
                        activeTab === 'warehouse_merge' ? 'Bóc Tách Vật Tư' :
                          activeTab === 'planning_projects' ? 'Cấu Hình Dự Án' :
                            activeTab === 'planning_estimates' ? 'Lập Dự Toán' :
                              activeTab === 'reports_history' ? 'Lịch Sử GD' :
                                activeTab === 'reports_activity' ? 'Nhật Ký HĐ' :
                                  activeTab === 'users' ? 'Quản Lý Người Dùng' : 'SmartStock'}
          </h2>

          {/* Center: Global Search */}
          <div className="flex-1 max-w-md hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Tìm kiếm vật tư, mã dự án..."
              className="pl-9 h-9 bg-muted/60 border-0 rounded-full focus-visible:ring-1 focus-visible:ring-primary text-sm"
            />
          </div>

          {/* Right: user + theme + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
              <Clock size={13} />
              {currentTime.toLocaleTimeString('vi-VN')}
            </div>

            {/* User info */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-muted/60">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                {currentUser?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-foreground">{currentUser?.fullName || 'Người dùng'}</p>
                <p className="text-[10px] text-muted-foreground">{userRole}</p>
              </div>
            </div>

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </Button>

            {/* Account */}
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setIsAccountModalOpen(true)}>
              <Settings size={17} />
            </Button>

            {/* Logout */}
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <X size={17} />
            </Button>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-up">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'TỔNG VẬT TƯ',
                    value: summary.totalItems,
                    icon: Package,
                    description: 'Loại vật tư đang quản lý',
                    accent: 'text-primary',
                    iconBg: 'bg-primary/10 text-primary',
                  },
                  {
                    label: 'NHẬP HÔM NAY',
                    value: summary.todayIn,
                    icon: ArrowDownLeft,
                    description: 'Tổng số lượng nhập kho',
                    accent: 'text-emerald-600 dark:text-emerald-400',
                    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    label: 'XUẤT HÔM NAY',
                    value: summary.todayOut,
                    icon: ArrowUpRight,
                    description: 'Tổng số lượng xuất kho',
                    accent: 'text-orange-600 dark:text-orange-400',
                    iconBg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                  },
                  {
                    label: 'CẢNH BÁO TỒN',
                    value: summary.lowStockCount,
                    icon: AlertTriangle,
                    description: 'Cần bổ sung ngay',
                    accent: 'text-destructive',
                    iconBg: 'bg-destructive/10 text-destructive',
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-2xl p-6 border border-border border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.iconBg} group-hover:scale-105 transition-transform duration-200`}>
                        <stat.icon size={26} />
                      </div>
                    </div>
                    <p className={`text-4xl font-semibold tabular-nums ${stat.accent} mb-1`}>{stat.value}</p>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cảnh báo tồn kho thấp */}
                <div className="neo-card-static p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Cảnh báo tồn kho thấp</h3>
                    <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 px-3 py-1 rounded-full">{summary.lowStockCount} mục</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[280px]">
                    {summary.lowStockItems.length > 0 ? (
                      <div className="w-full space-y-2">
                        {summary.lowStockItems.map(m => (
                          <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 group transition-all hover:border-emerald-200 dark:hover:border-emerald-500/20 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0">
                              <AlertTriangle size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">{m.name}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{m.workshop} · Tồn: <span className="text-red-500 dark:text-red-400 font-bold">{formatNumber(m.quantity)} {m.unit}</span></p>
                            </div>
                            {canModify && (
                              <button onClick={() => quickRestock(m)} className="p-2 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"><ShoppingCart size={14} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3">
                        <AlertTriangle size={48} className="text-slate-200 dark:text-slate-700" />
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Không có cảnh báo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Giao dịch gần đây */}
                <div className="neo-card-static p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Giao dịch gần đây</h3>
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 rounded-full">{transactions.slice(0, 5).length} giao dịch</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {transactions.slice(0, 5).map(t => (
                      <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-sky-50/30 dark:hover:bg-sky-500/5 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${t.type === TransactionType.IN ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400' : t.type === TransactionType.OUT ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                            {t.type === TransactionType.IN ? <ArrowDownLeft size={18} /> : t.type === TransactionType.OUT ? <ArrowUpRight size={18} /> : <ArrowRightLeft size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">{t.materialName}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t.date} · {t.receiptId}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-base font-bold tabular-nums ${t.type === TransactionType.IN ? 'text-green-600 dark:text-green-400' : t.type === TransactionType.OUT ? 'text-red-600 dark:text-red-400' : 'text-sky-600 dark:text-sky-400'}`}>
                              {t.type === TransactionType.IN ? '+' : '-'}{formatNumber(t.quantity)}
                            </p>
                            <p className={`text-[10px] font-bold uppercase ${t.type === TransactionType.IN ? 'text-green-500' : t.type === TransactionType.OUT ? 'text-red-500' : 'text-sky-500'}`}>
                              {t.type === TransactionType.IN ? 'NHẬP' : t.type === TransactionType.OUT ? 'XUẤT' : 'CHUYỂN'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3 py-12">
                        <History size={48} />
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Chưa có giao dịch</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'warehouse_inventory' && (
            <MaterialManagement
              materials={materials}
              transactions={transactions}
              currentUser={currentUser}
              onUpdate={() => {
                // Refresh data logic
                loadData();
              }}
              canManage={hasPermission('MANAGE_WAREHOUSE')}
            />
          )}

          {(activeTab === 'reports_history' || activeTab === 'reports_activity') && (
            <ReportViewer
              transactions={transactions}
              activityLogs={activityLogs}
              materials={materials}
              currentUser={currentUser}
              onRefresh={loadData}
              initialTab={activeTab === 'reports_history' ? 'history' : 'activity'}
            />
          )}

          {activeTab === 'users' && hasPermission('MANAGE_USERS') && (
            <UserManagement
              users={users}
              currentUser={currentUser}
              onUpdate={() => {
                // Refresh users data
                userService.listUsers().then(data => {
                  if (Array.isArray(data)) setUsers(data);
                });
              }}
            />
          )}

          {activeTab === 'credits' && (
            <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm min-h-[600px] relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700"></div>
              <div className="max-w-4xl w-full text-center space-y-12 relative z-10 text-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-2xl shadow-sm mb-2 animate-bounce">
                    <Heart size={48} fill="currentColor" />
                  </div>
                  <div>
                    <h2 className="text-5xl font-extrabold tracking-tighter uppercase leading-tight text-slate-800 dark:text-white">
                      Smart<span className="text-red-600 dark:text-red-500">Stock</span>
                    </h2>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] mt-2">Professional Warehouse Management</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  {/* Card 1: Info */}
                  {/* Card 1: Info */}
                  <div className="bg-slate-50 dark:bg-[#0f172a] p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all group duration-300">
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                      <div className="w-1 h-5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></div>
                      Thông tin phát triển
                    </h3>
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-[#1e293b] rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
                          <Users size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Tác giả & Ý tưởng</p>
                          <p className="text-lg font-extrabold text-slate-800 dark:text-white">Phạm Đức Duy</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-[#1e293b] rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 shadow-sm border border-slate-100 dark:border-slate-700">
                          <Info size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Phiên bản hiện tại</p>
                          <p className="text-lg font-extrabold text-slate-800 dark:text-white">v3.7.0 <span className="text-emerald-600 dark:text-emerald-400 text-sm">PRO PREMIUM</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Gratitude */}
                  <div className="bg-slate-50 dark:bg-[#0f172a] p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-500">
                      <Warehouse size={160} />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <div className="w-1 h-5 bg-emerald-600 dark:bg-emerald-500 rounded-full"></div>
                        Lời tri ân
                      </h3>
                      <p className="text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        "Ứng dụng này được xây dựng bởi <span className="font-extrabold text-slate-800 dark:text-white">Phạm Đức Duy</span> với niềm đam mê dành tặng riêng cho các anh chị em bộ phận <span className="font-extrabold text-slate-800 dark:text-white uppercase italic">Kho - HL Windows</span>.
                        <br /><br />
                        Chúc mọi người luôn mạnh khỏe, hạnh phúc và thành công trên mọi chặng đường."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Designed & Developed with ❤️ for You</p>
                  <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase mt-4">Copyright © 2026 SmartStock. All Rights Reserved.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'warehouse_transfer' && (
            <WarehouseTransfer
              materials={materials}
              transferForm={transferForm}
              setTransferForm={setTransferForm}
              modalError={modalError}
              handleTransfer={handleTransfer}
              formatNumber={formatNumber}
              parseNumber={parseNumber}
              receiptSearchClass={transferSearchClass}
              setReceiptSearchClass={setTransferSearchClass}
            />
          )}

          {activeTab === 'warehouse_receipt' && (
            <WarehouseReceipt
              receiptType={receiptType}
              setReceiptType={setReceiptType}
              receiptWorkshop={receiptWorkshop}
              setReceiptWorkshop={setReceiptWorkshop}
              receiptId={receiptId}
              setReceiptId={setReceiptId}
              receiptTimeDisplay={receiptTimeDisplay}
              setReceiptTimeDisplay={setReceiptTimeDisplay}
              receiptTime={receiptTime}
              setReceiptTime={setReceiptTime}
              orderCode={orderCode}
              setOrderCode={setOrderCode}
              receiptSupplier={receiptSupplier}
              setReceiptSupplier={setReceiptSupplier}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              materials={materials}
              budgets={budgets}
              receiptSearchWorkshop={receiptSearchWorkshop}
              setReceiptSearchWorkshop={setReceiptSearchWorkshop}
              receiptSearchClass={receiptSearchClass}
              setReceiptSearchClass={setReceiptSearchClass}
              materialSearch={materialSearch}
              setMaterialSearch={setMaterialSearch}
              modalError={modalError}
              suppliers={suppliers}
              handleCreateReceipt={handleCreateReceipt}
              requestConfirm={requestConfirm}
              formatNumber={formatNumber}
              parseNumber={parseNumber}
            />
          )}

          {activeTab === 'warehouse_customers' && (
            <SupplierManagement
              onUpdate={loadData}
            />
          )}

          {activeTab === 'warehouse_history' && (
            <TransactionHistory
              transactions={transactions}
              materials={materials}
              currentUser={currentUser}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'warehouse_merge' && (
            <MaterialMerge
              materials={materials}
              onUpdate={loadData}
            />
          )}

          {activeTab === 'planning_projects' && (
            <PlanningProjects
              projects={projects}
              currentUser={currentUser}
              onUpdate={loadData}
            />
          )}

          {activeTab === 'planning_estimates' && (
            <PlanningEstimates
              budgets={budgets}
              projects={projects}
              materials={materials}
              transactions={transactions}
              currentUser={currentUser}
              onUpdate={loadData}
            />
          )}
        </main>
      </div>

      {/* CONFIRM DIALOG */}
      {
        confirmDialog.isOpen && (
          <div className="print:hidden fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6 modal-backdrop transition-all duration-200">
            <div className="w-full max-w-sm bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
              <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-2xl ${confirmDialog.type === 'danger' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                {confirmDialog.type === 'danger' ? <AlertTriangle size={32} /> : <HelpCircle size={32} />}
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{confirmDialog.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">Hủy</button>
                <button onClick={confirmDialog.onConfirm} className={`flex-1 py-3 text-white font-bold rounded-xl text-sm shadow-md transition-all ${confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Xác nhận</button>
              </div>
            </div>
          </div>
        )
      }








      {/* MODAL: BUDGET OVERHAUL */}
      {/* Budget Modal moved to OrderManagement */}

      {/* MODAL: USER MANAGEMENT */}


      {/* MODAL: ACCOUNT MANAGEMENT */}
      <AccountModal
        isOpen={isAccountModalOpen}
        currentUser={currentUser}
        modalError={modalError}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        isServerMode={connectionConfig.mode === 'SERVER'}
        onClose={() => setIsAccountModalOpen(false)}
        onBackup={handleBackup}
        onUpdate={handleUpdateAccount}
      />
      {/* MODAL: EXCEL IMPORT */}

      {/* Debug Panel - Feature Flags (Development Only) */}

    </div >
  );
};

export default App;
