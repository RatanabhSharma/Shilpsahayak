import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, LucideIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  footer?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyMessage = 'There are no items matching your criteria.',
  emptyIcon,
  emptyAction,
  onRowClick,
  sortKey,
  sortDirection,
  onSort,
  footer,
  className = '',
}: DataTableProps<T>) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`rounded-xl border border-line bg-white shadow-xs overflow-hidden flex flex-col ${className}`}>
      <div className="overflow-x-auto min-h-[160px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-shell/50 border-b border-line text-[10px] font-mono font-bold uppercase tracking-wider text-muted select-none">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignment = alignClasses[col.align || 'left'];

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-5 py-3 ${alignment} ${col.headerClassName || ''} ${
                      col.sortable ? 'cursor-pointer hover:text-ink transition-colors' : ''
                    }`}
                    onClick={() => {
                      if (col.sortable && onSort) {
                        onSort(col.key);
                      }
                    }}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right'
                          ? 'justify-end'
                          : col.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-muted">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-accent" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-accent" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-line font-sans text-xs">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={`skeleton-cell-${col.key}`} className="px-5 py-4">
                      <div className="h-4 bg-shell rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyMessage}
                    icon={emptyIcon}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const key = keyExtractor(item, index);
                const isClickable = typeof onRowClick === 'function';

                return (
                  <tr
                    key={key}
                    onClick={() => {
                      if (isClickable) onRowClick(item);
                    }}
                    className={`transition-colors ${
                      isClickable ? 'cursor-pointer hover:bg-shell/60' : 'hover:bg-shell/40'
                    }`}
                  >
                    {columns.map((col) => {
                      const alignment = alignClasses[col.align || 'left'];
                      const content = col.render
                        ? col.render(item, index)
                        : (item as any)[col.key];

                      return (
                        <td
                          key={`${key}-${col.key}`}
                          className={`px-5 py-3.5 ${alignment} ${col.className || ''}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {footer && <div className="mt-auto">{footer}</div>}
    </div>
  );
}

