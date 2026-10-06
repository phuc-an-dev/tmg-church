import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { isUuid } from "@/lib/slug";
import { getPortalDepartmentMembers } from "@/features/portal/department-member-queries";
import { getPortalDepartmentRequests } from "@/features/portal/department-request-queries";
import { getPortalDepartmentServices } from "@/features/portal/department-service-queries";
import {
  getPortalDepartment,
  getPortalDepartmentSessions,
} from "@/features/portal/department-session-queries";
import { PortalDepartmentMemberView } from "@/features/portal/department-member-view";
import { PortalDepartmentRequestView } from "@/features/portal/department-request-view";
import { PortalDepartmentRoleView } from "@/features/portal/department-service-view";
import { PortalDepartmentSessionView } from "@/features/portal/department-session-view";
import { canManagePortalTermSessions } from "@/features/portal/term-session-queries";

export const metadata: Metadata = { title: "Department" };

const SECTIONS = ["sessions", "members", "requests", "service-roles"] as const;
type Section = (typeof SECTIONS)[number];

export default async function PortalDepartmentPage({
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

  const rawSection = (await searchParams).section;
  if (
    typeof rawSection === "string" &&
    !SECTIONS.includes(rawSection as Section)
  ) {
    redirect(
      `/portal/ministries/${ministrySlug}/terms/${termSlug}/departments/${departmentSlug}?section=sessions`,
    );
  }
  const section: Section =
    typeof rawSection === "string" && SECTIONS.includes(rawSection as Section)
      ? (rawSection as Section)
      : "sessions";

  const [membersData, requestsData, servicesData, sessionsData] =
    await Promise.all([
      getPortalDepartmentMembers(ministrySlug, termSlug, departmentSlug),
      getPortalDepartmentRequests(ministrySlug, termSlug, departmentSlug),
      getPortalDepartmentServices(ministrySlug, termSlug, departmentSlug),
      (async () => {
        const department = await getPortalDepartment(
          ministrySlug,
          termSlug,
          departmentSlug,
        );
        if (!department) return null;
        const [sessions, canManageMinistrySessions] = await Promise.all([
          getPortalDepartmentSessions(department.id),
          canManagePortalTermSessions(department.ministryTermId),
        ]);
        return { department, sessions, canManageMinistrySessions };
      })(),
    ]);

  const departmentInfo =
    membersData?.department ??
    requestsData?.department ??
    servicesData?.department ??
    sessionsData?.department;
  if (!departmentInfo) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          title={departmentInfo.name}
          description="Manage members, service roles, and sessions for this department."
          backLink={{ href: "/portal", label: "Portal" }}
        />

        <NavigationTabs aria-label="Department sections">
          <NavigationTabLink
            href="?section=sessions"
            active={section === "sessions"}
          >
            Sessions
          </NavigationTabLink>
          <NavigationTabLink
            href="?section=members"
            active={section === "members"}
          >
            Members
          </NavigationTabLink>
          <NavigationTabLink
            href="?section=requests"
            active={section === "requests"}
          >
            Requests
          </NavigationTabLink>
          <NavigationTabLink
            href="?section=service-roles"
            active={section === "service-roles"}
          >
            Roles
          </NavigationTabLink>
        </NavigationTabs>

        {section === "members" && membersData && (
          <PortalDepartmentMemberView
            department={membersData.department}
            members={membersData.members}
          />
        )}
        {section === "requests" && requestsData && (
          <PortalDepartmentRequestView
            department={requestsData.department}
            requests={requestsData.requests}
            canManage={requestsData.canManage}
            memberProfileId={requestsData.memberProfileId}
          />
        )}
        {section === "service-roles" && servicesData && (
          <PortalDepartmentRoleView
            department={servicesData.department}
            roles={servicesData.roles}
          />
        )}
        {section === "sessions" && sessionsData && (
          <PortalDepartmentSessionView
            department={sessionsData.department}
            sessions={sessionsData.sessions}
            canManage
            canManageMinistry={sessionsData.canManageMinistrySessions}
            basePath={`/portal/ministries/${ministrySlug}/terms/${termSlug}/departments/${departmentSlug}/sessions`}
          />
        )}
      </div>
    </div>
  );
}
