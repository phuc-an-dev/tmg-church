import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function IconsLoading() {
  return (
    <AdminPageContainer>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="space-y-3 lg:col-span-7">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </AdminPageContainer>
  );
}
