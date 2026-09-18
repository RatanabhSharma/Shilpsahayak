import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  // Calculate range of page numbers to show
  const getPageNumbers = () => {
    const delta = 1;
    const range: number[] = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift(-1); // ellipsis
    }
    if (currentPage + delta < totalPages - 1) {
      range.push(-2); // ellipsis
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const pages = totalPages > 1 ? getPageNumbers() : [1];

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endItem =
    totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border-t border-line font-sans text-xs ${className}`}
    >
      <div className="font-mono text-[11px] text-muted">
        {startItem !== null && endItem !== null && totalItems !== undefined ? (
          <span>
            Showing <strong className="text-ink">{startItem}</strong> to{' '}
            <strong className="text-ink">{endItem}</strong> of{' '}
            <strong className="text-ink">{totalItems}</strong> entries
          </span>
        ) : (
          <span>
            Page <strong className="text-ink">{currentPage}</strong> of{' '}
            <strong className="text-ink">{Math.max(1, totalPages)}</strong>
          </span>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-center sm:self-auto">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-ink hover:bg-shell disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {pages.map((p, index) => {
              if (p < 0) {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="w-7 text-center font-mono text-muted text-xs select-none"
                  >
                    …
                  </span>
                );
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg font-mono text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-accent text-white shadow-xs'
                      : 'border border-line text-ink hover:bg-shell'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-ink hover:bg-shell disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
