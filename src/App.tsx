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
import { NotificationBell } from './components/NotificationBell';
import { apiService } from './services/api';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useAppConfig } from './hooks/useAppConfig';
import { useSocket } from './hooks/useSocket';
import { useBackup } from './hooks/useBackup';
import { useAppData } from './hooks/useAppData';
import { useTabNavigation } from './hooks/useTabNavigation';
import { useAppModals } from './hooks/useAppModals';
import {
  setAuthSession
} from './utils/authStorage';

const App: React.FC = () => {
  const toast = useToast();
  const {
    isAuthenticated, userRole, currentUser, setCurrentUser,
    authToken, setAuthToken, loginForm, setLoginForm, showPassword, setShowPassword,
    loginError, setLoginError, rememberMe, setRememberMe, handleLogin, handleLogout, hasPermission
  } = useAuth();

  const {
    connectionConfig, serverIp, theme, setTheme, currentTime, handleSaveConnection
  } = useAppConfig(isAuthenticated);

  const {
    backups, isBackingUp, fetchBackups, handleTriggerServerBackup, handleRestoreBackup
  } = useBackup(isAuthenticated, (title, msg, onConf, type) => {
    requestConfirm(title, msg, onConf, type || 'info');
  });

  // --- CONNECTION CONFIG ---

  const {
    materials, setMaterials, transactions, setTransactions, users, setUsers,
    activityLogs, setActivityLogs, projects, setProjects, budgets, setBudgets,
    suppliers, setSuppliers, isSyncing, serverSummary, setServerSummary,
    pendingApprovalCount, setPendingApprovalCount, loadData, debouncedLoadData, parseNumber
  } = useAppData(currentUser, setCurrentUser, isAuthenticated);

  useSocket(isAuthenticated, debouncedLoadData);

  const { activeTab, setActiveTab } = useTabNavigation('dashboard');

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

  const {
    isReceiptModalOpen, setIsReceiptModalOpen, isTransferModalOpen, setIsTransferModalOpen,
    isAccountModalOpen, setIsAccountModalOpen, confirmDialog, setConfirmDialog,
    receiptType, setReceiptType, receiptWorkshop, setReceiptWorkshop, receiptId, setReceiptId,
    receiptSupplier, setReceiptSupplier, receiptTime, setReceiptTime, receiptTimeDisplay, setReceiptTimeDisplay,
    selectedItems, setSelectedItems, orderCode, setOrderCode, accountForm, setAccountForm,
    modalError, setModalError, generateReceiptId, requestConfirm, quickRestock,
    handleCreateReceipt, handleUpdateAccount, handleBackup, handleSaveInventoryCheck
  } = useAppModals({
    transactions, currentUser, setCurrentUser, userRole, isAuthenticated,
    activeTab, setActiveTab, loadData, logActivity, authToken, parseNumber
  });

  const [isConnectionSetupOpen, setIsConnectionSetupOpen] = useState(false);
  const [tempIp, setTempIp] = useState('');

  // --- UI STATE ---
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);


  useEffect(() => {
    if (activeTab === 'settings' && isAuthenticated) {
      fetchBackups();
    }
  }, [activeTab, isAuthenticated, fetchBackups]);





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


  const { transferForm, setTransferForm, handleTransfer, receiptSearchClass, setReceiptSearchClass } = useWarehouseTransfer({
    transactions, currentUser, userRole, activeTab, loadData, logActivity, setActiveTab, requestConfirm, setModalError,
    closeConfirmDialog: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  });

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
            <h2 className="page-title">
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
            <div className="hidden lg:flex items-center bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 rounded-xl h-10 px-1 gap-0 shadow-sm">
              <div className="flex items-center px-3 border-r border-sky-200/60 dark:border-sky-700/50 h-full">
                <span className="text-lg font-black text-sky-700 dark:text-sky-300 tabular-nums tracking-tight leading-none">
                  {currentTime.toLocaleTimeString('vi-VN', { hour12: false })}
                </span>
              </div>
              <div className="flex flex-col items-start px-3 leading-none justify-center">
                <span className="text-[9px] font-black text-sky-500 dark:text-sky-400 uppercase tracking-wider">
                  {currentTime.toLocaleDateString('vi-VN', { weekday: 'long' }).toUpperCase()}
                </span>
                <span className="text-[11px] font-extrabold text-sky-700 dark:text-sky-300 tabular-nums">
                  {currentTime.toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-border mx-1 hidden lg:block"></div>

            <div className="hidden lg:flex flex-col items-end leading-none mr-2">
              <span className="data-label text-muted-foreground">Server IP</span>
              <span className="text-sm font-bold text-foreground tabular-nums">{serverIp || 'Local'}</span>
            </div>

            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-muted-foreground hover:text-emerald-600 transition-all" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            <div className="h-8 w-px bg-border mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-3 pl-2">
              <NotificationBell currentUser={currentUser} />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-foreground leading-none mb-1">{currentUser?.fullName || 'User'}</p>
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
                        <p className="data-label text-muted-foreground">{stat.label}</p>
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
                  <CardTitle className="section-title flex items-center gap-2">
                    <Activity className="text-emerald-600" size={20} /> Tổng quan nhập xuất 7 ngày gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[280px] mt-4">
                  <ResponsiveContainer width="100%" height="100%" debounce={100}>
                    <AreaChart data={last7DaysData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
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
                        <CardTitle className="section-title flex items-center gap-2">
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
                    <CardTitle className="section-title flex items-center gap-2">
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
            <RequireRole role={userRole} allowedRoles={['ADMIN', 'WAREHOUSE']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
              <ApprovalQueue onUpdate={loadData} canApprove={userRole === 'ADMIN'} userRole={userRole} />
            </RequireRole>
          )}

          {(activeTab === 'reports_history' || activeTab === 'reports_activity' || activeTab === 'reports_inventory') && (
            <RequireRole role={userRole} allowedRoles={['ADMIN']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập báo cáo</div>}>
              <ReportViewer
                transactions={transactions}
                activityLogs={activityLogs}
                materials={materials}
                currentUser={currentUser}
                onRefresh={loadData}
                onBack={() => setActiveTab('settings')}
                initialTab={activeTab === 'reports_history' ? 'history' : activeTab === 'reports_activity' ? 'activity' : 'inventory'}
              />
            </RequireRole>
          )}

          {activeTab === 'warehouse_receipt' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN', 'WAREHOUSE']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
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
                canManage={canModify}
              />
            </RequireRole>
          )}

          {activeTab === 'warehouse_transfer' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN', 'WAREHOUSE']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
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
                canManage={canModify}
              />
            </RequireRole>
          )}

          {activeTab === 'supplier_management' && (
            <SupplierManagement suppliers={suppliers} currentUser={currentUser} onUpdate={loadData} canManage={hasPermission('MANAGE_SUPPLIERS')} />
          )}

          {activeTab === 'warehouse_merge' && (
            <RequireRole role={userRole} allowedRoles={['ADMIN']} fallback={<div className="p-8 text-center text-muted-foreground">Bạn không có quyền truy cập tính năng này</div>}>
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
            <PlanningProjects projects={projects} currentUser={currentUser} onUpdate={loadData} canManage={hasPermission('MANAGE_PLANNING')} />
          )}

          {activeTab === 'planning_estimates' && (
            <PlanningEstimates budgets={budgets} projects={projects} materials={materials} transactions={transactions} currentUser={currentUser} onUpdate={loadData} canManage={hasPermission('MANAGE_PLANNING')} />
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
                                        <p className="text-xs font-bold truncate pr-4">{b.filename}</p>
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
                                          const url = `${apiService.getBaseUrl()}/api/download-db`;
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
                                          onClick={() => handleRestoreBackup(b.filename)}
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
    </div>
  );
};

export default App;
