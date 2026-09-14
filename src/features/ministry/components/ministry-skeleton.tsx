import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

interface MinistryManagementSkeletonProps {
  mode?: "ministries" | "terms" | "groups" | "departments";
  rowCount?: number;
}

export function MinistryManagementSkeleton({
  mode = "ministries",
  rowCount = 3,
}: MinistryManagementSkeletonProps) {
  const isMinistry = mode === "ministries";
  const isTerm = mode === "terms";
  const hasSlug = isMinistry || isTerm;

  return (
    <div
      className="space-y-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
      aria-hidden="true"
    >
      {/* Toolbar Skeleton */}
      <div className="flex items-center gap-2 border-b pb-5">
        <div className="relative min-w-0 flex-1">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        {(isMinistry || isTerm) && (
          <>
            <Skeleton className="h-12 w-24 shrink-0 rounded-xl md:hidden" />
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              {isMinistry && <Skeleton className="h-12 w-44 rounded-xl" />}
              {isTerm && (
                <>
                  <Skeleton className="h-12 w-36 rounded-xl" />
                  <Skeleton className="h-12 w-44 rounded-xl" />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Collection List Skeleton: Mobile Cards / Desktop Table */}
      <div
        role="table"
        aria-label="Loading table"
        className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
      >
        {/* Desktop Table Header */}
        <div role="rowgroup">
          <div
            role="row"
            className={cn(
              "bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:items-center md:border-b md:px-4 md:py-3",
              isMinistry
                ? "md:grid-cols-[1fr_180px_120px_180px]"
                : isTerm
                  ? "md:grid-cols-[1fr_180px_120px_180px]"
                  : "md:grid-cols-[1fr_180px]",
            )}
          >
            <div role="columnheader">Name</div>
            {hasSlug && <div role="columnheader">Slug</div>}
            {isMinistry && <div role="columnheader">Terms</div>}
            {isTerm && <div role="columnheader">Status</div>}
            <div role="columnheader" className="text-right">
              Actions
            </div>
          </div>
        </div>

        {/* Rows: Mobile Stack / Desktop Rows */}
        <div
          role="rowgroup"
          className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
        >
          {Array.from({ length: rowCount }).map((_, index) => (
            <div
              key={index}
              role="row"
              className={cn(
                "bg-card relative rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] sm:p-5 md:grid md:items-center md:gap-4 md:rounded-none md:border-0 md:p-3 md:shadow-none",
                isMinistry
                  ? "md:grid-cols-[1fr_180px_120px_180px]"
                  : isTerm
                    ? "md:grid-cols-[1fr_180px_120px_180px]"
                    : "md:grid-cols-[1fr_180px]",
              )}
            >
              {/* Column 1: Identity & Name (and mobile triggers) */}
              <div role="cell" className="min-w-0">
                <div className="flex items-start justify-between gap-3 md:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                      <Skeleton
                        className={cn(
                          "h-5 rounded-md",
                          index % 3 === 0
                            ? "w-36 sm:w-44"
                            : index % 3 === 1
                              ? "w-48 sm:w-56"
                              : "w-32 sm:w-40",
                        )}
                      />
                      <div className="flex items-center gap-2 pt-0.5 md:hidden">
                        <Skeleton
                          className={cn(
                            "h-3.5 rounded-md",
                            index % 2 === 0 ? "w-44" : "w-36",
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Mobile 44x44 Action Trigger Placeholder */}
                  <Skeleton className="size-11 shrink-0 rounded-xl md:hidden" />
                </div>
              </div>

              {/* Column 2: Slug (Desktop) */}
              {hasSlug && (
                <div role="cell" className="hidden md:block">
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
              )}

              {/* Column 3: Count / Status (Desktop) */}
              {(isMinistry || isTerm) && (
                <div role="cell" className="hidden md:block">
                  <Skeleton
                    className={cn(
                      "h-4 rounded-md",
                      isMinistry ? "w-16" : "w-20",
                    )}
                  />
                </div>
              )}

              {/* Column 4: Actions (Desktop) */}
              <div role="cell" className="hidden md:flex md:justify-end">
                <Skeleton className="size-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)]">
        <div className="flex items-center justify-between gap-3 p-4">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t p-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-20 rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      {/* Floating Action Button Skeleton */}
      <Skeleton className="fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 h-12 w-36 rounded-full shadow-[0_18px_36px_-14px_color-mix(in_oklch,var(--primary)_70%,transparent)] md:right-8 md:bottom-8" />
    </div>
  );
}

export function MinistriesPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading ministries"
      className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading ministries, please wait...</span>

      {/* Header Skeleton matching AdminPageHeader */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-9 w-40 rounded-lg sm:h-10 sm:w-56" />
          <Skeleton className="h-5 w-72 max-w-full rounded-md sm:w-96" />
        </div>
      </div>

      {/* Management Collection Skeleton */}
      <MinistryManagementSkeleton mode="ministries" rowCount={3} />
    </div>
  );
}

export function MinistryDetailPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading ministry terms"
      className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading ministry terms, please wait...</span>

      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-9 w-32 rounded-lg sm:h-10 sm:w-48" />
          <Skeleton className="h-5 w-64 max-w-full rounded-md sm:w-80" />
        </div>
      </div>

      {/* Management Collection Skeleton for Terms */}
      <MinistryManagementSkeleton mode="terms" rowCount={3} />
    </div>
  );
}

export function TermDetailPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading term details"
      className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading term details, please wait...</span>

      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-9 w-40 rounded-lg sm:h-10 sm:w-52" />
          <Skeleton className="h-5 w-72 max-w-full rounded-md sm:w-80" />
        </div>
      </div>

      {/* Subnavigation Tabs Skeleton */}
      <Skeleton className="h-11 w-64 rounded-xl" />

      {/* Management Collection Skeleton for Groups / Departments */}
      <MinistryManagementSkeleton mode="groups" rowCount={3} />
    </div>
  );
}
