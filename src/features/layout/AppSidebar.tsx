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
        { id: 'warehouse_merge', label: 'Bóc Tách Vật Tư', icon: Database, permission: 'MANAGE_WAREHOUSE' },
      ]
    },
    {
      title: 'KẾ HOẠCH',
      items: [
        { id: 'planning_projects', label: 'Cấu Hình Dự Án', icon: MapPin, permission: 'PLANNING_PROJECTS' },
        { id: 'planning_estimates', label: 'Dự Toán (Ngân Sách)', icon: ClipboardList, permission: 'PLANNING_ESTIMATES' },
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
      className={`relative flex flex-col bg-card border-r border-border transition-[width] duration-300 ease-in-out z-20 shrink-0 ${isCollapsed ? 'w-[72px]' : 'w-[272px]'
        }`}
    >
      {/* Logo Header */}
      <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Activity size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base text-foreground tracking-tight leading-none truncate">SmartStock</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">Quản lý kho nội bộ</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted ${isCollapsed ? 'mx-auto' : 'ml-1'}`}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-3 space-y-0.5">
        <TooltipProvider delayDuration={0}>
          {menuGroups.map((group, idx) => {
            const visibleItems = group.items.filter(
              item => !item.permission || hasPermission(item.permission as Permission)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="mb-1">
                {!isCollapsed && (
                  <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                    {group.title}
                  </p>
                )}
                {isCollapsed && idx > 0 && (
                  <div className="my-2 mx-3 border-t border-border/50" />
                )}
                <div className="space-y-0.5 px-2">
                  {visibleItems.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;

                    const btn = (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as AppTab)}
                        className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 group
                          ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                          ${isActive
                            ? 'bg-primary/10 text-primary border-l-4 border-primary rounded-l-none font-semibold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-4 border-transparent rounded-l-none'
                          }`}
                      >
                        <Icon size={18} className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );

                    return isCollapsed ? (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
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

      {/* Footer: User info + Logout */}
      <div className={`border-t border-border bg-muted/30 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar
                  className="h-9 w-9 cursor-pointer shrink-0 ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
                  onClick={onOpenAccount}
                >
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {currentUser?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  {currentUser?.fullName || 'Tài khoản'}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-none mb-1">
                {currentUser?.fullName || 'Người dùng'}
              </p>
              <Badge
                variant="secondary"
                className="text-[9px] font-bold uppercase tracking-wider h-4 px-1.5 py-0 bg-primary/10 text-primary border-0"
              >
                {ROLE_LABELS[userRole] || userRole}
              </Badge>
            </div>
          )}

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Đăng xuất</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </aside>
  );
};
