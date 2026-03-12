import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Settings, Users } from 'lucide-react';

interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: any;
    setFormData: (data: any) => void;
    editingSupplier: any;
    handleSave: () => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
    isOpen, onClose, formData, setFormData, editingSupplier, handleSave
}) => {
    const modalTitle = (
        <>
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-xl">
                <Users size={20} />
            </div>
            {editingSupplier ? "Sửa thông tin NCC" : "Thêm NCC mới"}
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            contentClassName="!p-0"
        >
            <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mã nhà cung cấp <span className="text-red-500 font-bold">*</span></label>
                    <input
                        type="text"
                        value={formData.code || ''}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        placeholder="VD: NCC001"
                        disabled={!!editingSupplier}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all disabled:opacity-50"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên nhà cung cấp <span className="text-red-500 font-bold">*</span></label>
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: CÔNG TY ABC"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mô tả (tùy chọn)</label>
                    <textarea
                        value={formData.description || ''}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ghi chú về nhà cung cấp..."
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all resize-none min-h-[100px]"
                        rows={3}
                    />
                </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-3xl">
                <button onClick={onClose} className="px-6 py-3 font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all">
                    Hủy bỏ
                </button>
                <button onClick={handleSave} className="px-10 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-sky-500/20 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center gap-2">
                    <Users size={16} /> Lưu thông tin
                </button>
            </div>
        </Modal>
    );
};
