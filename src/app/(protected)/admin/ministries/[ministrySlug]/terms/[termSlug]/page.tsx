import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { requireTermContext } from "@/features/context/queries";
import { getStructure } from "@/features/ministry/queries";
import { structureSearchParamsCache } from "@/features/ministry/search-params";

export const metadata: Metadata = { title: "Term Structure" };
export default async function TermDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ministrySlug: string; termSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ministrySlug, termSlug } = await params;
  const [context, query] = await Promise.all([
    requireTermContext(ministrySlug, termSlug),
    structureSearchParamsCache.parse(searchParams),
  ]);
  if (!context) notFound();

  const section = query.section;
  const result = await getStructure(
    context.ministry.slug,
    context.term.slug,
    section,
  );
  const sectionLabel = section === "groups" ? "Groups" : "Departments";
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Term Structure"
        description={`Manage groups and departments for ${context.ministry.name} (${context.term.name}).`}
        backLink={{
          href: "/admin/ministries",
          label: "Ministries",
        }}
      />
      <NavigationTabs aria-label="Term structure sections">
        <NavigationTabLink href="?section=groups" active={section === "groups"}>
          Groups
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=departments"
          active={section === "departments"}
        >
          Departments
        </NavigationTabLink>
      </NavigationTabs>
      <MinistryManagement
        mode={section === "groups" ? "groups" : "departments"}
        title={sectionLabel}
        description={`Only ${sectionLabel.toLowerCase()} are loaded for the selected section.`}
        result={result}
        ministryId={context.ministry.id}
        ministrySlug={context.ministry.slug}
        termId={context.term.id}
        termSlug={context.term.slug}
      />
    </AdminPageContainer>
  );
}
