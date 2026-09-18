import { LucideIcon, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-line bg-white p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-shell border border-line flex items-center justify-center text-muted mb-4 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>

      <h3 className="font-display text-base font-bold text-ink">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 text-xs text-muted font-sans max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              to={action.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white font-sans text-xs font-semibold hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white font-sans text-xs font-semibold hover:bg-accent-dark transition-colors shadow-xs shadow-accent/20 cursor-pointer"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
