import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PortalHeaderSkeleton({ backLink = false }: { backLink?: boolean }) {
  return (
    <div className="space-y-2">
      {backLink && <Skeleton className="mb-3 h-4 w-24" />}
      <Skeleton className="h-8 w-56 max-w-full sm:h-9" />
      {backLink && <Skeleton className="h-4 w-80 max-w-full" />}
    </div>
  );
}

function PortalTabsSkeleton() {
  return (
    <div className="bg-muted/50 flex gap-3 rounded-xl p-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  );
}

function PortalRowsSkeleton({ members = false }: { members?: boolean }) {
  return (
    <div className="space-y-3 md:space-y-0 md:divide-y md:overflow-hidden md:rounded-xl md:border">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="bg-card flex min-h-14 items-center gap-3 rounded-2xl border p-4 md:rounded-none md:border-0"
        >
          <Skeleton
            className={`size-10 shrink-0 ${members ? "rounded-full" : "rounded-lg"}`}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          {members && (
            <Skeleton className="hidden h-4 w-24 shrink-0 md:block" />
          )}
        </div>
      ))}
    </div>
  );
}

export function PortalDashboardSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-24 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8"
      role="status"
      aria-label="Loading portal dashboard"
    >
      <span className="sr-only">Loading portal dashboard, please wait.</span>
      <div className="space-y-5" aria-hidden="true">
        <PortalHeaderSkeleton />
        <PortalTabsSkeleton />
        <div className="border-b py-4">
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="admin-panel">
              <CardContent className="flex min-h-14 items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 max-w-full" />
                  <Skeleton className="h-4 w-52 max-w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PortalCollectionSkeleton({
  variant,
}: {
  variant: "sessions" | "members" | "department";
}) {
  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
      role="status"
      aria-label="Loading portal collection"
    >
      <span className="sr-only">Loading portal collection, please wait.</span>
      <div className="mx-auto max-w-4xl space-y-6" aria-hidden="true">
        <PortalHeaderSkeleton backLink />
        {variant === "department" && <PortalTabsSkeleton />}
        <div className="space-y-2 border-b pb-4">
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <PortalRowsSkeleton members={variant === "members"} />
        <Skeleton className="h-4 w-40 max-w-full" />
      </div>
    </div>
  );
}

export function PortalDetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 lg:px-8"
      role="status"
      aria-label="Loading session details"
    >
      <span className="sr-only">Loading session details, please wait.</span>
      <div className="mx-auto max-w-4xl space-y-6" aria-hidden="true">
        <PortalHeaderSkeleton backLink />
        <Card className="admin-panel">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-48 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32 max-w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <PortalTabsSkeleton />
        <PortalRowsSkeleton members />
      </div>
    </div>
  );
}
