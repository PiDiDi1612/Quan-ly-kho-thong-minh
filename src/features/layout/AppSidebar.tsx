import React, { useState } from 'react';
import {
  Activity, Package, Plus, ArrowRightLeft, History, ShoppingCart,
  MapPin, ClipboardList, Database, FileText, Settings, Users, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { User, UserRole, Permission } from '@/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export type AppTab =
  | 'dashboard'
  | 'warehouse_inventory' | 'warehouse_receipt' | 'warehouse_transfer' | 'warehouse_history'
  | 'supplier_management' | 'warehouse_merge'
  | 'planning_projects' | 'planning_estimates'
  | 'reports_inventory' | 'users' | 'settings' | 'materials_categories';

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
  activeTab, setActiveTab, hasPermission, currentUser, userRole, onLogout, onOpenAccount
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuGroups = [
    {
      title: "PHÒNG KHO",
      items: [
        { id: 'dashboard', label: 'Bàn Làm Việc', icon: Activity, permission: null },
        { id: 'warehouse_inventory', label: 'Danh Sách Vật Tư', icon: Package, permission: 'VIEW_MATERIAL' },
        { id: 'warehouse_receipt', label: 'Lập Phiếu (Nhập/Xuất)', icon: Plus, permission: 'MANAGE_WAREHOUSE' },
        { id: 'warehouse_transfer', label: 'Chuyển Kho', icon: ArrowRightLeft, permission: 'MANAGE_WAREHOUSE' },
        { id: 'warehouse_history', label: 'Lịch Sử Giao Dịch', icon: History, permission: 'VIEW_TRANSACTION' },
        { id: 'supplier_management', label: 'Quản Lý NCC', icon: ShoppingCart, permission: 'MANAGE_SUPPLIERS' },
        { id: 'warehouse_merge', label: 'Bóc Tách Vật Tư', icon: Database, permission: 'MANAGE_WAREHOUSE' },
      ]
    },
    {
      title: "KẾ HOẠCH",
      items: [
        { id: 'planning_projects', label: 'Cấu Hình Dự Án', icon: MapPin, permission: 'PLANNING_PROJECTS' },
        { id: 'planning_estimates', label: 'Dự Toán (Ngân Sách)', icon: ClipboardList, permission: 'PLANNING_ESTIMATES' },
      ]
    },
    {
      title: "BÁO CÁO",
      items: [
        { id: 'reports_inventory', label: 'Báo Cáo Tồn Kho', icon: FileText, permission: 'VIEW_REPORT' },
      ]
    },
    {
      title: "HỆ THỐNG",
      items: [
        { id: 'users', label: 'Phân Quyền & User', icon: Users, permission: 'MANAGE_USERS' },
        { id: 'settings', label: 'Nhật Ký & Cài Đặt', icon: Settings, permission: 'MANAGE_ROLES' },
      ]
    }
  ];

  return (
    <div className={`relative flex flex-col bg-card border-r transition-all duration-300 z-20 ${isCollapsed ? 'w-[72px]' : 'w-[280px]'}`}>
      <div className="flex items-center justify-between h-14 px-4 border-b">
        {!isCollapsed && <span className="font-bold text-lg text-primary truncate">SmartStock</span>}
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <TooltipProvider delayDuration={0}>
          {menuGroups.map((group, idx) => {
            const visibleItems = group.items.filter(item => !item.permission || hasPermission(item.permission as Permission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="mb-6 px-3">
                {!isCollapsed && (
                  <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground tracking-wider">
                    {group.title}
                  </h4>
                )}
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;

                    const buttonContent = (
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={`w-full justify-start ${isCollapsed ? 'px-0 justify-center' : 'px-3'} ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-l-4 border-l-emerald-600 rounded-l-none' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab(item.id as AppTab)}
                      >
                        <Icon size={18} className={isCollapsed ? '' : 'mr-3'} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </Button>
                    );

                    return isCollapsed ? (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.id}>{buttonContent}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>

      <div className="p-4 border-t bg-muted/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 cursor-pointer" onClick={onOpenAccount}>
            <AvatarFallback className="bg-primary/10 text-primary">
              {currentUser?.fullName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{userRole}</p>
            </div>
          )}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
                  <LogOut size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Đăng xuất</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
