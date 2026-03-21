import React from 'react';
import { DateInput } from '@/components/ui/date-input';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12 border border-slate-200 dark:border-slate-700 shadow-inner">
      <div className="flex items-center px-3 gap-2 border-r border-slate-200 dark:border-slate-700">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Từ</span>
        <DateInput value={startDate} onChange={onStartDateChange} className="w-28 border-none bg-transparent h-auto p-0 text-[13px] font-black text-emerald-600" />
      </div>
      <div className="flex items-center px-3 gap-2">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Đến</span>
        <DateInput value={endDate} onChange={onEndDateChange} className="w-28 border-none bg-transparent h-auto p-0 text-[13px] font-black text-emerald-600" />
      </div>
    </div>
  );
};
