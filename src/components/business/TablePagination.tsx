import React from 'react';
import { Pagination } from '@/components/ui/pagination';

interface TablePaginationProps {
  currentPage: number;
  pageLimit: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  itemLabel: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  pageLimit,
  totalItems,
  totalPages,
  onPageChange,
  onLimitChange,
  itemLabel,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const endItem = Math.min(currentPage * pageLimit, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200/60 shadow-sm">
        Hiển thị <span className="text-emerald-600">{startItem}</span> - <span className="text-emerald-600">{endItem}</span> / {totalItems} {itemLabel}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={totalItems}
        limit={pageLimit}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </div>
  );
};
