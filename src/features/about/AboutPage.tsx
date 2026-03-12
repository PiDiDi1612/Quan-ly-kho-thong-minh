import React from 'react';
import { Heart, Code2, Package, Users, Activity, Globe, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TECH_STACK = [
  { name: 'React 18', desc: 'UI Framework', color: 'sky' },
  { name: 'TypeScript', desc: 'Type Safety', color: 'blue' },
  { name: 'Electron', desc: 'Desktop App', color: 'violet' },
  { name: 'SQLite', desc: 'Local Database', color: 'amber' },
  { name: 'TailwindCSS', desc: 'Styling', color: 'emerald' },
  { name: 'Vite', desc: 'Build Tool', color: 'purple' },
  { name: 'Express.js', desc: 'API Server', color: 'green' },
  { name: 'Zustand', desc: 'State Mgmt', color: 'rose' },
];

const FEATURES = [
  { icon: Package, label: 'Quản lý vật tư', desc: 'Theo dõi tồn kho đa xưởng thời gian thực' },
  { icon: Activity, label: 'Lịch sử giao dịch', desc: 'Nhật ký đầy đủ mọi phiếu nhập/xuất/chuyển kho' },
  { icon: Users, label: 'Phân quyền người dùng', desc: 'Hệ thống RBAC đa cấp độ truy cập' },
  { icon: Shield, label: 'Bảo mật', desc: 'JWT Authentication, mã hóa mật khẩu Bcrypt' },
  { icon: Zap, label: 'Real-time Sync', desc: 'Cập nhật dữ liệu tự động qua WebSocket' },
  { icon: Globe, label: 'Mạng LAN', desc: 'Chạy đa máy trên cùng mạng nội bộ' },
];

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-2">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-600 shadow-2xl shadow-emerald-500/30 mb-4">
          <Activity size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground">SmartStock WMS</h1>
        <p className="text-muted-foreground text-lg font-medium max-w-xl mx-auto">
          Hệ thống Quản lý Kho thông minh dành cho doanh nghiệp sản xuất — đơn giản, nhanh và đáng tin cậy.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-bold px-3 py-1 text-xs">
            v3.7.00
          </Badge>
          <Badge variant="outline" className="font-bold text-xs px-3 py-1">
            Production Ready
          </Badge>
          <Badge variant="outline" className="font-bold text-xs px-3 py-1 border-sky-200 text-sky-600">
            Electron · LAN
          </Badge>
        </div>
      </div>

      {/* Features */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Zap size={18} className="text-emerald-600" />
            Tính năng chính
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border hover:bg-muted/70 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0">
                <f.icon size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Code2 size={18} className="text-sky-600" />
            Công nghệ sử dụng
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {TECH_STACK.map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-muted/40 border border-border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors min-w-[80px]">
              <span className="font-black text-sm text-foreground">{t.name}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Credits */}
      <Card className="shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-sky-500" />
        <CardContent className="p-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Heart size={16} className="text-rose-500 fill-rose-400" />
            <span className="text-sm font-medium">Được xây dựng với tâm huyết</span>
          </div>
          <p className="text-foreground font-extrabold text-xl">Phòng Kỹ Thuật — Xưởng Ống Gió</p>
          <p className="text-muted-foreground text-sm">
            Hệ thống được thiết kế và phát triển nội bộ nhằm số hóa và tối ưu hóa quy trình quản lý kho vật tư sản xuất.
          </p>
          <p className="text-[11px] text-muted-foreground/70 font-medium pt-2">
            © {new Date().getFullYear()} SmartStock WMS · Bản quyền nội bộ
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
