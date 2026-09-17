import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { requireGroupContext } from "@/features/context/queries";
import { getGroupDetailData } from "@/features/ministry/group-queries";
import { groupDetailSearchParamsCache } from "@/features/ministry/search-params";
import { GroupDetailView } from "@/features/ministry/components/group-detail-view";
import { isUuid } from "@/lib/slug";

export const metadata: Metadata = { title: "Group Detail" };

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    groupSlug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ministrySlug, termSlug, groupSlug } = await params;

  if (isUuid(ministrySlug) || isUuid(termSlug) || isUuid(groupSlug)) {
    notFound();
  }

  const rawQuery = await searchParams;
  const rawSection = rawQuery.section;

  // Canonicalize invalid section query to 'members'
  if (
    rawSection !== undefined &&
    rawSection !== "members" &&
    rawSection !== "sessions" &&
    rawSection !== "history"
  ) {
    redirect(
      `/admin/ministries/${ministrySlug}/terms/${termSlug}/groups/${groupSlug}?section=members`,
    );
  }

  const [context, query] = await Promise.all([
    requireGroupContext(ministrySlug, termSlug, groupSlug),
    groupDetailSearchParamsCache.parse(searchParams),
  ]);

  if (!context) notFound();

  const data = await getGroupDetailData(
    context.ministry.slug,
    context.term.slug,
    context.group.slug,
  );

  if (!data) notFound();

  const section = query.section;

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title={context.group.name}
        description={`Manage members, leadership roles, and membership history for ${context.group.name} in ${context.ministry.name} (${context.term.name}).`}
        backLink={{
          href: `/admin/ministries/${context.ministry.slug}/terms/${context.term.slug}?section=groups`,
          label: "Groups",
        }}
      />
      <NavigationTabs aria-label="Group sections">
        <NavigationTabLink
          href="?section=members"
          active={section === "members"}
        >
          Members ({data.members.length})
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=sessions"
          active={section === "sessions"}
        >
          Sessions ({data.sessions.length})
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=history"
          active={section === "history"}
        >
          History ({data.history.length})
        </NavigationTabLink>
      </NavigationTabs>
      <GroupDetailView
        section={section}
        ministrySlug={context.ministry.slug}
        termSlug={context.term.slug}
        groupSlug={context.group.slug}
        data={data}
      />
    </AdminPageContainer>
  );
}
