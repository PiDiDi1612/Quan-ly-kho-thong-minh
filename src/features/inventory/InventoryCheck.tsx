import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Search, Save, CheckCircle2, AlertCircle, 
  RotateCcw, History, Package, ArrowRight, Info, Settings
} from 'lucide-react';
import { Material, WorkshopCode } from '@/types';
import { WORKSHOPS } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';

interface InventoryCheckProps {
  materials: Material[];
  onSave: (data: any) => Promise<boolean>;
  onViewHistory: () => void;
}

interface CheckItem {
  materialId: string;
  materialName: string;
  unit: string;
  systemQty: number;
  actualQty: number;
}

export const InventoryCheck: React.FC<InventoryCheckProps> = ({ 
  materials, onSave, onViewHistory 
}) => {
  const toast = useToast();
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopCode | ''>('');
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load materials from selected workshop
  const prevWorkshopRef = React.useRef<WorkshopCode | ''>(selectedWorkshop);

  useEffect(() => {
    if (!Array.isArray(materials)) return;

    // Chỉ reset checkItems và loading lại từ đầu khi Workshop THỰC SỰ thay đổi hoặc chưa có dữ liệu
    const isWorkshopChanged = prevWorkshopRef.current !== selectedWorkshop;

    if (isWorkshopChanged || checkItems.length === 0) {
      const filtered = materials.filter(m =>
        selectedWorkshop === '' || m.workshop === selectedWorkshop
      );

      const items = filtered.map(m => ({
        materialId: m.id,
        materialName: m.name,
        unit: m.unit,
        workshop: m.workshop,
        systemQty: m.quantity || 0,
        actualQty: m.quantity || 0,
        note: ''
      }));

      setCheckItems(items);
      prevWorkshopRef.current = selectedWorkshop;
    } else {
      // Nếu materials thay đổi (do background sync) nhưng Workshop không đổi
      // Chỉ cập nhật systemQty cho các item để đảm bảo tính thời gian thực
      // TUYỆT ĐỐI không ghi đè actualQty mà người dùng đang nhập
      setCheckItems(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.map(item => {
          const latest = materials.find(m => m.id === item.materialId);
          if (latest) {
            // Chỉ cập nhật systemQty, giữ nguyên actualQty
            return { ...item, systemQty: latest.quantity || 0 };
          }
          return item;
        });
      });
    }
  }, [materials, selectedWorkshop]);

  const handleQtyChange = (id: string, value: string) => {
    const qty = parseFloat(value) || 0;
    setCheckItems(prev => prev.map(item =>
      item.materialId === id ? { ...item, actualQty: qty } : item
    ));
  };

  const handleEqualize = () => {
    setCheckItems(prev => prev.map(item => ({ ...item, actualQty: item.systemQty })));
    toast.info("Đã đặt số lượng thực tế bằng số lượng hệ thống");
  };

  const handleSubmit = async (status: 'DRAFT' | 'COMPLETED') => {
    if (!selectedWorkshop) {
      toast.error("Vui lòng chọn kho để kiểm kê");
      return;
    }

    if (checkItems.length === 0) {
      toast.error("Không có vật tư nào để kiểm kê");
      return;
    }

    setIsSaving(true);
    const data = {
      id: `IC-${Date.now()}`,
      warehouse: selectedWorkshop,
      items: checkItems,
      note,
      status
    };

    const success = await onSave(data);
    if (success) {
      toast.success(status === 'COMPLETED' ? "Đã hoàn thành kiểm kê và cập nhật kho" : "Đã lưu bản nháp");
      setSelectedWorkshop('');
      setNote('');
    }
    setIsSaving(false);
  };

  const filteredItems = checkItems.filter(item => 
    item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.materialId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDiffItems = checkItems.filter(item => item.actualQty !== item.systemQty).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-emerald-900 dark:text-emerald-50 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <ClipboardList className="text-emerald-600" size={28} />
            </div>
            Kiểm Kê Kho Định Kỳ
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Đối soát và điều chỉnh số lượng tồn kho thực tế</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onViewHistory} className="rounded-xl border-emerald-200 hover:bg-emerald-50">
            <History className="mr-2 h-4 w-4" /> Lịch sử
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls */}
        <Card className="lg:col-span-1 border-emerald-100 shadow-sm rounded-2xl overflow-hidden h-fit sticky top-6">
          <CardHeader className="bg-emerald-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-600" /> Thiết lập
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chọn kho kiểm kê</label>
              <Select value={selectedWorkshop} onValueChange={(v) => setSelectedWorkshop(v as WorkshopCode)}>
                <SelectTrigger className="rounded-xl border-emerald-100">
                  <SelectValue placeholder="Chọn kho..." />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOPS.map(w => (
                    <SelectItem key={w.code} value={w.code}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tìm nhanh vật tư</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Mã hoặc tên..." 
                  className="pl-9 rounded-xl border-emerald-100"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ghi chú</label>
              <Input 
                placeholder="Lý do kiểm kê..." 
                className="rounded-xl border-emerald-100"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                variant="outline" 
                className="w-full rounded-xl border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                onClick={handleEqualize}
                disabled={!selectedWorkshop || isSaving}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset số lượng
              </Button>
            </div>
          </CardContent>
          <CardFooter className="bg-emerald-50/30 flex flex-col gap-2 p-4">
             <Button 
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                onClick={() => handleSubmit('COMPLETED')}
                disabled={!selectedWorkshop || isSaving}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Hoàn thành kiểm kê
              </Button>
              <Button 
                variant="ghost"
                className="w-full rounded-xl text-muted-foreground"
                onClick={() => handleSubmit('DRAFT')}
                disabled={!selectedWorkshop || isSaving}
              >
                <Save className="mr-2 h-4 w-4" /> Lưu bản nháp
              </Button>
          </CardFooter>
        </Card>

        {/* Main List */}
        <Card className="lg:col-span-3 border-emerald-100 shadow-sm rounded-2xl overflow-hidden min-h-[600px]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-50 bg-white/50">
            <div>
              <CardTitle className="text-xl">Danh Sách Vật Tư Đối Soát</CardTitle>
              <CardDescription>
                {selectedWorkshop ? (
                  <span>Đang kiểm kê: <span className="font-bold text-emerald-700">{WORKSHOPS.find(w => w.code === selectedWorkshop)?.name}</span></span>
                ) : "Vui lòng chọn kho để bắt đầu"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
               {totalDiffItems > 0 && (
                <Badge variant="destructive" className="rounded-lg px-2 py-1">
                  {totalDiffItems} mục chênh lệch
                </Badge>
               )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedWorkshop ? (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground opacity-50">
                <Package size={64} className="mb-4" />
                <p className="text-lg font-medium">Bắt đầu bằng cách chọn một kho</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-emerald-50/30 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[120px] font-bold">Mã VT</TableHead>
                      <TableHead className="font-bold">Tên Vật Tư</TableHead>
                      <TableHead className="text-right font-bold">Hệ Thống</TableHead>
                      <TableHead className="w-[150px] text-center font-bold">Thực Tế</TableHead>
                      <TableHead className="text-right font-bold w-[120px]">Chênh Lệch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => {
                      const diff = item.actualQty - item.systemQty;
                      return (
                        <TableRow key={item.materialId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-50 dark:border-slate-800/50">
                          <TableCell className="px-6 py-4">
                            <span className="data-label text-slate-500">{item.materialId}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground uppercase">{item.materialName}</span>
                              <span className="content-text text-[10px] text-slate-400 uppercase font-bold">{item.unit}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <span className="data-label text-sm text-sky-600 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 rounded-xl tabular-nums font-bold">{item.systemQty.toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              className={`text-center h-9 rounded-lg font-bold ${diff !== 0 ? 'border-amber-400 bg-amber-50' : 'border-emerald-100'}`}
                              value={item.actualQty}
                              onChange={e => handleQtyChange(item.materialId, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                             {diff === 0 ? (
                               <span className="text-muted-foreground text-xs italic">Khớp</span>
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
            )}
          </CardContent>
          <CardFooter className="border-t bg-emerald-50/20 p-4">
             <div className="flex items-center gap-2 text-xs text-muted-foreground">
               <Info size={14} className="text-emerald-600" />
               <span>Mẹo: Nhấn "Reset số lượng" nếu bạn muốn bắt đầu lại từ đầu với dữ liệu hệ thống.</span>
             </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
