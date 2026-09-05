import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  change?: {
    value: string | number;
    isPositive: boolean;
    period?: string;
  };
  trend?: 'up' | 'down' | 'neutral';
  danger?: boolean;
  warning?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  change,
  danger = false,
  warning = false,
  onClick,
  className = '',
}: StatCardProps) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-white p-5 shadow-xs transition-all ${
        danger
          ? 'border-rose-200 bg-rose-50/30'
          : warning
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-line hover:border-accent/30'
      } ${isClickable ? 'cursor-pointer hover:shadow-sm' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
              danger
                ? 'text-rose-700'
                : warning
                ? 'text-amber-700'
                : 'text-muted'
            }`}
          >
            {title}
          </p>
          <p
            className={`mt-2 font-mono text-2xl font-bold tracking-tight truncate ${
              danger
                ? 'text-rose-600'
                : warning
                ? 'text-amber-700'
                : 'text-ink'
            }`}
          >
            {value}
          </p>
        </div>

        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              danger
                ? 'bg-rose-100 text-rose-700'
                : warning
                ? 'bg-amber-100 text-amber-700'
                : 'bg-accent/10 text-accent'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {(description || change) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2.5 font-sans text-xs">
          {description && (
            <span className="text-muted text-[11px] truncate font-medium">
              {description}
            </span>
          )}

          {change && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold shrink-0 ${
                change.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {change.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{change.value}</span>
              {change.period && (
                <span className="text-muted text-[10px] font-normal">
                  {change.period}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
