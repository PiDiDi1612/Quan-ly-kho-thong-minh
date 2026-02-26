import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, Package, ArrowUpRight, ArrowDownLeft, History, Plus,
  Search, AlertTriangle, X, Warehouse, FileText, Printer, Trash2,
  Edit2, Check, RefreshCcw, ArrowRightLeft, CheckCircle2, Minus,
  List, ChevronRight, Filter, ShoppingCart, HelpCircle, FileSpreadsheet,
  Download, Users, Settings, Activity, Shield, ListChecks, Save,
  AlertCircle, Info, Heart, Inbox, Moon, Sun, Eye, EyeOff,
  ClipboardList, Clock, Globe, LogOut
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmModal } from '@/components/ui/confirm-modal';
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
  const [modalError, setModalError] = useState<string | null>(null);

  const formatLocalDate = (dateStr?: string | number) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString('en-GB');
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
    }
  }, []);

  const [serverIp, setServerIp] = useState<string>('');

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
      const [matRes, txData, projData, budData, suppData, usersData, logsData, summaryData] = await Promise.all([
        materialService.listMaterials({}),
        transactionService.listTransactions({}),
        apiService.get<Project[]>('/api/projects').catch(() => []),
        apiService.get<OrderBudget[]>('/api/budgets').catch(() => []),
        supplierService.listSuppliers().catch(() => []),
        currentUser?.role === 'ADMIN' ? userService.listUsers().catch(() => []) : Promise.resolve([]),
        currentUser?.role === 'ADMIN' ? apiService.get<ActivityLog[]>('/api/activity_logs').catch(() => []) : Promise.resolve([]),
        apiService.get<any>('/api/dashboard/summary').catch(() => null)
      ]);

      setMaterials(Array.isArray(matRes) ? matRes : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      setProjects(Array.isArray(projData) ? projData : []);
      setBudgets(Array.isArray(budData) ? budData : []);
      setSuppliers(Array.isArray(suppData) ? suppData : []);
      setServerSummary(summaryData);

      (inventoryService as any).allTransactions = Array.isArray(txData) ? txData : [];
      (inventoryService as any).lastFetchTime = Date.now();
      (inventoryService as any).stockCache.clear();

      if (currentUser?.role === 'ADMIN') {
        const safeUsers = Array.isArray(usersData) ? usersData : [];
        setUsers(safeUsers);
        setActivityLogs(Array.isArray(logsData) ? logsData : []);
        const updatedSelf = currentUser ? safeUsers.find((u: User) => u.id === currentUser.id) : null;
        if (updatedSelf) setCurrentUser(updatedSelf);
      }
      setLastSync(new Date());
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      if (!isBackground) setIsSyncing(false);
    }
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

  useEffect(() => {
    if (!isAuthenticated) return;
    apiService.initSocket(debouncedLoadData);
    const interval = setInterval(() => loadData(true), 10000);
    return () => {
      clearInterval(interval);
      debouncedLoadData.cancel();
      apiService.disconnectSocket();
    };
  }, [isAuthenticated]);

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

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
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
      const nums = sameTypeTxs.map(t => parseInt(t.receiptId.split('/')[3], 10) || 0);
      nextNum = Math.max(...nums) + 1;
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

  const summary = useMemo(() => {
    const safeMaterials = Array.isArray(materials) ? materials : [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    // Always calculate local fallback even if serverSummary exists, to ensure properties like lowStockItems are present
    const lowStockMaterials = safeMaterials.filter(m => (parseNumber(m.quantity ?? 0)) <= (parseNumber(m.minThreshold ?? 0)));
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = safeTransactions.filter(t => t.date === today);

    const baseSummary = {
      totalItems: safeMaterials.length,
      lowStockCount: lowStockMaterials.length,
      lowStockItems: lowStockMaterials.slice(0, 5),
      todayIn: todayTxs.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + (t.quantity || 0), 0),
      todayOut: todayTxs.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + (t.quantity || 0), 0),
    };

    if (serverSummary) {
      return {
        ...baseSummary,
        ...serverSummary,
        // Ensure lowStockItems from server is an array, otherwise fallback to local
        lowStockItems: Array.isArray(serverSummary.lowStockItems) ? serverSummary.lowStockItems : baseSummary.lowStockItems,
        txCount: safeTransactions.length,
        mainItems: safeMaterials.filter(m => m.classification === 'Vật tư chính').length
      };
    }

    return baseSummary;
  }, [materials, transactions, serverSummary]);

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
      const data = await apiService.post<{ path: string }>('/api/backup', {});
      toast.success(`Đã sao lưu dữ liệu thành công ra Desktop!\nFile: ${data.path}`);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi sao lưu dữ liệu.');
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
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 shrink-0 bg-card border-b border-border flex items-center justify-between px-8 gap-6 z-20 backdrop-blur-md bg-card/80 sticky top-0">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-lg font-extrabold text-foreground tracking-tight whitespace-nowrap">
              {activeTab === 'dashboard' ? '📊 Dashboard' :
                activeTab === 'warehouse_inventory' ? 'Kho Vật Tư' :
                  activeTab === 'warehouse_receipt' ? 'Lập Phiếu Kho' :
                    activeTab === 'warehouse_transfer' ? 'Điều Chuyển' :
                      activeTab === 'supplier_management' ? 'Nhà Cung Cấp' :
                        activeTab === 'planning_projects' ? 'Dự Án' :
                          activeTab === 'planning_estimates' ? 'Dự Toán' :
                            activeTab === 'users' ? 'Người Dùng' : 'SmartStock'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-12 xl:col-span-7 shadow-sm">
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                          <AlertTriangle className="text-rose-500" size={20} /> Cảnh báo tồn kho thấp
                        </CardTitle>
                        <CardDescription>Danh sách vật tư cần nhập thêm ngay lập tức</CardDescription>
                      </div>
                      <Badge variant="destructive" className="font-black px-3 py-1 rounded-lg">{summary.lowStockCount} MỤC</Badge>
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
                      {(Array.isArray(transactions) ? transactions : []).slice(0, 5).map(t => (
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
                      ))}
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

          {(activeTab === 'reports_history' || activeTab === 'reports_activity') && (
            <ReportViewer transactions={transactions} activityLogs={activityLogs} materials={materials} currentUser={currentUser} onRefresh={loadData} initialTab={activeTab === 'reports_history' ? 'history' : 'activity'} />
          )}

          {activeTab === 'warehouse_receipt' && (
            <WarehouseReceipt
              materials={materials} budgets={budgets} suppliers={suppliers}
              receiptId={receiptId} setReceiptId={setReceiptId} receiptType={receiptType}
              setReceiptType={setReceiptType} receiptWorkshop={receiptWorkshop} setReceiptWorkshop={setReceiptWorkshop}
              receiptTime={receiptTime} setReceiptTime={setReceiptTime} receiptTimeDisplay={receiptTimeDisplay}
              setReceiptTimeDisplay={setReceiptTimeDisplay} receiptSupplier={receiptSupplier} setReceiptSupplier={setReceiptSupplier}
              selectedItems={selectedItems} setSelectedItems={setSelectedItems} orderCode={orderCode}
              setOrderCode={setOrderCode} handleCreateReceipt={handleCreateReceipt} modalError={modalError}
            />
          )}

          {activeTab === 'warehouse_transfer' && (
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
          )}

          {activeTab === 'supplier_management' && (
            <SupplierManagement suppliers={suppliers} currentUser={currentUser} onUpdate={loadData} />
          )}

          {activeTab === 'warehouse_merge' && (
            <MaterialMerge materials={materials} currentUser={currentUser} onUpdate={loadData} />
          )}

          {activeTab === 'planning_projects' && (
            <PlanningProjects currentUser={currentUser} onUpdate={loadData} />
          )}

          {activeTab === 'planning_estimates' && (
            <PlanningEstimates budgets={budgets} projects={projects} currentUser={currentUser} onUpdate={loadData} />
          )}

          {activeTab === 'users' && hasPermission('MANAGE_USERS') && (
            <UserManagement
              users={users} currentUser={currentUser}
              onUpdate={() => userService.listUsers().then(d => Array.isArray(d) && setUsers(d))}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center">
                <Settings size={48} className="text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold">Cài đặt hệ thống</h3>
                <p className="text-muted-foreground mb-6">Đang phát triển các tùy chỉnh bổ sung cho Expert WMS.</p>
                <Button variant="outline" onClick={handleBackup}>Sao lưu dữ liệu ngay</Button>
              </Card>
            </div>
          )}
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
    </div>
  );
};

export default App;
