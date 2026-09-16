import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { requireMinistryContext } from "@/features/context/queries";
import { getCurrentActiveTerm, getTerms } from "@/features/ministry/queries";
import {
  safePageSize,
  termSearchParamsCache,
} from "@/features/ministry/search-params";

export const metadata: Metadata = { title: "Ministry Terms" };
export default async function MinistryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ministrySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ministrySlug } = await params;
  const [context, query, resolvedSearchParams] = await Promise.all([
    requireMinistryContext(ministrySlug),
    termSearchParamsCache.parse(searchParams),
    searchParams,
  ]);
  if (!context) notFound();

  // A ministry link opens its currently active term. `view=terms` is the
  // deliberate escape hatch for term administration and preserves the
  // selected ministry in the URL without making users choose a term first.
  if (resolvedSearchParams.view !== "terms") {
    const activeTerm = await getCurrentActiveTerm(context.ministry.slug);
    if (activeTerm) {
      redirect(
        `/admin/ministries/${context.ministry.slug}/terms/${activeTerm.term.slug}`,
      );
    }
  }

  const result = await getTerms(context.ministry.slug, {
    ...query,
    page: Math.max(1, query.page),
    pageSize: safePageSize(query.pageSize),
  });
  return (
    <AdminPageContainer>
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
    </AdminPageContainer>
  );
}
