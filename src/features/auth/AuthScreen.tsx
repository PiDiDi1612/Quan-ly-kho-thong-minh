import React from 'react';
import {
  Settings,
  Warehouse,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  LayoutDashboard,
  ArrowRightLeft
} from 'lucide-react';

interface AuthScreenProps {
  isConnectionSetupOpen: boolean;
  setIsConnectionSetupOpen: (v: boolean) => void;
  handleSaveConnection: (mode: 'SERVER' | 'CLIENT', ip?: string) => void;
  tempIp: string;
  setTempIp: (v: string) => void;
  handleLogin: (e: React.FormEvent) => void | Promise<void>;
  loginForm: { username: string; password: string };
  setLoginForm: (v: { username: string; password: string }) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  loginError: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isConnectionSetupOpen,
  setIsConnectionSetupOpen,
  handleSaveConnection,
  tempIp,
  setTempIp,
  handleLogin,
  loginForm,
  setLoginForm,
  showPassword,
  setShowPassword,
  loginError
}) => {
  return (
    <div className="app-bg-gradient app-readable flex min-h-screen items-center justify-center p-6 font-inter transition-colors duration-300">
      <div className="glass-panel glass-strong w-full max-w-md rounded-[2.5rem] p-8 xl:p-12 border border-white/40 dark:border-slate-700/70 relative overflow-hidden">
        <button
          onClick={() => setIsConnectionSetupOpen(!isConnectionSetupOpen)}
          className="absolute top-6 right-6 p-3 app-surface text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl z-10"
          title="Thiết lập kết nối"
        >
          <Settings size={20} />
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex p-5 text-white bg-brand-gradient rounded-[2rem] shadow-xl shadow-blue-500/30 mb-6">
            <Warehouse size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tighter italic uppercase">
            SMART<span className="text-blue-600 dark:text-blue-400">STOCK</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mt-3">
            {isConnectionSetupOpen ? 'Thiết lập kết nối ban đầu' : 'Hệ thống quản lý kho v3.7'}
          </p>
        </div>

        {!isConnectionSetupOpen ? (
          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase ml-1">Tên đăng nhập</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  autoComplete="off"
                  className="app-input pl-12 pr-5 py-4 rounded-2xl font-bold"
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase ml-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="app-input pl-12 pr-12 py-4 rounded-2xl font-bold"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-4 bg-red-50/90 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl animate-shake">
                <p className="text-xs font-bold text-red-600 dark:text-red-300 text-center uppercase tracking-wider">{loginError}</p>
              </div>
            )}

            <button type="submit" className="w-full py-5 btn-primary text-white rounded-2xl font-extrabold uppercase text-sm tracking-widest active:scale-95">
              Đăng nhập
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleSaveConnection('SERVER')}
                className="p-6 border border-slate-200/80 dark:border-slate-700 rounded-3xl app-surface hover:border-blue-500/70 dark:hover:border-blue-500/60 transition-all group flex items-center gap-4"
              >
                <div className="p-3 bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/35 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 rounded-2xl transition-colors">
                  <LayoutDashboard size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase">Máy chủ (Server)</h3>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Dùng cho máy chính</p>
                </div>
              </button>

              <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-2xl">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase">Máy khách (Client)</h3>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Kết nối máy chủ khác</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="IP máy chủ (VD: 192.168.1.10)"
                    className="app-input px-4 py-3 font-bold text-sm text-center"
                    value={tempIp}
                    onChange={e => setTempIp(e.target.value)}
                  />
                  <button
                    onClick={() => tempIp && handleSaveConnection('CLIENT', tempIp)}
                    disabled={!tempIp}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-extrabold uppercase text-[10px] tracking-widest hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    Kết nối ngay
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsConnectionSetupOpen(false)}
              className="w-full py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold uppercase text-[10px] tracking-widest transition-all"
            >
              Quay lại đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
