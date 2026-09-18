interface PageLoadingProps {
  label?: string;
}

export function PageLoading({ label = 'Loading' }: PageLoadingProps) {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center bg-[#F0F4F8] dark:bg-[#0f172a] px-6 transition-colors duration-200"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto h-px w-24 overflow-hidden bg-zinc-200 dark:bg-slate-700">
          <div className="ss-loading-progress h-full w-1/2 bg-brand-500" />
        </div>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-charcoal-lighter dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}



