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
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
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
  loginError,
  rememberMe,
  setRememberMe
}) => {
  return (
    <div className="app-bg-gradient app-readable flex min-h-screen items-center justify-center p-6 font-inter transition-colors duration-300">
      <div className="glass-panel glass-strong w-full max-w-md rounded-[2.5rem] p-8 xl:p-12 border border-white/40 dark:border-slate-700/70 relative overflow-hidden">
        <button
          onClick={() => setIsConnectionSetupOpen(!isConnectionSetupOpen)}
          className="absolute top-6 right-6 p-3 app-surface text-slate-500 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 rounded-2xl z-10"
          title="Thiết lập kết nối"
        >
          <Settings size={20} />
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex p-5 text-white bg-brand-gradient rounded-[2rem] shadow-xl shadow-sky-500/30 mb-6">
            <Warehouse size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tighter italic uppercase">
            SMART<span className="text-sky-600 dark:text-sky-400">STOCK</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mt-3">
            {isConnectionSetupOpen ? 'Thiết lập kết nối ban đầu' : 'Hệ thống quản lý kho v6.8'}
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors z-10 p-1"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="remember-me"
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-sky-600 checked:bg-sky-600 dark:border-slate-600 dark:checked:border-sky-500 dark:checked:bg-sky-500"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
              <label htmlFor="remember-me" className="cursor-pointer text-sm font-bold text-slate-600 dark:text-slate-300 select-none">
                Ghi nhớ đăng nhập
              </label>
            </div>

            {loginError && (
              <div className="p-4 bg-red-50/90 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl animate-shake">
                <p className="text-xs font-bold text-red-600 dark:text-red-300 text-center uppercase tracking-wider">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!loginForm.username || !loginForm.password}
              className="btn-gradient-primary w-full py-4 text-white font-extrabold rounded-2xl hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              Đăng nhập
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleSaveConnection('SERVER')}
                className="p-6 border border-slate-200/80 dark:border-slate-700 rounded-3xl app-surface hover:border-emerald-500/70 dark:hover:border-emerald-500/60 transition-all group flex items-center gap-4"
              >
                <div className="p-3 bg-slate-100 dark:bg-slate-800 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/35 text-slate-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 rounded-2xl transition-colors">
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
                    className="w-full py-3 bg-sky-600 text-white rounded-xl font-extrabold uppercase text-[10px] tracking-widest hover:bg-sky-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-all shadow-lg shadow-sky-500/20"
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

