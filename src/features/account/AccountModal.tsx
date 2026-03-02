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
          <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase flex items-center gap-3">
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
          <div className="bg-sky-50/50 dark:bg-sky-900/10 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/30">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-sky-600 dark:bg-sky-500 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-sky-600/20">
                {currentUser.fullName[0]}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{currentUser.fullName}</p>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{currentUser.username}</p>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${currentUser.role === 'ADMIN'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : currentUser.role === 'WAREHOUSE'
                      ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                      : currentUser.role === 'PLANNING'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  {currentUser.role === 'ADMIN' ? 'Quản trị viên' : currentUser.role === 'WAREHOUSE' ? 'Quản lý kho' : currentUser.role === 'PLANNING' ? 'Phòng kế hoạch' : 'Khách'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Họ và tên</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-[#0f172a] transition-all input-focus"
                value={accountForm.fullName || currentUser.fullName}
                onChange={e => setAccountForm(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-[#0f172a] transition-all input-focus"
                value={accountForm.email || currentUser.email || ''}
                onChange={e => setAccountForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-4 flex items-center gap-2">
              <Lock size={16} /> Đổi mật khẩu
            </h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-[#0f172a] transition-all input-focus"
                  placeholder="********"
                  value={accountForm.currentPassword}
                  onChange={e => setAccountForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Mật khẩu mới</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-[#0f172a] transition-all input-focus"
                  placeholder="********"
                  value={accountForm.newPassword}
                  onChange={e => setAccountForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-[#0f172a] transition-all input-focus"
                  placeholder="********"
                  value={accountForm.confirmPassword}
                  onChange={e => setAccountForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 shrink-0 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-3">
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn thiết lập lại kết nối? Ứng dụng sẽ khởi động lại.')) {
                localStorage.removeItem('connection_config');
                window.location.reload();
              }
            }}
            className="w-full py-4 border-2 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-xl transition-all uppercase tracking-wider text-xs hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center gap-2"
          >
            <RefreshCcw size={16} /> Thiết lập lại kết nối
          </button>

          {isServerMode && (
            <button
              onClick={onBackup}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all uppercase tracking-wider text-xs hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Download size={16} /> Sao lưu dữ liệu (Desktop)
            </button>
          )}

          <button
            onClick={onUpdate}
            className="btn-gradient-primary w-full py-4 text-white rounded-xl font-extrabold hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2"
          >
            <Check size={18} /> Lưu cập nhật tài khoản
          </button>
        </div>
      </div>
    </div>
  );
};

