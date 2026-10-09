import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditRowsSkeleton } from "@/features/audit/audit-skeleton";
export default function AuditLoading() {
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Audit"
        description="Activity and changes across TMG Church."
      />
      <div
        className="flex items-center justify-between gap-3"
        aria-hidden="true"
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>
      <AuditRowsSkeleton />
    </AdminPageContainer>
  );
}
