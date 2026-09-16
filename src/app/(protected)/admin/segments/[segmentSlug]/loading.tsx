import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { Skeleton } from "@/components/ui/skeleton";
export default function SegmentDetailLoading() {
  return (
    <AdminPageContainer size="narrow">
      <Skeleton className="h-20 w-72" />
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-64 w-full" />
    </AdminPageContainer>
  );
}
