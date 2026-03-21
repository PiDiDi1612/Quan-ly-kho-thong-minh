import React, { useState, useEffect } from 'react';
import { 
  History, Calendar, User, Package, ChevronRight, 
  CheckCircle2, Clock, FileText, Search, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { WORKSHOPS } from '@/constants';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

interface InventoryHistoryProps {
  onBack: () => void;
}

export const InventoryHistory: React.FC<InventoryHistoryProps> = ({ onBack }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCheck, setSelectedCheck] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/inventory-checks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkshopName = (code: string) => {
    return WORKSHOPS.find(w => w.code === code)?.name || code;
  };

  const filteredHistory = history.filter(h => 
    h.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.checkedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <History className="text-slate-600" size={28} />
            </div>
            Lịch Sử Kiểm Kê
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Xem lại các đợt đối soát và điều chỉnh tồn kho đã thực hiện</p>
        </div>
        <Button variant="ghost" onClick={onBack} className="rounded-xl">
           <X className="mr-2 h-4 w-4" /> Đóng
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Danh sách phiếu kiểm kê</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm mã phiếu, người kiểm..." 
                className="pl-9 rounded-xl border-slate-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Đang tải dữ liệu...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
              <FileText size={48} className="opacity-20" />
              <p>Chưa có dữ liệu kiểm kê nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  <TableHead className="px-6 py-4 table-header-text w-[180px]">Mã Phiếu</TableHead>
                  <TableHead className="px-6 py-4 table-header-text">Kho / Phân Xưởng</TableHead>
                  <TableHead className="px-6 py-4 table-header-text text-center">Ngày Kiểm</TableHead>
                  <TableHead className="px-6 py-4 table-header-text text-center">Người Kiểm</TableHead>
                  <TableHead className="px-6 py-4 table-header-text text-center">Trạng Thái</TableHead>
                  <TableHead className="px-6 py-4 table-header-text text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(filteredHistory) && filteredHistory.map(item => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-50 dark:border-slate-800/50 cursor-pointer group" onClick={() => setSelectedCheck(item)}>
                    <TableCell className="px-6 py-4">
                      <span className="data-label text-sky-600 tabular-nums">{item.id}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="data-label text-sky-600 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 rounded-xl uppercase">{getWorkshopName(item.warehouse)}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="content-text text-[11px] font-bold bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl">{new Date(item.checkDate).toLocaleDateString('vi-VN')}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="content-text text-[11px] font-bold text-slate-600 dark:text-slate-400">{item.checkedBy}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {item.status === 'COMPLETED' ? (
                        <span className="data-label text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-lg shadow-sm">Đã chốt</span>
                      ) : (
                        <span className="data-label text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">Bản nháp</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="rounded-lg group-hover:bg-white">
                        Chi tiết <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedCheck} onOpenChange={() => setSelectedCheck(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">Chi tiết kiểm kê #{selectedCheck?.id}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Thực hiện vào {selectedCheck && new Date(selectedCheck.checkDate).toLocaleString('vi-VN')}
                </DialogDescription>
              </div>
              <Badge className={selectedCheck?.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'}>
                {selectedCheck?.status === 'COMPLETED' ? 'ĐÃ HOÀN THÀNH' : 'BẢN NHÁP'}
              </Badge>
            </div>
          </DialogHeader>
          <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
             <div className="flex gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kho kiểm kê</p>
                  <p className="font-bold text-slate-700">{getWorkshopName(selectedCheck?.warehouse)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người thực hiện</p>
                  <p className="font-bold text-slate-700">{selectedCheck?.checkedBy}</p>
                </div>
             </div>
             <div className="text-right">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú</p>
               <p className="text-sm italic text-slate-600">{selectedCheck?.note || 'Không có ghi chú'}</p>
             </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                <TableRow>
                  <TableHead>Vật Tư</TableHead>
                  <TableHead className="text-right">Hệ Thống</TableHead>
                  <TableHead className="text-right">Thực Tế</TableHead>
                  <TableHead className="text-right font-bold w-[120px]">Chênh Lệch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(selectedCheck?.items) && selectedCheck.items.map((item: any) => {
                  const diff = item.actualQty - item.systemQty;
                  return (
                    <TableRow key={item.materialId}>
                      <TableCell>
                        <p className="font-bold text-sm tracking-tight">{item.materialName}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">{item.materialId} • {item.unit}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono">{item.systemQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{item.actualQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                         {diff === 0 ? (
                           <span className="text-slate-300">—</span>
                         ) : (
                           <Badge 
                             variant={diff > 0 ? "default" : "destructive"}
                             className={`rounded-lg ${diff > 0 ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}`}
                           >
                             {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                           </Badge>
                         )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-6 flex justify-end bg-slate-50 border-t">
            <Button variant="outline" onClick={() => setSelectedCheck(null)} className="rounded-xl border-slate-300">
               Đóng chi tiết
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
