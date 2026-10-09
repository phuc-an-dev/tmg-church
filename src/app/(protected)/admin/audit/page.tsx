import type { Metadata } from "next";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AuditList } from "@/features/audit/audit-list";
import { getAuditPage } from "@/features/audit/queries";
import {
  auditSearchParamsCache,
  auditFilterSchema,
  DEFAULT_AUDIT_FILTERS,
} from "@/features/audit/search-params";
export const metadata: Metadata = {
  title: "Audit",
  description: "Review TMG Church activity and data changes.",
};
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await auditSearchParamsCache.parse(searchParams);
  const parsed = auditFilterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : DEFAULT_AUDIT_FILTERS;
  const data = await getAuditPage(filters);
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Audit"
        description="Activity and changes across TMG Church."
      />
      <AuditList
        data={data}
        filters={filters}
        invalidFilters={!parsed.success}
      />
    </AdminPageContainer>
  );
}
