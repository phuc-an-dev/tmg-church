import { Skeleton } from "@/components/ui/skeleton";

export function CareListSkeleton({
  contentOnly = false,
}: {
  contentOnly?: boolean;
}) {
  return (
    <div
      className={
        contentOnly
          ? "space-y-3"
          : "mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6"
      }
      aria-label="Loading Care"
    >
      {!contentOnly && (
        <>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-11 w-full" />
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
export function CareDetailSkeleton() {
  return (
    <div className="space-y-5 p-4" aria-label="Loading follow-up">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-14" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
