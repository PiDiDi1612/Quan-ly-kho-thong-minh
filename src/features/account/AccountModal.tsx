import React from 'react';
import { AlertCircle, Check, Download, Lock, RefreshCcw, User as UserIcon, X } from 'lucide-react';
import { User } from '@/types';

export interface AccountForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  fullName: string;
  email: string;
}

interface AccountModalProps {
  isOpen: boolean;
  currentUser: User | null;
  modalError: string | null;
  accountForm: AccountForm;
  setAccountForm: React.Dispatch<React.SetStateAction<AccountForm>>;
  isServerMode: boolean;
  onClose: () => void;
  onBackup: () => void;
  onUpdate: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  currentUser,
  modalError,
  accountForm,
  setAccountForm,
  isServerMode,
  onClose,
  onBackup,
  onUpdate
}) => {
  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 modal-backdrop">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#1e293b] rounded-[20px] p-8 flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase flex items-center gap-3">
            <UserIcon className="text-sky-600 dark:text-sky-400" size={24} /> Quản lý tài khoản
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
            <X size={24} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400" />
          </button>
        </div>

        {modalError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{modalError}</p>
          </div>
        )}

        <div className="space-y-4 overflow-y-auto no-scrollbar pr-2 flex-1 pb-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mb-2">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-sky-500/20 ring-4 ring-white dark:ring-slate-800">
                {currentUser.fullName[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{currentUser.fullName}</p>
                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">@{currentUser.username}</p>
                <div className="mt-3">
                  <span
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${currentUser.role === 'ADMIN'
                      ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800'
                      : currentUser.role === 'WAREHOUSE'
                        ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800'
                        : currentUser.role === 'PLANNING'
                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200'
                      }`}
                  >
                    {currentUser.role === 'ADMIN' ? 'Quản trị viên' : currentUser.role === 'WAREHOUSE' ? 'Quản lý kho' : currentUser.role === 'PLANNING' ? 'Phòng kế hoạch' : 'Khách'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Họ và tên</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm text-slate-800 dark:text-white uppercase outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all shadow-sm"
                value={accountForm.fullName || currentUser.fullName}
                onChange={e => setAccountForm(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm text-slate-800 dark:text-white uppercase outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all shadow-sm"
                value={accountForm.email || currentUser.email || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-4 flex items-center gap-2 px-1">
              <Lock size={14} className="text-amber-500" /> Đổi mật khẩu bảo mật
            </h4>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1 tracking-wider">Mật khẩu hiện tại <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all shadow-sm"
                  placeholder="********"
                  value={accountForm.currentPassword}
                  onChange={e => setAccountForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-wider">Mật khẩu mới</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all shadow-sm"
                  placeholder="********"
                  value={accountForm.newPassword}
                  onChange={e => setAccountForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-wider">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all shadow-sm"
                  placeholder="********"
                  value={accountForm.confirmPassword}
                  onChange={e => setAccountForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 shrink-0 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn thiết lập lại kết nối? Ứng dụng sẽ khởi động lại.')) {
                  localStorage.removeItem('connection_config');
                  window.location.reload();
                }
              }}
              className="flex-1 py-3.5 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black rounded-2xl transition-all uppercase tracking-wider text-[10px] hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCcw size={14} /> Reset kết nối
            </button>

            {isServerMode && (
              <button
                onClick={onBackup}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider text-[10px] hover:shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <Download size={14} /> Sao lưu DATA
              </button>
            )}
          </div>

          <button
            onClick={onUpdate}
            className="w-full py-4.5 bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-600 dark:to-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-sky-500/20 hover:shadow-sky-500/30 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 mt-1"
          >
            <Check size={18} className="stroke-[3]" /> Lưu thay đổi hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
};

