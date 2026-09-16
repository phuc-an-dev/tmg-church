import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttendanceManagement } from "@/features/session/components/attendance-management";
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

    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <ServiceAssignmentManagement assignmentData={assignmentData} />
      </div>
    );
  }

  const filterParams = await sessionDetailSearchParamsCache.parse(searchParams);
  const session = await getSessionDetail(sessionSlug, filterParams);
  if (!session) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <AttendanceManagement session={session} />
    </div>
  );
}
