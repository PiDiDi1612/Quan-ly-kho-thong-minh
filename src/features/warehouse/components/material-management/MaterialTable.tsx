import React from 'react';
import { Eye, Edit2, Package, Trash2 } from 'lucide-react';
import { Material } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/business/TablePagination';

interface MaterialTableProps {
  materials: Material[];
  isLoading: boolean;
  canManage: boolean;
  formatNumber: (value: number) => string;
  onView: (material: Material) => void;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
  currentPage: number;
  pageLimit: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (value: number) => void;
  onLimitChange: (value: number) => void;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
  materials,
  isLoading,
  canManage,
  formatNumber,
  onView,
  onEdit,
  onDelete,
  currentPage,
  pageLimit,
  totalItems,
  totalPages,
  onPageChange,
  onLimitChange,
}) => {
  return (
    <Card className="rounded-2xl overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px] font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">ẢNH</TableHead>
              <TableHead className="w-[250px] font-black uppercase text-[10px] tracking-widest text-slate-400">VẬT TƯ & MÃ</TableHead>
              <TableHead className="w-[100px] text-center font-black uppercase text-[10px] tracking-widest text-slate-400">PHÂN LOẠI</TableHead>
              <TableHead className="w-[80px] text-center font-black uppercase text-[10px] tracking-widest text-slate-400">KHO</TableHead>
              <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-slate-400">TỒN ĐẦU</TableHead>
              <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-emerald-500">NHẬP</TableHead>
              <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-rose-500">XUẤT</TableHead>
              <TableHead className="w-[120px] text-right font-black uppercase text-[10px] tracking-widest text-sky-600">TỒN CUỐI</TableHead>
              <TableHead className="w-[100px] text-right font-black uppercase text-[10px] tracking-widest text-slate-400">THAO TÁC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-14 w-full rounded-xl" /></TableCell></TableRow>
              ))
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-24">
                  <div className="flex flex-col items-center gap-3">
                    <Package size={48} className="text-slate-200" />
                    <p className="font-bold text-slate-400">Không tìm thấy vật tư nào</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              materials.map((m) => (
                <TableRow key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-100 dark:border-slate-800">
                  <TableCell className="py-4">
                    <div className="w-12 h-12 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-inner group-hover/row:scale-105 transition-transform mx-auto">
                      {m.image ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={20} /></div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-sm text-slate-700 dark:text-slate-200 line-clamp-1 group-hover:text-emerald-600 transition-colors">{m.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-sky-600 bg-sky-50 dark:bg-sky-900/30 px-1.5 rounded uppercase">{m.id}</span>
                        {m.customerCode && <span className="text-[9px] font-black text-emerald-600/70 uppercase">KH: {m.customerCode}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${m.classification === 'Vật tư chính' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' : 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400'}`}>{m.classification === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}</span></TableCell>
                  <TableCell className="text-center font-black text-[10px] text-slate-400">{m.workshop}</TableCell>
                  <TableCell className="text-right text-xs font-bold text-slate-400 tabular-nums">{formatNumber(m.openingStock ?? 0)}</TableCell>
                  <TableCell className="text-right text-xs font-black text-emerald-600 tabular-nums">{formatNumber(m.periodIn ?? 0)}</TableCell>
                  <TableCell className="text-right text-xs font-black text-rose-500 tabular-nums">{formatNumber(m.periodOut ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="flex flex-col items-end">
                      <span className={`text-base font-black ${(m.closingStock ?? m.quantity) <= m.minThreshold ? 'text-rose-600 animate-pulse' : 'text-sky-600'}`}>{formatNumber(m.closingStock ?? m.quantity)}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-sky-600 hover:bg-sky-50" onClick={() => onView(m)}><Eye size={16} /></Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => onEdit(m)}><Edit2 size={16} /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-600 hover:bg-rose-50" onClick={() => onDelete(m.id)}><Trash2 size={16} /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageLimit={pageLimit}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onLimitChange={(newLimit) => {
          onLimitChange(newLimit);
          onPageChange(1);
        }}
        itemLabel="vật tư"
      />
    </Card>
  );
};
