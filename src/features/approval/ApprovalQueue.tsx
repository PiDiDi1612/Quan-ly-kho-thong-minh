import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, User, Calendar,
  RefreshCcw, ChevronDown, ChevronUp, History, Shield, ShieldOff,
  FileText, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

interface HistoryRecord {
  groupId: string;
  date: string;
  transactionTime: string;
  user: string;
  workshop: string;
  status: string;
  approvedBy: string | null;
  rejectedReason: string | null;
  itemCount: number;
  totalQuantity: number;
}

interface ApprovalQueueProps {
  onUpdate?: () => void;
  canApprove?: boolean;
  userRole?: string;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ onUpdate, canApprove = false, userRole = '' }) => {
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [pending, setPending] = useState<PendingReceipt[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Approval toggle state
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [togglingApproval, setTogglingApproval] = useState(false);

  // Reject dialog state
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; receiptId: string }>({ open: false, receiptId: '' });
  const [rejectReason, setRejectReason] = useState('');

  // Approve confirm state
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; receiptId: string; userName: string }>({ open: false, receiptId: '', userName: '' });

  const isAdmin = userRole === 'ADMIN';

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

  const loadHistory = useCallback(async (page = 1, status = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (status) params.set('status', status);
      const res = await apiService.get(`/api/approval/history?${params}`) as any;
      if (res?.success) {
        setHistory(res.data || []);
        setHistoryTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Load history error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await apiService.get('/api/approval/settings') as any;
      if (res?.success !== undefined) {
        setApprovalRequired(res.approvalRequired);
      }
    } catch (err) {
      console.error('Load settings error:', err);
    }
  }, []);

  useEffect(() => {
    loadPending();
    loadSettings();
  }, [loadPending, loadSettings]);

  useEffect(() => {
    if (tab === 'history') {
      loadHistory(historyPage, historyFilter);
    }
  }, [tab, historyPage, historyFilter, loadHistory]);

  const handleToggleApproval = async () => {
    setTogglingApproval(true);
    try {
      const res = await apiService.post('/api/approval/settings', { approvalRequired: !approvalRequired }) as any;
      if (res?.success) {
        setApprovalRequired(res.approvalRequired);
        toast.success(res.approvalRequired ? '🔒 Đã BẬT chế độ duyệt phiếu' : '🔓 Đã TẮT chế độ duyệt phiếu');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi thay đổi cài đặt');
    } finally {
      setTogglingApproval(false);
    }
  };

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

  const formatDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 shadow-inner">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Quản lý duyệt phiếu</h2>
            <p className="content-text text-sm">
              {tab === 'pending'
                ? (pending.length > 0 ? `${pending.length} phiếu đang chờ xử lý` : 'Không có phiếu nào chờ duyệt')
                : `${historyTotal} phiếu đã xử lý`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Approval Toggle (Admin only) */}
          {isAdmin && (
            <Button
              variant={approvalRequired ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleApproval}
              disabled={togglingApproval}
              className={`gap-2 h-9 ${approvalRequired
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-amber-400 text-amber-600 hover:bg-amber-50'
                }`}
              title={approvalRequired ? 'Duyệt phiếu đang BẬT: phiếu xuất của nhân viên kho cần Admin duyệt' : 'Duyệt phiếu đang TẮT: phiếu xuất tự động duyệt'}
            >
              {approvalRequired ? <Shield size={14} /> : <ShieldOff size={14} />}
              {approvalRequired ? 'Duyệt BẬT' : 'Duyệt TẮT'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { loadPending(); if (tab === 'history') loadHistory(historyPage, historyFilter); }} disabled={loading} className="gap-2">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'pending' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Clock size={14} className="inline mr-2" />
          Chờ duyệt {pending.length > 0 && <Badge className="ml-1.5 bg-amber-500 text-white border-none text-[10px] h-5 px-1.5">{pending.length}</Badge>}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'history' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <History size={14} className="inline mr-2" />
          Lịch sử
        </button>
      </div>

      {/* TAB: Pending */}
      {tab === 'pending' && (
        <>
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
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 data-label">
                      <Clock size={12} className="mr-1 stroke-[3]" /> Chờ duyệt
                    </Badge>
                    <span className="data-label text-sm text-amber-600 font-bold tracking-wider">{receipt.receiptId}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User size={12} /> {receipt.user}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(receipt.date)} {receipt.transactionTime}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {receipt.workshop} • {receipt.items.length} vật tư
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {canApprove && (
                      <>
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
                      </>
                    )}
                    {expandedId === receipt.receiptId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </CardHeader>

              {expandedId === receipt.receiptId && (
                <CardContent className="p-0 border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <TableHead className="w-[50px] table-header-text">#</TableHead>
                        <TableHead className="table-header-text">Mã VT</TableHead>
                        <TableHead className="table-header-text">Tên vật tư</TableHead>
                        <TableHead className="text-right table-header-text">Số lượng</TableHead>
                        <TableHead className="table-header-text">Đơn vị</TableHead>
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
        </>
      )}

      {/* TAB: History */}
      {tab === 'history' && (
        <Card>
          <CardContent className="p-0">
            {/* History filter */}
            <div className="flex items-center gap-3 p-4 border-b">
              <Filter size={14} className="text-muted-foreground" />
              <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                {[
                  { value: '', label: 'Tất cả' },
                  { value: 'approved', label: 'Đã duyệt' },
                  { value: 'rejected', label: 'Từ chối' },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setHistoryFilter(f.value); setHistoryPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${historyFilter === f.value ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                  <TableHead className="table-header-text">Mã phiếu</TableHead>
                  <TableHead className="table-header-text">Ngày</TableHead>
                  <TableHead className="table-header-text">Người lập</TableHead>
                  <TableHead className="table-header-text">Xưởng</TableHead>
                  <TableHead className="table-header-text text-center">Vật tư</TableHead>
                  <TableHead className="table-header-text text-center">Trạng thái</TableHead>
                  <TableHead className="table-header-text">Người duyệt</TableHead>
                  <TableHead className="table-header-text">Lý do từ chối</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Chưa có lịch sử duyệt phiếu
                    </TableCell>
                  </TableRow>
                )}
                {history.map((record) => (
                  <TableRow key={record.groupId} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-bold">{record.groupId}</TableCell>
                    <TableCell className="text-xs">{formatDate(record.date)} {record.transactionTime || ''}</TableCell>
                    <TableCell className="text-sm">{record.user}</TableCell>
                    <TableCell className="text-xs">{record.workshop}</TableCell>
                    <TableCell className="text-center text-xs">{record.itemCount} mục • {record.totalQuantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] font-bold border-none ${record.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                        }`}>
                        {record.status === 'approved' ? '✓ Đã duyệt' : '✗ Từ chối'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{record.approvedBy || '–'}</TableCell>
                    <TableCell className="text-xs text-red-500 max-w-[200px] truncate" title={record.rejectedReason || ''}>
                      {record.rejectedReason || '–'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {historyTotal > 30 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t">
                <Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)}>Trước</Button>
                <span className="text-xs text-muted-foreground">Trang {historyPage} / {Math.ceil(historyTotal / 30)}</span>
                <Button variant="outline" size="sm" disabled={historyPage >= Math.ceil(historyTotal / 30)} onClick={() => setHistoryPage(p => p + 1)}>Sau</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
