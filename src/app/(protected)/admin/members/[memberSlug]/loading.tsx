import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function MemberDetailLoading() {
  return (
    <AdminPageContainer>
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Profile Info Skeleton (No outer card background or border) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Skeleton className="size-12 shrink-0 rounded-2xl sm:size-14" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-7 w-48 max-w-full sm:w-64" />
            </div>
          </div>
          <Skeleton className="size-10 shrink-0 rounded-xl" />
        </div>
        <div className="admin-surface grid grid-cols-2 overflow-hidden sm:grid-cols-4">
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
        </div>
      </div>

      {/* Memberships Card Skeleton */}
      <div className="border-border/70 bg-card rounded-2xl border p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Skeleton className="h-6 w-44 max-w-full" />
            <Skeleton className="h-4 w-60 max-w-full" />
          </div>
          <Skeleton className="h-11 w-24 shrink-0 rounded-md" />
        </div>
        <div className="mt-5 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </AdminPageContainer>
  );
}
