import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { Skeleton } from "@/components/ui/skeleton";
export default function SegmentsLoading() {
  return (
    <AdminPageContainer>
      <Skeleton className="h-20 w-72" />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    </AdminPageContainer>
  );
}
