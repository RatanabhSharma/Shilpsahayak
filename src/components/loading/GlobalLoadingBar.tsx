import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export function GlobalLoadingBar() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching > 0 || mutating > 0;

  if (!active) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[110] h-[2px] overflow-hidden bg-[#ded8ce]"
      role="progressbar"
      aria-label="Loading"
      aria-valuetext="Loading"
    >
      <div className="ss-loading-progress h-full w-1/3 bg-[#b4491e]" />
    </div>
  );
}



