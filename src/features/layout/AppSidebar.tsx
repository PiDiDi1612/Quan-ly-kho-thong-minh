import React from 'react';
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Info,
  LayoutDashboard,
  LogOut,
  Package,
  User as UserIcon,
  Users,
  Warehouse
} from 'lucide-react';
import { Permission, User, UserRole } from '@/types';

export type AppTab =
  | 'dashboard'
  | 'warehouse_inventory'
  | 'warehouse_transfer'
  | 'warehouse_receipt'
  | 'warehouse_customers'
  | 'planning_projects'
  | 'planning_estimates'
  | 'reports_history'
  | 'reports_activity'
  | 'users'
  | 'account'
  | 'credits';

interface SidebarItem {
  id: string;
  label: string;
  icon?: any;
  subItems?: { id: AppTab; label: string }[];
}

interface AppSidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  hasPermission: (permission: Permission) => boolean;
  currentUser: User | null;
  userRole: UserRole;
  onLogout: () => void;
  onOpenAccount: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  hasPermission,
  currentUser,
  userRole,
  onLogout,
  onOpenAccount
}) => {
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['warehouse', 'reports', 'planning_dept']);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const tabs: SidebarItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
    {
      id: 'warehouse',
      icon: Package,
      label: 'Phòng kho',
      subItems: [
        { id: 'warehouse_inventory', label: 'Danh sách vật tư' },
        { id: 'warehouse_transfer', label: 'Điều chuyển' },
        { id: 'warehouse_receipt', label: 'Lập phiếu' },
        { id: 'warehouse_customers', label: 'Cấu hình mã khách' }
      ]
    },
    {
      id: 'planning_dept',
      icon: ClipboardList,
      label: 'Phòng kế hoạch',
      subItems: [
        { id: 'planning_projects', label: 'Cấu hình dự án' },
        { id: 'planning_estimates', label: 'Lập dự toán' }
      ]
    },
    {
      id: 'reports',
      icon: FileText,
      label: 'Báo cáo',
      subItems: [
        { id: 'reports_history', label: 'Lịch sử nhập xuất' },
        { id: 'reports_activity', label: 'Nhật ký hoạt động' }
      ]
    },
    ...(hasPermission('MANAGE_USERS') ? [{ id: 'users', icon: Users, label: 'Người dùng' }] : []),
    { id: 'credits', icon: Info, label: 'Tác giả' }
  ];

  const roleName =
    userRole === 'ADMIN' ? 'Quản trị viên' : userRole === 'MANAGER' ? 'Quản lý' : 'Nhân viên';

  return (
    <aside className="glass-panel glass-strong print:hidden fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200/50 dark:border-slate-700/70 transition-all md:relative md:translate-x-0">
      <div className="p-6 border-b border-slate-200/40 dark:border-slate-700/70">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Warehouse size={22} />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none block">
              Smart<span className="text-blue-600 dark:text-blue-400">Stock</span>
            </span>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Quản lý kho</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1 flex-1 overflow-y-auto no-scrollbar">
        {tabs.map(tab => {
          const isExpanded = expandedItems.includes(tab.id);
          const hasSubItems = tab.subItems && tab.subItems.length > 0;
          const isActive = activeTab === tab.id || (tab.subItems?.some(s => s.id === activeTab));

          return (
            <div key={tab.id} className="space-y-1">
              <button
                onClick={() => {
                  if (hasSubItems) {
                    if (!isExpanded) {
                      setActiveTab(tab.subItems![0].id);
                    }
                    toggleExpand(tab.id);
                  } else {
                    setActiveTab(tab.id as AppTab);
                  }
                }}
                className={`group flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${isActive && !hasSubItems
                  ? 'sidebar-active text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {tab.icon && <tab.icon size={19} strokeWidth={isActive ? 2.4 : 2} />}
                </div>
                <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
                {hasSubItems && (
                  <ChevronRight
                    size={16}
                    className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                )}
                {isActive && !hasSubItems && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-300" />}
              </button>

              {hasSubItems && isExpanded && (
                <div className="ml-9 space-y-1 mt-1 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                  {tab.subItems?.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveTab(sub.id)}
                      className={`flex items-center w-full gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-xs font-bold uppercase tracking-wider ${activeTab === sub.id
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                    >
                      {sub.label}
                      {activeTab === sub.id && <div className="ml-auto w-1 h-1 rounded-full bg-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200/40 dark:border-slate-700/70">
        <div className="p-2 space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl app-surface">
            <div className="w-9 h-9 bg-white/80 dark:bg-slate-900/60 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold text-sm border border-slate-200/70 dark:border-slate-700">
              {currentUser?.fullName?.[0] || userRole[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                {currentUser?.fullName || roleName}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">{userRole}</p>
            </div>
            <button onClick={onLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>

          <button
            onClick={onOpenAccount}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 app-surface hover:border-blue-400/60 dark:hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wide"
          >
            <UserIcon size={16} />
            Tài khoản
          </button>
        </div>
      </div>
    </aside>
  );
};
