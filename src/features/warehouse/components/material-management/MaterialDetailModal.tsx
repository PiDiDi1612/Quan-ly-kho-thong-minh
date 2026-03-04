import React from 'react';
import { History, Info, Package } from 'lucide-react';
import { Material, Transaction } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MaterialDetailModalProps {
  isOpen: boolean;
  viewingMaterial: Material | null;
  dashboardTab: 'INFO' | 'HISTORY';
  setDashboardTab: (value: 'INFO' | 'HISTORY') => void;
  transactions: Transaction[];
  formatNumber: (value: number) => string;
  onClose: () => void;
}

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  isOpen,
  viewingMaterial,
  dashboardTab,
  setDashboardTab,
  transactions,
  formatNumber,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="THÔNG TIN CHI TIẾT" maxWidth="max-w-4xl">
      {viewingMaterial && (
        <div className="grid grid-cols-12 gap-8 p-8 h-[650px]">
          <div className="col-span-4 border-r border-slate-100 dark:border-slate-800 pr-8 space-y-4">
            <div className="mb-8 text-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner">
              {viewingMaterial.image ? (
                <img src={viewingMaterial.image} alt="" className="w-32 h-32 mx-auto rounded-2xl object-cover mb-4 shadow-xl ring-4 ring-white" />
              ) : (
                <div className="w-32 h-32 mx-auto rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center mb-4 shadow-lg"><Package size={48} className="text-emerald-600" /></div>
              )}
              <h3 className="font-black text-sm uppercase leading-tight text-slate-700 dark:text-slate-200">{viewingMaterial.name}</h3>
              <Badge className="mt-2 bg-emerald-600 text-white hover:bg-emerald-600 border-none font-mono font-black">{viewingMaterial.id}</Badge>
            </div>

            <Button variant={dashboardTab === 'INFO' ? 'default' : 'ghost'} className={`w-full justify-start gap-4 h-12 rounded-xl font-bold transition-all ${dashboardTab === 'INFO' ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : ''}`} onClick={() => setDashboardTab('INFO')}><Info size={20} /> Tổng quan</Button>
            <Button variant={dashboardTab === 'HISTORY' ? 'default' : 'ghost'} className={`w-full justify-start gap-4 h-12 rounded-xl font-bold transition-all ${dashboardTab === 'HISTORY' ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : ''}`} onClick={() => setDashboardTab('HISTORY')}><History size={20} /> Lịch sử xuất/nhập</Button>
          </div>

          <div className="col-span-8 overflow-y-auto pr-2 no-scrollbar">
            {dashboardTab === 'INFO' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center">
                    <p className="text-[10px] font-black uppercase text-emerald-600/60 mb-2">Tồn kho hiện tại</p>
                    <p className="text-4xl font-black text-emerald-600">{formatNumber(viewingMaterial.closingStock ?? viewingMaterial.quantity)}</p>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">{viewingMaterial.unit}</span>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-800/50 text-center">
                    <p className="text-[10px] font-black uppercase text-rose-500/60 mb-2">Định mức an toàn</p>
                    <p className="text-4xl font-black text-rose-500">{formatNumber(viewingMaterial.minThreshold)}</p>
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic">{viewingMaterial.unit}</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl space-y-5 border border-slate-100 dark:border-slate-700 shadow-inner">
                  <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phân loại</span><span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{viewingMaterial.classification}</span></div>
                  <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Xưởng quản lý</span><span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{viewingMaterial.workshop}</span></div>
                  <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Xuất xứ</span><span className="text-xs font-black text-slate-700 dark:text-slate-300">{viewingMaterial.origin || 'N/A'}</span></div>
                  {viewingMaterial.customerCode && <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-700 pb-3"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mã khách hàng</span><span className="text-xs font-black uppercase text-emerald-600">{viewingMaterial.customerCode}</span></div>}
                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Ghi chú</p>
                    <div className="text-xs italic text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm leading-relaxed">{viewingMaterial.note || 'Không có ghi chú.'}</div>
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === 'HISTORY' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                      <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-700">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Ngày tháng</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Loại</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Số lượng</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Thực hiện</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .filter((t) => t.materialId === viewingMaterial.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 50)
                        .map((t) => (
                          <TableRow key={t.id} className="border-slate-100 dark:border-slate-800">
                            <TableCell className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{new Date(t.date).toLocaleDateString('vi-VN')} {t.transactionTime || ''}</TableCell>
                            <TableCell><span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${t.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{t.type === 'IN' ? 'Nhập' : 'Xuất'}</span></TableCell>
                            <TableCell className="text-right font-black text-sm tabular-nums"><span className={t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>{t.type === 'IN' ? '+' : '-'}{formatNumber(t.quantity)}</span></TableCell>
                            <TableCell className="text-[10px] font-black text-slate-400 uppercase">{t.user}</TableCell>
                          </TableRow>
                        ))}
                      {transactions.filter((t) => t.materialId === viewingMaterial.id).length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-300 italic text-xs">Chưa có lịch sử giao dịch nào.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
