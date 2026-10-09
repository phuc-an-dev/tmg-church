import { Skeleton } from "@/components/ui/skeleton";
export function AuditRowsSkeleton() {
  return (
    <div role="status" aria-label="Loading audit history" className="space-y-5">
      <span className="sr-only">Loading audit history.</span>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="mb-3 h-4 w-28" />
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="admin-item-card flex items-center gap-3 p-4 sm:p-5"
          >
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-3 w-44 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
