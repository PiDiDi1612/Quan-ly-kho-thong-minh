import React, { Dispatch, SetStateAction } from 'react';
import { CLASSIFICATIONS, WORKSHOPS } from '@/constants';
import { Material } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Package, Save } from 'lucide-react';

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
  const modalTitle = (
    <>
      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
        <Package size={20} />
      </div>
      {editingMaterial ? 'Sửa thông tin vật tư' : 'Thêm vật tư mới'}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-3xl" contentClassName="!p-0">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Tên vật tư <span className="text-red-500 font-bold">*</span></label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VÍ DỤ: ỐNG GIÓ TRÒN"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Đơn vị <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="text"
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="VÍ DỤ: CÁI"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Xưởng</label>
                <select
                  value={formData.workshop || ''}
                  disabled={!!editingMaterial}
                  onChange={(e) => setFormData({ ...formData, workshop: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all cursor-pointer"
                >
                  {WORKSHOPS.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Phân loại</label>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                {CLASSIFICATIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFormData({ ...formData, classification: c as any })}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                      formData.classification === c
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {c === 'Vật tư chính' ? 'Chính' : 'Phụ'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-rose-500 uppercase ml-1 tracking-wider">Định mức an toàn</label>
              <input
                type="number"
                value={formData.minThreshold || 0}
                onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-rose-50/30 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-2xl font-black text-lg text-rose-600 dark:text-rose-400 outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Xuất xứ</label>
            <input
              type="text"
              value={formData.origin || ''}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              placeholder="VD: Việt Nam"
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Mã khách hàng</label>
            <input
              type="text"
              value={(formData as any).customerCode || ''}
              onChange={(e) => setFormData({ ...formData, customerCode: e.target.value } as any)}
              placeholder="Mã KH (nếu có)"
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Link ảnh (URL)</label>
          <input
            type="text"
            value={formData.image || ''}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-1 tracking-wider">Ghi chú</label>
          <textarea
            value={formData.note || ''}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Ghi chú thêm về vật tư..."
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all resize-none min-h-[100px]"
          />
        </div>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-3xl">
        <button onClick={onClose} className="px-6 py-3 font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all">
          Hủy bỏ
        </button>
        <button
          onClick={onSave}
          className="px-10 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center gap-2"
        >
          <Save size={16} /> Lưu thông tin
        </button>
      </div>
    </Modal>
  );
};
