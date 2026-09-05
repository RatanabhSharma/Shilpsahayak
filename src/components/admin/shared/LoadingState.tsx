import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
}

export function LoadingState({
  message = 'Loading data...',
  submessage,
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 min-h-[260px] text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-7 h-7 animate-spin text-accent" />
      <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted font-semibold">
        {message}
      </p>
      {submessage && (
        <p className="mt-1 text-[11px] text-muted/80 font-sans">
          {submessage}
        </p>
      )}
    </div>
  );
}
