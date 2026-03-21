import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiService as api } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { User } from '@/types';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  referenceId: string | null;
  isRead: number;
  createdAt: string;
}

interface NotificationBellProps {
  currentUser: User | null;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const [{ data }, { count }] = await Promise.all([
        api.get<any>('/api/notifications'),
        api.get<any>('/api/notifications/unread-count')
      ]);
      setNotifications(data || []);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Lỗi tải thông báo:', error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();

    const socket = api.getSocket();
    const handleNewNotification = (payload: any) => {
        if (!payload.userId && !payload.role) {
            fetchNotifications();
        } else if (payload.userId === currentUser.id || payload.role === currentUser.role || currentUser.role === 'ADMIN') {
            fetchNotifications();
        }
    };

    if (socket) {
      socket.on('notification_new', handleNewNotification);
    }
    
    return () => {
      if (socket) {
        socket.off('notification_new', handleNewNotification);
      }
    };
  }, [currentUser]);

  const markAsRead = async (id?: string) => {
    try {
      await api.post<any>('/api/notifications/read', id ? { id } : { all: true });
      fetchNotifications();
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã đọc:', error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-muted-foreground hover:text-emerald-600 transition-all">
          <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-card animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 rounded-2xl shadow-xl overflow-hidden p-0 border-border/50">
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border/50">
          <DropdownMenuLabel className="p-0 font-black text-sm uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            Thông báo
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); markAsRead(); }} className="h-6 px-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950">
              <CheckCheck size={12} className="mr-1" /> Đọc tất cả
            </Button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto no-scrollbar bg-card">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">Không có thông báo nào</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`flex flex-col items-start gap-1 p-4 cursor-pointer border-b border-border/50 last:border-0 focus:bg-muted/50 rounded-none transition-colors ${!notif.isRead ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
                onClick={(e) => {
                  e.preventDefault(); 
                  if (!notif.isRead) markAsRead(notif.id);
                }}
              >
                <div className="flex items-start justify-between w-full">
                  <p className={`text-sm ${!notif.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                    {notif.message}
                  </p>
                  {!notif.isRead && <span className="flex-shrink-0 w-2 h-2 mt-1.5 ml-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                </div>
                <div className="flex items-center text-[10px] font-bold text-muted-foreground mt-1">
                  <Clock size={10} className="mr-1" />
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
