import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { TermDetailView } from "@/features/ministry/components/term-detail-view";
import { requireTermContext } from "@/features/context/queries";
import { getFrequentIcons } from "@/features/icon/queries";
import { getStructure, getTermDetailData } from "@/features/ministry/queries";
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
  const [context, query, frequentIcons] = await Promise.all([
    requireTermContext(ministrySlug, termSlug),
    structureSearchParamsCache.parse(searchParams),
    getFrequentIcons(),
  ]);
  if (!context) notFound();

  const section = query.section;
  const [structure, detail] = await Promise.all([
    section === "groups" || section === "departments"
      ? getStructure(context.ministry.slug, context.term.slug, section)
      : Promise.resolve(null),
    section === "members" || section === "sessions"
      ? getTermDetailData(context.ministry.slug, context.term.slug)
      : Promise.resolve(null),
  ]);
  const sectionLabel = section === "groups" ? "Groups" : "Departments";
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Term Detail"
        description={`Manage members, groups, departments, and sessions for ${context.ministry.name} (${context.term.name}).`}
        backLink={{
          href: "/admin/ministries",
          label: "Ministries",
        }}
      />
      <NavigationTabs aria-label="Term detail sections">
        <NavigationTabLink
          href="?section=members"
          active={section === "members"}
        >
          Members
        </NavigationTabLink>
        <NavigationTabLink href="?section=groups" active={section === "groups"}>
          Groups
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=departments"
          active={section === "departments"}
        >
          Departments
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=sessions"
          active={section === "sessions"}
        >
          Sessions
        </NavigationTabLink>
      </NavigationTabs>
      {structure ? (
        <MinistryManagement
          mode={section === "groups" ? "groups" : "departments"}
          title={sectionLabel}
          description={`Only ${sectionLabel.toLowerCase()} are loaded for the selected section.`}
          result={structure}
          ministryId={context.ministry.id}
          ministrySlug={context.ministry.slug}
          termId={context.term.id}
          termSlug={context.term.slug}
          frequentIcons={frequentIcons}
        />
      ) : detail ? (
        <TermDetailView
          section={section === "members" ? "members" : "sessions"}
          termId={context.term.id}
          data={detail}
        />
      ) : null}
    </AdminPageContainer>
  );
}
