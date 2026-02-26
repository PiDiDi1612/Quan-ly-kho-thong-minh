import React, { useState } from 'react';
import {
  Activity, Package, Plus, ArrowRightLeft, History, ShoppingCart,
  MapPin, ClipboardList, Database, FileText, Settings, Users,
  ChevronLeft, ChevronRight, LogOut, LayoutDashboard, BarChart2
} from 'lucide-react';
import { User, UserRole, Permission } from '@/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export type AppTab =
  | 'dashboard'
  | 'warehouse_inventory' | 'warehouse_receipt' | 'warehouse_transfer' | 'warehouse_history'
  | 'supplier_management' | 'warehouse_merge'
  | 'planning_projects' | 'planning_estimates'
  | 'reports_inventory' | 'reports_history' | 'reports_activity'
  | 'users' | 'settings' | 'materials_categories';

interface AppSidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  hasPermission: (permission: Permission) => boolean;
  currentUser: User | null;
  userRole: UserRole;
  onLogout: () => void;
  onOpenAccount: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị',
  WAREHOUSE: 'Thủ kho',
  PLANNING: 'Kế hoạch',
  GUEST: 'Khách',
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab, setActiveTab, hasPermission, currentUser, userRole, onLogout, onOpenAccount
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuGroups = [
    {
      title: 'PHÒNG KHO',
      items: [
        { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard, permission: null },
        { id: 'warehouse_inventory', label: 'Danh Sách Vật Tư', icon: Package, permission: 'VIEW_MATERIAL' },
        { id: 'warehouse_receipt', label: 'Lập Phiếu (Nhập/Xuất)', icon: Plus, permission: 'MANAGE_WAREHOUSE' },
        { id: 'warehouse_transfer', label: 'Chuyển Kho', icon: ArrowRightLeft, permission: 'MANAGE_WAREHOUSE' },
        { id: 'warehouse_history', label: 'Lịch Sử Giao Dịch', icon: History, permission: 'VIEW_TRANSACTION' },
        { id: 'supplier_management', label: 'Quản Lý NCC', icon: ShoppingCart, permission: 'MANAGE_SUPPLIERS' },
        { id: 'warehouse_merge', label: 'Hợp nhất vật tư', icon: Database, permission: 'MANAGE_WAREHOUSE' },
      ]
    },
    {
      title: 'KẾ HOẠCH',
      items: [
        { id: 'planning_projects', label: 'Cấu Hình Dự Án', icon: MapPin, permission: 'PLANNING_PROJECTS' },
        { id: 'planning_estimates', label: 'Dự Toán Đơn Hàng', icon: ClipboardList, permission: 'PLANNING_ESTIMATES' },
      ]
    },
    {
      title: 'BÁO CÁO',
      items: [
        { id: 'reports_history', label: 'Lịch Sử Giao Dịch', icon: BarChart2, permission: 'VIEW_REPORT' },
        { id: 'reports_inventory', label: 'Báo Cáo Tồn Kho', icon: FileText, permission: 'VIEW_REPORT' },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { id: 'users', label: 'Phân Quyền & User', icon: Users, permission: 'MANAGE_USERS' },
        { id: 'settings', label: 'Nhật Ký & Cài Đặt', icon: Settings, permission: 'MANAGE_ROLES' },
      ]
    }
  ];

  return (
    <aside
      className={`relative flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out z-20 shrink-0 ${isCollapsed ? 'w-20' : 'w-72'
        }`}
    >
      {/* Logo Header */}
      <div className="flex items-center h-16 px-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0 animate-in fade-in slide-in-from-left-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Activity size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-lg text-foreground tracking-tight leading-none truncate">SmartStock</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 truncate">Expert WMS</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`shrink-0 h-9 w-9 rounded-xl hover:bg-muted transition-all duration-200 ${isCollapsed ? 'mx-auto' : 'ml-2'}`}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 no-scrollbar">
        <TooltipProvider delayDuration={0}>
          {menuGroups.map((group, idx) => {
            const visibleItems = group.items.filter(
              item => !item.permission || hasPermission(item.permission as Permission)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="mb-4">
                {!isCollapsed && (
                  <p className="px-6 py-2 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase opacity-70">
                    {group.title}
                  </p>
                )}
                {isCollapsed && idx > 0 && (
                  <div className="my-4 mx-4 border-t border-border/50" />
                )}
                <div className="space-y-1 px-3">
                  {visibleItems.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;

                    const btn = (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as AppTab)}
                        className={`w-full flex items-center gap-3 rounded-xl text-sm transition-all duration-200 group
                          ${isCollapsed ? 'justify-center px-0 h-12' : 'px-4 h-11'}
                          ${isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-l-[4px] border-emerald-600 rounded-l-none font-bold shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[4px] border-transparent rounded-l-none font-medium'
                          }`}
                      >
                        <Icon size={20} className={`shrink-0 ${isActive ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-foreground'} transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );

                    return isCollapsed ? (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" className="font-bold bg-primary text-primary-foreground border-none">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.id}>{btn}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>

    </aside>
  );
};
