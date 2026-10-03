import { Skeleton } from "@/components/ui/skeleton";

export default function AdminChurchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 sm:h-10 sm:w-64" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        {/* Church Profile Card Skeleton matching final card geometry */}
        <div className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] sm:p-5 md:p-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-5 w-40 sm:w-56" />
              <Skeleton className="h-3 w-28 sm:w-36" />
            </div>
          </div>
          <Skeleton className="size-11 shrink-0 rounded-xl md:size-9 md:rounded-lg" />
        </div>
      </div>
    </div>
  );
}
