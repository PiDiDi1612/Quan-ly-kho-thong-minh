import React, { Dispatch, SetStateAction } from 'react';
import { CLASSIFICATIONS, WORKSHOPS } from '@/constants';
import { Material } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

interface MaterialFormModalProps {
  isOpen: boolean;
  editingMaterial: Material | null;
  formData: Partial<Material>;
  setFormData: Dispatch<SetStateAction<Partial<Material>>>;
  onClose: () => void;
  onSave: () => void;
}

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  isOpen,
  editingMaterial,
  formData,
  setFormData,
  onClose,
  onSave,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingMaterial ? 'Cập nhật vật tư' : 'Thêm vật tư mới'} maxWidth="max-w-2xl">
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Tên vật tư (*)</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-14 rounded-2xl font-black border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 shadow-sm bg-white dark:bg-slate-900 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Đơn vị (*)</label>
                <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="h-14 rounded-2xl font-black border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Xưởng</label>
                <select value={formData.workshop} disabled={!!editingMaterial} onChange={(e) => setFormData({ ...formData, workshop: e.target.value as any })} className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-black focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-sm cursor-pointer dark:text-slate-200">
                  {WORKSHOPS.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Phân loại</label>
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl h-14 border border-slate-200 dark:border-slate-700 shadow-inner">
                {CLASSIFICATIONS.map((c) => (
                  <button key={c} onClick={() => setFormData({ ...formData, classification: c as any })} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${formData.classification === c ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-md' : 'text-slate-500'}`}>{c === 'Vật tư chính' ? 'Chính' : 'Phụ'}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-rose-500 block mb-2 ml-1">Định mức an toàn</label>
              <Input type="number" value={formData.minThreshold} onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })} className="h-14 rounded-2xl font-black text-rose-600 border-rose-200 bg-rose-50/30 dark:bg-rose-900/10 shadow-sm text-lg" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-2">
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Xuất xứ</label>
            <Input value={formData.origin || ''} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} placeholder="VD: Việt Nam" className="h-14 rounded-2xl font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm" />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Mã khách hàng</label>
            <Input value={(formData as any).customerCode || ''} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value } as any)} placeholder="Mã KH (nếu có)" className="h-14 rounded-2xl font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm" />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Link ảnh (URL)</label>
          <Input value={formData.image || ''} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." className="h-14 rounded-2xl font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm" />
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-2 ml-1">Ghi chú</label>
          <textarea value={formData.note || ''} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Ghi chú thêm về vật tư..." className="w-full min-h-[120px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm font-black focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none shadow-sm transition-all" />
        </div>

        <div className="flex gap-4 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all" onClick={onClose}>Hủy bỏ</Button>
          <Button className="flex-[2] h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-sm uppercase tracking-wider btn-hover-effect active:scale-[0.98]" onClick={onSave}>
            Lưu thông tin
          </Button>
        </div>
      </div>
    </Modal>
  );
};
