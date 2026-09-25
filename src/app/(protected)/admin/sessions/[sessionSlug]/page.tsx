import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AttendanceManagement } from "@/features/session/components/attendance-management";
import { GroupSessionAssignments } from "@/features/session/components/group-session-assignments";
import { ServiceAssignmentManagement } from "@/features/session/components/service-assignment-management";
import {
  getSessionDetail,
  getSessionServiceAssignmentData,
} from "@/features/session/queries";
import { sessionDetailSearchParamsCache } from "@/features/session/search-params";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolved = await searchParams;
  const isAssignments = resolved.tab === "assignments";
  return {
    title: isAssignments ? "Service Assignments" : "Session Attendance",
    description: isAssignments
      ? "Manage service assignments for the session"
      : "Record and manage session attendance",
  };
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionSlug } = await params;
  const resolvedParams = await searchParams;
  const isAssignments = resolvedParams.tab === "assignments";

  if (isAssignments) {
    const assignmentData = await getSessionServiceAssignmentData(sessionSlug);
    if (!assignmentData) notFound();

    const returnUrl =
      typeof resolvedParams.returnUrl === "string"
        ? resolvedParams.returnUrl
        : undefined;

    return (
      <AdminPageContainer>
        {assignmentData.scope === "group" ? (
          <GroupSessionAssignments
            assignmentData={assignmentData}
            returnUrl={returnUrl}
          />
        ) : (
          <ServiceAssignmentManagement
            assignmentData={assignmentData}
            returnUrl={returnUrl}
          />
        )}
      </AdminPageContainer>
    );
  }

  const filterParams = await sessionDetailSearchParamsCache.parse(searchParams);
  const session = await getSessionDetail(sessionSlug, filterParams);
  if (!session) notFound();

  return (
    <AdminPageContainer>
      <AttendanceManagement session={session} />
    </AdminPageContainer>
  );
}
