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
import { TermBoardView } from "@/features/ministry/components/term-board-view";
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
    section === "members" ||
    section === "sessions" ||
    (section === "board" && Boolean(context.term.executiveBoardRoles))
      ? getTermDetailData(context.ministry.slug, context.term.slug)
      : Promise.resolve(null),
  ]);
  const sectionLabel = section === "groups" ? "Groups" : "Departments";
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title={context.term.name}
        description={context.ministry.name}
        backLink={{
          href: "/admin/ministries",
          label: "Ministries",
        }}
      />
      <NavigationTabs
        aria-label="Term detail sections"
        className="max-w-full justify-start overflow-x-auto"
      >
        <NavigationTabLink
          href="?section=sessions"
          active={section === "sessions"}
          className="shrink-0 px-2 whitespace-nowrap sm:px-4"
        >
          Sessions
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=members"
          active={section === "members"}
          className="shrink-0 px-2 whitespace-nowrap sm:px-4"
        >
          Members
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=groups"
          active={section === "groups"}
          className="shrink-0 px-2 whitespace-nowrap sm:px-4"
        >
          Groups
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=departments"
          active={section === "departments"}
          className="shrink-0 px-2 whitespace-nowrap sm:px-4"
        >
          Departments
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=board"
          active={section === "board"}
          className="shrink-0 px-2 whitespace-nowrap sm:px-4"
        >
          <span className="sm:hidden">Board</span>
          <span className="hidden sm:inline">Executive Board</span>
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
      ) : section === "board" ? (
        <TermBoardView
          termId={context.term.id}
          roles={context.term.executiveBoardRoles}
          members={detail?.members ?? []}
          assignments={detail?.termRoles ?? []}
          closed={context.term.lifecycle === "closed"}
        />
      ) : detail ? (
        <TermDetailView
          section={section === "members" ? "members" : "sessions"}
          termId={context.term.id}
          ministrySlug={context.ministry.slug}
          termSlug={context.term.slug}
          data={detail}
        />
      ) : null}
    </AdminPageContainer>
  );
}
