import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  isFiltered?: boolean;
  resultCount?: number;
  className?: string;
}

export function FilterBar({
  children,
  onReset,
  isFiltered = false,
  resultCount,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`rounded-xl border border-line bg-white p-4 shadow-xs space-y-3 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {children}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          {typeof resultCount === 'number' && (
            <span className="font-mono text-[11px] text-muted font-medium">
              {resultCount} {resultCount === 1 ? 'record' : 'records'}
            </span>
          )}

          {isFiltered && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-shell hover:bg-zinc-200/70 text-ink font-mono text-xs font-semibold transition-colors cursor-pointer"
              title="Reset all filters to default"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

