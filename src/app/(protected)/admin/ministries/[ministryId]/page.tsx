import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { getMinistryContext, getTerms } from "@/features/ministry/queries";
import {
  safePageSize,
  termSearchParamsCache,
} from "@/features/ministry/search-params";
import { isUuid } from "@/lib/slug";

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

  if (isUuid(ministryId) && context.ministry.slug) {
    const search = new URLSearchParams();
    const resolvedSearchParams = await searchParams;
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === "string") search.set(key, value);
      else if (Array.isArray(value)) {
        for (const v of value) search.append(key, v);
      }
    }
    const qs = search.toString();
    redirect(`/admin/ministries/${context.ministry.slug}${qs ? `?${qs}` : ""}`);
  }

  const result = await getTerms(context.ministry.id, {
    ...query,
    page: Math.max(1, query.page),
    pageSize: safePageSize(query.pageSize),
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Terms"
        description={`Manage terms for ${context.ministry.name}.`}
        backLink={{
          href: "/admin/ministries",
          label: "Ministries",
        }}
      />
      <MinistryManagement
        mode="terms"
        title="Terms"
        description="Date-aware terms are organized within this ministry."
        result={result}
        ministryId={context.ministry.id}
        ministrySlug={context.ministry.slug}
      />
    </div>
  );
}
