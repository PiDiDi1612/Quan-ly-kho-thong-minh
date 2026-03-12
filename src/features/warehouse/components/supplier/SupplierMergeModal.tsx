import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Settings, ArrowRight, GitMerge } from 'lucide-react';
import { Supplier } from '@/types';

interface SupplierMergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    suppliers: Supplier[];
    selectedSuppliers: string[];
    mergeFormData: any;
    setMergeFormData: (data: any) => void;
    handleMergeSuppliers: () => void;
}

export const SupplierMergeModal: React.FC<SupplierMergeModalProps> = ({
    isOpen, onClose, suppliers, selectedSuppliers, mergeFormData, setMergeFormData, handleMergeSuppliers
}) => {
    const modalTitle = (
        <>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl">
                <GitMerge size={20} />
            </div>
            Hợp nhất NCC
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth="max-w-2xl"
            contentClassName="!p-0"
        >
            <div className="p-6 space-y-6">
                <div className="p-5 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800 shadow-inner">
                    <p className="text-sm font-medium text-sky-800 dark:text-sky-300 leading-relaxed">
                        Bạn đang hợp nhất <span className="font-black text-sky-600 dark:text-sky-400 px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900 rounded-lg">{selectedSuppliers.length} NCC</span> thành 1 nhà cung cấp duy nhất.
                    </p>
                    <p className="text-[11px] font-black text-sky-600/70 dark:text-sky-400/70 mt-2 uppercase tracking-wide flex items-center gap-1.5">
                        <ArrowRight size={14} className="stroke-[3]" /> Tất cả phiếu nhập cũ sẽ được cập nhật sang NCC mới.
                    </p>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Danh sách NCC được chọn</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
                        {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                            <div key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="font-black text-sky-600 dark:text-sky-400 text-xs px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded-lg tracking-widest uppercase">{s.code}</span>
                                <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">{s.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-5 pt-4">
                    <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Chọn thông tin NCC chính</h4>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mã NCC chính</label>
                        <select
                            value={mergeFormData.primaryCode}
                            onChange={e => setMergeFormData({ ...mergeFormData, primaryCode: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 shadow-sm transition-all uppercase tracking-widest"
                        >
                            {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                <option key={s.id} value={s.code}>{s.code}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên NCC chính</label>
                        <select
                            value={mergeFormData.primaryName}
                            onChange={e => setMergeFormData({ ...mergeFormData, primaryName: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 shadow-sm transition-all uppercase"
                        >
                            {suppliers.filter(s => selectedSuppliers.includes(s.id)).map(s => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mô tả</label>
                        <textarea
                            value={mergeFormData.description}
                            onChange={e => setMergeFormData({ ...mergeFormData, description: e.target.value })}
                            placeholder="Nhập mô tả mới hoặc để trống..."
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 shadow-sm transition-all resize-none min-h-[100px]"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-3xl">
                <button onClick={onClose} className="px-6 py-3 font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all">
                    Hủy bỏ
                </button>
                <button onClick={handleMergeSuppliers} className="px-10 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center gap-2">
                    <Settings size={16} className="stroke-[3]" /> Xác nhận hợp nhất
                </button>
            </div>
        </Modal>
    );
};
