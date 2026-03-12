import React from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExcelActionsProps {
  onExport: () => void;
  onImport: () => void;
}

export const ExcelActions: React.FC<ExcelActionsProps> = ({ onExport, onImport }) => {
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="h-12 px-4 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-emerald-600 shadow-sm group flex items-center gap-2" onClick={onExport} title="Xuất Excel">
        <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
        <span className="text-[11px] uppercase tracking-wider">Xuất Excel</span>
      </Button>
      <Button variant="outline" className="h-12 px-4 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-sky-600 shadow-sm group flex items-center gap-2" onClick={onImport} title="Nhập Excel">
        <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
        <span className="text-[11px] uppercase tracking-wider">Nhập Excel</span>
      </Button>
    </div>
  );
};
