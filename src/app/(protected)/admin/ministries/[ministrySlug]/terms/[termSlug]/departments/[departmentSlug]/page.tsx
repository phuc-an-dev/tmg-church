import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { requireDepartmentContext } from "@/features/context/queries";
import { getDepartmentDetailData } from "@/features/ministry/queries";
import { departmentDetailSearchParamsCache } from "@/features/ministry/search-params";
import { DepartmentDetailView } from "@/features/ministry/components/department-detail-view";
import { isUuid } from "@/lib/slug";

export const metadata: Metadata = { title: "Department Detail" };

export default async function DepartmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    departmentSlug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ministrySlug, termSlug, departmentSlug } = await params;

  if (isUuid(ministrySlug) || isUuid(termSlug) || isUuid(departmentSlug)) {
    notFound();
  }

  const rawQuery = await searchParams;
  const rawSection = rawQuery.section;

  // Canonicalize invalid section query to 'members'
  if (
    rawSection !== undefined &&
    rawSection !== "members" &&
    rawSection !== "sessions" &&
    rawSection !== "roles"
  ) {
    redirect(
      `/admin/ministries/${ministrySlug}/terms/${termSlug}/departments/${departmentSlug}?section=members`,
    );
  }

  const [context, query] = await Promise.all([
    requireDepartmentContext(ministrySlug, termSlug, departmentSlug),
    departmentDetailSearchParamsCache.parse(searchParams),
  ]);

  if (!context) notFound();

  const data = await getDepartmentDetailData(
    context.ministry.slug,
    context.term.slug,
    context.department.slug,
  );

  if (!data) notFound();

  const section = query.section;

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title={context.department.name}
        description={`Manage members and service roles for ${context.department.name} in ${context.ministry.name} (${context.term.name}).`}
        backLink={{
          href: `/admin/ministries/${context.ministry.slug}/terms/${context.term.slug}?section=departments`,
          label: "Departments",
        }}
      />
      <NavigationTabs aria-label="Department sections">
        <NavigationTabLink
          href="?section=members"
          active={section === "members"}
        >
          Members ({data.department.memberCount ?? 0})
        </NavigationTabLink>
        <NavigationTabLink
          href="?section=sessions"
          active={section === "sessions"}
        >
          Sessions ({data.sessions.length})
        </NavigationTabLink>
        <NavigationTabLink href="?section=roles" active={section === "roles"}>
          Roles ({data.roles.length})
        </NavigationTabLink>
      </NavigationTabs>
      <DepartmentDetailView
        section={section}
        department={data.department}
        members={data.members}
        roles={data.roles}
        sessions={data.sessions}
        ministryTermId={context.term.id}
        ministrySlug={context.ministry.slug}
        termSlug={context.term.slug}
      />
    </AdminPageContainer>
  );
}
