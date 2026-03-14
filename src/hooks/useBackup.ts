import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { useToast } from './useToast';

export const useBackup = (
  isAuthenticated: boolean, 
  requestConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void
) => {
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const toast = useToast();

  const fetchBackups = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data: any = await apiService.getRecentBackups();
      setBackups(Array.isArray(data) ? data : (data?.backups || []));
    } catch (error) {
      console.error("Failed to fetch backups", error);
    }
  }, [isAuthenticated]);

  const handleTriggerServerBackup = useCallback(async () => {
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
  }, [fetchBackups, toast]);

  const handleRestoreBackup = useCallback(async (filename: string) => {
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
  }, [requestConfirm, toast]);

  return {
    backups,
    isBackingUp,
    fetchBackups,
    handleTriggerServerBackup,
    handleRestoreBackup
  };
};
