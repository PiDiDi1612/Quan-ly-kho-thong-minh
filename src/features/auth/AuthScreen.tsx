import React from 'react';
import {
  Settings,
  Warehouse,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  LayoutDashboard,
  ArrowRightLeft,
  Check
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
    <div className="flex min-h-screen items-center justify-center p-6 bg-background font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/15 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md bg-card border border-border shadow-2xl shadow-emerald-600/5 rounded-[2.5rem] p-8 xl:p-12 relative overflow-hidden backdrop-blur-sm z-10">
        <button
          onClick={() => setIsConnectionSetupOpen(!isConnectionSetupOpen)}
          type="button"
          className="absolute top-6 right-6 p-2.5 bg-muted/80 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-2xl z-20 transition-all active:scale-90"
          title="Thiết lập kết nối"
        >
          <Settings size={20} />
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex p-5 text-white bg-emerald-600 rounded-[2rem] shadow-xl shadow-emerald-500/20 mb-6 group hover:rotate-6 transition-transform duration-500">
            <Warehouse size={40} className="group-hover:scale-110 transition-transform" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tighter uppercase">
            SMART<span className="text-emerald-600">STOCK</span>
          </h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 opacity-60">
            {isConnectionSetupOpen ? 'Thiết lập kết nối hệ thống' : 'Hệ thống quản lý kho v6.8 Professional'}
          </p>
        </div>

        {!isConnectionSetupOpen ? (
          <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-70">Tên đăng nhập</label>
              <div className="relative group/input">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-emerald-600 transition-colors" size={18} />
                <input
                  type="text"
                  autoComplete="username"
                  className="w-full pl-12 pr-5 py-4 bg-muted/50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-emerald-600/10 focus:border-emerald-600/50 outline-none transition-all placeholder:text-muted-foreground/40 text-sm"
                  placeholder="Nhập tên tài khoản..."
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-70">Mật khẩu</label>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-emerald-600 transition-colors" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-4 bg-muted/50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-emerald-600/10 focus:border-emerald-600/50 outline-none transition-all placeholder:text-muted-foreground/40 text-sm"
                  placeholder="Nhập mật khẩu..."
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-600 transition-colors z-20 p-1 active:scale-90"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="remember-me"
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border border-border bg-muted/50 transition-all checked:border-emerald-600 checked:bg-emerald-600"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <Check className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <label htmlFor="remember-me" className="cursor-pointer text-xs font-bold text-muted-foreground select-none hover:text-foreground transition-colors">
                  Ghi nhớ phiên đăng nhập
                </label>
              </div>
            </div>

            {loginError && (
              <div className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-2xl animate-in shake duration-300">
                <p className="text-[10px] font-black text-rose-600 text-center uppercase tracking-wider uppercase">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!loginForm.username || !loginForm.password}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs btn-hover-effect"
            >
              Đăng nhập ngay
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleSaveConnection('SERVER')}
                className="p-6 border border-border rounded-[2rem] bg-card hover:border-emerald-600/50 hover:bg-emerald-50/10 transition-all group flex items-center gap-5 shadow-sm active:scale-95"
              >
                <div className="p-4 bg-muted group-hover:bg-emerald-100 text-muted-foreground group-hover:text-emerald-600 rounded-2xl transition-colors shadow-inner">
                  <LayoutDashboard size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Máy chủ (Server)</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Triển khai hệ thống tại chỗ</p>
                </div>
              </button>

              <div className="p-6 border border-border rounded-[2rem] bg-muted/20 space-y-4">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-muted text-muted-foreground rounded-2xl shadow-inner">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Máy khách (Client)</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Kết nối tới Server IP</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    placeholder="Nhập IP Server (VD: 192.168.1.100)"
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl font-bold text-xs text-center focus:ring-4 focus:ring-emerald-600/10 outline-none transition-all"
                    value={tempIp}
                    onChange={e => setTempIp(e.target.value)}
                  />
                  <button
                    onClick={() => tempIp && handleSaveConnection('CLIENT', tempIp)}
                    disabled={!tempIp}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50 transition-all shadow-md active:scale-95"
                  >
                    Xác nhận kết nối
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsConnectionSetupOpen(false)}
              className="w-full py-2 text-muted-foreground hover:text-emerald-600 font-bold uppercase text-[10px] tracking-[0.2em] transition-all"
            >
              Quay lại đăng nhập
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-30 select-none">
        Powered by Antigravity Performance
      </div>
    </div>
  );
};

export default AuthScreen;

