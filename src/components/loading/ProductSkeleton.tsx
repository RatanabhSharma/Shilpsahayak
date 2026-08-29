function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`ss-skeleton overflow-hidden bg-zinc-200/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
      <SkeletonBlock className="aspect-square w-full" />
      <div className="space-y-3 p-5">
        <SkeletonBlock className="h-2.5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-4/5 rounded-md" />
        <SkeletonBlock className="h-3.5 w-full rounded-md" />
        <div className="flex items-center justify-between pt-2">
          <SkeletonBlock className="h-5 w-20 rounded-md" />
          <SkeletonBlock className="h-3 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function FeaturedProductSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <SkeletonBlock className="aspect-[4/3] w-full rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[112px_1fr] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white sm:grid-cols-1 lg:grid-cols-[140px_1fr]"
          >
            <SkeletonBlock className="aspect-square w-full" />
            <div className="space-y-3 p-4">
              <SkeletonBlock className="h-2.5 w-14 rounded-full" />
              <SkeletonBlock className="h-4 w-4/5 rounded-md" />
              <SkeletonBlock className="h-3 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="relative overflow-hidden rounded-2xl bg-zinc-200">
          <SkeletonBlock className="aspect-[4/5] w-full" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <SkeletonBlock className="h-5 w-2/3 rounded-md bg-zinc-300" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkshopProductSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div>
        <SkeletonBlock className="aspect-square w-full rounded-2xl" />
        <div className="mt-4 flex gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-20 w-20 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="space-y-5 pt-2">
        <SkeletonBlock className="h-2.5 w-20 rounded-full" />
        <SkeletonBlock className="h-10 w-4/5 rounded-lg" />
        <SkeletonBlock className="h-8 w-28 rounded-lg" />
        <SkeletonBlock className="h-4 w-full rounded-md" />
        <SkeletonBlock className="h-4 w-11/12 rounded-md" />
        <SkeletonBlock className="h-12 w-40 rounded-xl" />
      </div>
    </div>
  );
}




