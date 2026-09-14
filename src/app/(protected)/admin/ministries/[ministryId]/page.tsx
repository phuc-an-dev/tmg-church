import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { getMinistryContext, getTerms } from "@/features/ministry/queries";
import {
  safePageSize,
  termSearchParamsCache,
} from "@/features/ministry/search-params";

export const metadata: Metadata = { title: "Ministry Terms" };
export default async function MinistryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ministryId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ministryId } = await params;
  const [context, query] = await Promise.all([
    getMinistryContext(ministryId),
    termSearchParamsCache.parse(searchParams),
  ]);
  if (!context) notFound();
  const result = await getTerms(ministryId, {
    ...query,
    page: Math.max(1, query.page),
    pageSize: safePageSize(query.pageSize),
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Terms"
        description={`Manage terms for ${context.ministry.name}.`}
      />
      <MinistryManagement
        mode="terms"
        title="Terms"
        description="Date-aware terms are organized within this ministry."
        result={result}
        ministryId={ministryId}
      />
    </div>
  );
}
