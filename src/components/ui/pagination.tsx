import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    className?: string;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export const Pagination: React.FC<PaginationProps> = ({
    currentPage, totalPages, total, limit, onPageChange, onLimitChange, className = ''
}) => {
    if (total === 0) return null;

    const startItem = (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, total);

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className={`flex items-center justify-between flex-wrap gap-3 py-3 px-1 text-sm ${className}`}>
            {/* Info */}
            <div className="text-muted-foreground whitespace-nowrap">
                Hiển thị <span className="font-medium text-foreground">{startItem}-{endItem}</span> / <span className="font-medium text-foreground">{total.toLocaleString()}</span> mục
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
                {/* Rows per page */}
                {onLimitChange && (
                    <div className="flex items-center gap-1.5 mr-3">
                        <span className="text-muted-foreground">Hiển thị</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Page buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Trang đầu"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Trang trước"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {getPageNumbers().map((pageNum, idx) => (
                        pageNum === '...' ? (
                            <span key={`dots-${idx}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground">…</span>
                        ) : (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-md border text-sm font-medium transition-colors ${pageNum === currentPage
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'border-input bg-background hover:bg-accent'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        )
                    ))}

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Trang sau"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Trang cuối"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
