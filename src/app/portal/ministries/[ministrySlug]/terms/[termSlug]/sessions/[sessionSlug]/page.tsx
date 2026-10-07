import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortalDelegatedTerms } from "@/features/portal/term-session-queries";
import { getPortalMemberData } from "@/features/portal/member-session-queries";
import { MemberSessionDetail } from "@/features/portal/member-session-detail";
import { AttendanceManagement } from "@/features/session/components/attendance-management";
import { ServiceAssignmentManagement } from "@/features/session/components/service-assignment-management";
import { sessionDetailSearchParamsCache } from "@/features/session/search-params";
import {
  batchSavePortalTermServiceAssignmentsAction,
  removePortalTermServiceAssignmentAction,
  saveBulkPortalTermAttendanceAction,
  savePortalTermAttendanceAction,
  setPortalTermSessionServiceRolesAction,
} from "@/features/portal/term-session-actions";
import {
  getPortalTermSessionDetail,
  getPortalTermSessionServiceAssignmentData,
} from "@/features/portal/term-session-detail-queries";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  return {
    title:
      query.from === "upcoming" || query.from === "assignments"
        ? "Session"
        : query.tab === "assignments"
          ? "Service Assignments"
          : "Session Attendance",
  };
}

export default async function PortalMinistrySessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    sessionSlug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ministrySlug, termSlug, sessionSlug } = await params;
  const query = await searchParams;
  if (
    ![ministrySlug, termSlug, sessionSlug].every((slug) =>
      SLUG_PATTERN.test(slug),
    )
  )
    notFound();
  const delegatedTerms = await getPortalDelegatedTerms();
  if (
    !delegatedTerms.some(
      (term) =>
        term.ministry_slug === ministrySlug && term.term_slug === termSlug,
    )
  ) {
    const data = await getPortalMemberData(sessionSlug);
    const session = data.sessions.find(
      (item) =>
        item.ministrySlug === ministrySlug &&
        item.termSlug === termSlug &&
        item.slug === sessionSlug,
    );
    if (!session) notFound();
    return (
      <MemberSessionDetail
        session={session}
        fromAssignments={query.from === "assignments"}
      />
    );
  }
  const fromDepartment =
    typeof query.fromDepartment === "string" &&
    SLUG_PATTERN.test(query.fromDepartment)
      ? query.fromDepartment
      : null;
  const basePath = `/portal/ministries/${ministrySlug}/terms/${termSlug}/sessions/${sessionSlug}`;
  const fromTodo = query.from === "todo";
  const baseQuery =
    [
      fromDepartment
        ? `fromDepartment=${encodeURIComponent(fromDepartment)}`
        : null,
      fromTodo ? "from=todo" : null,
    ]
      .filter(Boolean)
      .join("&") || undefined;
  const sessionListPath = fromTodo
    ? "/portal?section=readiness"
    : `/portal/ministries/${ministrySlug}/terms/${termSlug}${fromDepartment ? `?fromDepartment=${encodeURIComponent(fromDepartment)}` : ""}`;

  if (query.tab === "assignments") {
    const assignmentData = await getPortalTermSessionServiceAssignmentData(
      ministrySlug,
      termSlug,
      sessionSlug,
    );
    if (!assignmentData) notFound();
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <ServiceAssignmentManagement
            assignmentData={assignmentData}
            basePath={basePath}
            baseQuery={baseQuery}
            returnUrl={sessionListPath}
            actions={{
              setRoles: setPortalTermSessionServiceRolesAction,
              batchSave: batchSavePortalTermServiceAssignmentsAction,
              remove: removePortalTermServiceAssignmentAction,
            }}
          />
        </div>
      </div>
    );
  }

  const filters = await sessionDetailSearchParamsCache.parse(searchParams);
  const session = await getPortalTermSessionDetail(
    ministrySlug,
    termSlug,
    sessionSlug,
    filters,
  );
  if (!session) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AttendanceManagement
          session={session}
          basePath={basePath}
          baseQuery={baseQuery}
          returnUrl={sessionListPath}
          actions={{
            save: savePortalTermAttendanceAction,
            saveBulk: saveBulkPortalTermAttendanceAction,
          }}
        />
      </div>
    </div>
  );
}
