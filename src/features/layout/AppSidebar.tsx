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
  | 'warehouse_history'
  | 'warehouse_merge'
  | 'warehouse_customers'
  | 'planning_projects'
  | 'planning_estimates'
  | 'reports_activity'
  | 'users'
  | 'account'
  | 'credits';

interface SidebarItem {
  id: string;
  label: string;
  icon?: any;
  group?: string;
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
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const tabs: SidebarItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan', group: 'CHÍNH' },
    {
      id: 'warehouse',
      icon: Package,
      label: 'Phòng kho',
      group: 'QUẢN LÝ KHO',
      subItems: [
        { id: 'warehouse_inventory', label: 'Danh sách vật tư' },
        { id: 'warehouse_transfer', label: 'Điều chuyển' },
        { id: 'warehouse_receipt', label: 'Lập phiếu' },
        { id: 'warehouse_history', label: 'Lịch sử nhập xuất' },
        { id: 'warehouse_merge', label: 'Hợp nhất vật tư' },
        { id: 'warehouse_customers', label: 'Quản lý NCC' }
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
      group: 'HỆ THỐNG',
      subItems: [
        { id: 'reports_activity', label: 'Nhật ký hoạt động' }
      ]
    },
    ...(hasPermission('MANAGE_USERS') ? [{ id: 'users', icon: Users, label: 'Người dùng' }] : []),
    { id: 'credits', icon: Info, label: 'Tác giả' }
  ];

  const roleName =
    userRole === 'ADMIN' ? 'Quản trị viên' :
      userRole === 'WAREHOUSE' ? 'Quản lý kho' :
        userRole === 'PLANNING' ? 'Phòng kế hoạch' : 'Khách';

  // Track which groups we've already rendered
  let renderedGroups = new Set<string>();

  return (
    <aside className="sidebar-neo print:hidden fixed inset-y-0 left-0 z-50 w-[272px] flex flex-col transition-all md:relative md:translate-x-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-sky-500/20 border border-sky-500/30">
            <Warehouse size={22} />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight leading-none block text-white">
              SmartStock
            </span>
            <p className="text-[10px] font-semibold text-sky-400/80 uppercase tracking-wider mt-1">WMS Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tab, idx) => {
          const isExpanded = expandedItems.includes(tab.id);
          const hasSubItems = tab.subItems && tab.subItems.length > 0;
          const isActive = activeTab === tab.id || (tab.subItems?.some(s => s.id === activeTab));

          // Group separator
          let groupLabel = null;
          if (tab.group && !renderedGroups.has(tab.group)) {
            renderedGroups.add(tab.group);
            groupLabel = (
              <div className="sidebar-separator" key={`group-${tab.group}`}>
                {tab.group}
              </div>
            );
          }

          return (
            <React.Fragment key={tab.id}>
              {groupLabel}
              <div className="space-y-0.5">
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
                  className={`group flex items-center w-full gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative ${isActive && !hasSubItems
                    ? 'sidebar-active text-white font-semibold'
                    : 'sidebar-item-hover'
                    }`}
                >
                  <div className={`transition-transform duration-200 ${isActive ? 'scale-110 text-sky-400' : 'text-white/60 group-hover:text-white/90'}`}>
                    {tab.icon && <tab.icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />}
                  </div>
                  <span className={`text-sm tracking-wide ${isActive ? 'font-semibold text-white' : 'font-medium text-white/70 group-hover:text-white/90'}`}>
                    {tab.label}
                  </span>
                  {hasSubItems && (
                    <ChevronRight
                      size={14}
                      className={`ml-auto transition-transform duration-200 text-white/30 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>

                {hasSubItems && isExpanded && (
                  <div className="ml-8 space-y-0.5 mt-0.5 border-l border-white/10 pl-3">
                    {tab.subItems?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`flex items-center w-full gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium tracking-wide ${activeTab === sub.id
                          ? 'text-sky-400 bg-sky-500/10'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                          }`}
                      >
                        {sub.label}
                        {activeTab === sub.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 bg-sky-500/20 text-sky-400 rounded-lg flex items-center justify-center font-bold text-sm border border-sky-500/20">
              {currentUser?.fullName?.[0] || userRole[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {currentUser?.fullName || roleName}
              </p>
              <p className="text-[10px] font-medium text-white/40 uppercase mt-0.5">{userRole}</p>
            </div>
            <button onClick={onLogout} className="p-1.5 text-white/30 hover:text-red-400 transition-colors" title="Đăng xuất">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
