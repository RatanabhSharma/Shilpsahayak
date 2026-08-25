interface PageLoadingProps {
  label?: string;
}

export function PageLoading({ label = 'Loading' }: PageLoadingProps) {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center bg-[#f7f4ee] px-6"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto h-px w-24 overflow-hidden bg-[#ded8ce]">
          <div className="ss-loading-progress h-full w-1/2 bg-[#b4491e]" />
        </div>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8e8275]">
          {label}
        </p>
      </div>
    </div>
  );
}
