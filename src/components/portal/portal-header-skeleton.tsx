import { Skeleton } from "@/components/ui/skeleton";

export function PortalHeaderSkeleton() {
  return (
    <header
      aria-hidden="true"
      className="border-border/80 bg-card sticky top-0 z-40 border-b"
    >
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 space-y-1">
            <Skeleton className="h-5 w-28 max-w-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        <Skeleton className="size-11 shrink-0 rounded-xl" />
      </div>
    </header>
  );
}
