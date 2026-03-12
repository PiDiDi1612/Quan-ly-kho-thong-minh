import React from 'react';
import { Plus } from 'lucide-react';
import { WORKSHOPS, CLASSIFICATIONS } from '@/constants';
import { MaterialClassification, WorkshopCode } from '@/types';
import { Button } from '@/components/ui/button';
import { DateRangeFilter } from '@/components/business/DateRangeFilter';
import { ExcelActions } from '@/components/business/ExcelActions';
import { SearchInput } from '@/components/business/SearchInput';

interface MaterialToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  workshopFilter: WorkshopCode | 'ALL';
  onWorkshopFilterChange: (value: WorkshopCode | 'ALL') => void;
  classFilter: MaterialClassification | 'ALL';
  onClassFilterChange: (value: MaterialClassification | 'ALL') => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  canManage: boolean;
  onExportExcel: () => void;
  onImportExcel: () => void;
  onCreate: () => void;
}

export const MaterialToolbar: React.FC<MaterialToolbarProps> = ({
  searchTerm,
  onSearchChange,
  workshopFilter,
  onWorkshopFilterChange,
  classFilter,
  onClassFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  canManage,
  onExportExcel,
  onImportExcel,
  onCreate,
}) => {
  return (
    <div className="space-y-4">
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Nhóm Tìm kiếm & Bộ lọc chính */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Tìm kiếm vật tư theo mã, tên..."
            className="pl-12 h-12 bg-white dark:bg-slate-900 border-slate-200 rounded-xl focus-visible:ring-emerald-600/20 font-bold shadow-sm w-full min-w-[350px]"
          />

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12 border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
            <button onClick={() => onWorkshopFilterChange('ALL')} className={`px-4 rounded-lg text-[10px] font-black tracking-widest transition-all ${workshopFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>TẤT CẢ</button>
            {WORKSHOPS.map((w) => (
              <button key={w.code} onClick={() => onWorkshopFilterChange(w.code)} className={`px-4 rounded-lg text-[10px] font-black tracking-widest transition-all ${workshopFilter === w.code ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{w.code}</button>
            ))}
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12 border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
            <button onClick={() => onClassFilterChange('ALL')} className={`px-4 rounded-lg text-[10px] font-black transition-all ${classFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>TẤT CẢ</button>
            {CLASSIFICATIONS.map((c) => (
              <button key={c} onClick={() => onClassFilterChange(c as MaterialClassification)} className={`px-4 rounded-lg text-[10px] font-black transition-all ${classFilter === c ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>{c === 'Vật tư chính' ? 'CHÍNH' : 'PHỤ'}</button>
            ))}
          </div>
        </div>

        {/* Nhóm Ngày tháng & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />

          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

          {canManage && (
            <div className="flex items-center gap-3">
              <ExcelActions onExport={onExportExcel} onImport={onImportExcel} />
              <Button
                className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-black btn-hover-effect px-6 flex items-center gap-2 whitespace-nowrap"
                onClick={onCreate}
              >
                <Plus size={20} />
                <span className="text-[11px] tracking-wider">THÊM MỚI</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};
