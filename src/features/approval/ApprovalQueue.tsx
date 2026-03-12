import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, Package, User, Calendar,
  AlertTriangle, RefreshCcw, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/useToast';

interface ApprovalItem {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  note: string | null;
}

interface PendingReceipt {
  receiptId: string;
  date: string;
  transactionTime: string;
  user: string;
  workshop: string;
  orderCode: string | null;
  items: ApprovalItem[];
}

interface ApprovalQueueProps {
  onUpdate?: () => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ onUpdate }) => {
  const toast = useToast();
  const [pending, setPending] = useState<PendingReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reject dialog state
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; receiptId: string }>({ open: false, receiptId: '' });
  const [rejectReason, setRejectReason] = useState('');

  // Approve confirm state
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; receiptId: string; userName: string }>({ open: false, receiptId: '', userName: '' });

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/api/approval/pending') as any;
      if (res?.success) {
        setPending(res.pending || []);
      }
    } catch (err) {
      console.error('Load pending error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleApprove = async () => {
    try {
      const res = await apiService.post('/api/approval/approve', { receiptId: approveDialog.receiptId }) as any;
      if (res?.success) {
        toast.success(`✅ Đã duyệt phiếu ${approveDialog.receiptId}`);
        loadPending();
        onUpdate?.();
      } else {
        toast.error(res?.error || 'Lỗi khi duyệt phiếu');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi duyệt phiếu');
    } finally {
      setApproveDialog({ open: false, receiptId: '', userName: '' });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối.');
      return;
    }
    try {
      const res = await apiService.post('/api/approval/reject', {
        receiptId: rejectDialog.receiptId,
        reason: rejectReason
      }) as any;
      if (res?.success) {
        toast.success(`❌ Đã từ chối phiếu ${rejectDialog.receiptId}`);
        loadPending();
        onUpdate?.();
      } else {
        toast.error(res?.error || 'Lỗi khi từ chối phiếu');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi từ chối phiếu');
    } finally {
      setRejectDialog({ open: false, receiptId: '' });
      setRejectReason('');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 shadow-inner">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black">Phiếu chờ duyệt</h2>
            <p className="text-sm text-muted-foreground">
              {pending.length > 0 ? `${pending.length} phiếu đang chờ xử lý` : 'Không có phiếu nào chờ duyệt'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadPending} disabled={loading} className="gap-2">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </div>

      {pending.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">Tất cả đã được xử lý!</h3>
            <p className="text-sm text-muted-foreground">Không có phiếu xuất kho nào đang chờ duyệt.</p>
          </CardContent>
        </Card>
      )}

      {pending.map((receipt) => (
        <Card key={receipt.receiptId} className="overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader
            className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setExpandedId(expandedId === receipt.receiptId ? null : receipt.receiptId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 font-bold">
                  <Clock size={12} className="mr-1" /> Chờ duyệt
                </Badge>
                <span className="font-mono text-sm font-bold">{receipt.receiptId}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User size={12} /> {receipt.user}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} /> {receipt.date} {receipt.transactionTime}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {receipt.workshop} • {receipt.items.length} vật tư
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setApproveDialog({ open: true, receiptId: receipt.receiptId, userName: receipt.user });
                  }}
                >
                  <CheckCircle2 size={14} /> Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRejectDialog({ open: true, receiptId: receipt.receiptId });
                  }}
                >
                  <XCircle size={14} /> Từ chối
                </Button>
                {expandedId === receipt.receiptId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </CardHeader>

          {expandedId === receipt.receiptId && (
            <CardContent className="p-0 border-t">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Mã VT</TableHead>
                    <TableHead>Tên vật tư</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead>Đơn vị</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{item.materialId}</TableCell>
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialog.open} onOpenChange={(open) => !open && setApproveDialog({ open: false, receiptId: '', userName: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={20} />
              Xác nhận duyệt phiếu xuất kho
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn duyệt phiếu <strong>{approveDialog.receiptId}</strong> của <strong>{approveDialog.userName}</strong>?
              <br />Tồn kho sẽ bị trừ ngay sau khi duyệt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
              Duyệt phiếu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) { setRejectDialog({ open: false, receiptId: '' }); setRejectReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="text-red-600" size={20} />
              Từ chối phiếu xuất kho
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phiếu <strong>{rejectDialog.receiptId}</strong> sẽ bị từ chối. Tồn kho không bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-sm font-bold mb-2 block">Lý do từ chối <span className="text-red-500">*</span></label>
            <Input
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
              disabled={!rejectReason.trim()}
            >
              Từ chối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
