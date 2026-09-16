import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { requireMinistryContext } from "@/features/context/queries";
import { getCurrentActiveTerm, getTerms } from "@/features/ministry/queries";
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
  const [context, query, resolvedSearchParams] = await Promise.all([
    requireMinistryContext(ministryId),
    termSearchParamsCache.parse(searchParams),
    searchParams,
  ]);
  if (!context) notFound();

  if (isUuid(ministryId) && context.ministry.slug) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === "string") search.set(key, value);
      else if (Array.isArray(value)) {
        for (const v of value) search.append(key, v);
      }
    }
    const qs = search.toString();
    redirect(`/admin/ministries/${context.ministry.slug}${qs ? `?${qs}` : ""}`);
  }

  // A ministry link opens its currently active term. `view=terms` is the
  // deliberate escape hatch for term administration and preserves the
  // selected ministry in the URL without making users choose a term first.
  if (resolvedSearchParams.view !== "terms") {
    const activeTerm = await getCurrentActiveTerm(context.ministry.id);
    if (activeTerm) {
      redirect(
        `/admin/ministries/${context.ministry.slug}/terms/${activeTerm.term.slug}`,
      );
    }
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
        description="Set one dated active term to open its groups and departments directly."
        result={result}
        ministryId={context.ministry.id}
        ministrySlug={context.ministry.slug}
      />
    </div>
  );
}
