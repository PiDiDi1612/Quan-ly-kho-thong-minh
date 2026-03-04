import React from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExcelActionsProps {
  onExport: () => void;
  onImport: () => void;
}

export const ExcelActions: React.FC<ExcelActionsProps> = ({ onExport, onImport }) => {
  return (
    <>
      <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-emerald-600 shadow-sm p-0 group" onClick={onExport} title="Xuất Excel">
        <Download size={20} className="group-hover:scale-110 transition-transform" />
      </Button>
      <Button variant="outline" className="h-12 w-12 rounded-xl border-slate-200 bg-white dark:bg-slate-900 font-bold text-sky-600 shadow-sm p-0 group" onClick={onImport} title="Nhập Excel">
        <Upload size={20} className="group-hover:scale-110 transition-transform" />
      </Button>
    </>
  );
};
