import { notFound } from "next/navigation";
import { isUuid } from "@/lib/slug";
import { getPortalDepartmentSessionDetail } from "@/features/portal/department-session-queries";
import { AttendanceManagement } from "@/features/session/components/attendance-management";
import { sessionDetailSearchParamsCache } from "@/features/session/search-params";
import {
  savePortalDepartmentAttendanceAction,
  saveBulkPortalDepartmentAttendanceAction,
} from "@/features/portal/department-session-actions";

export const metadata = { title: "Department Session" };

export default async function PortalDepartmentSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    departmentSlug: string;
    sessionSlug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ministrySlug, termSlug, departmentSlug, sessionSlug } = await params;
  if (
    isUuid(ministrySlug) ||
    isUuid(termSlug) ||
    isUuid(departmentSlug) ||
    isUuid(sessionSlug)
  ) {
    notFound();
  }
  const filters = await sessionDetailSearchParamsCache.parse(searchParams);
  const session = await getPortalDepartmentSessionDetail(
    ministrySlug,
    termSlug,
    departmentSlug,
    sessionSlug,
    filters,
  );
  if (!session) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AttendanceManagement
          session={session}
          description={`${session.scopeLabel} · ${session.sessionDate}`}
          basePath={`/portal/ministries/${ministrySlug}/terms/${termSlug}/departments/${departmentSlug}/sessions/${sessionSlug}`}
          returnUrl={`/portal/ministries/${ministrySlug}/terms/${termSlug}/departments/${departmentSlug}?section=sessions`}
          actions={{
            save: savePortalDepartmentAttendanceAction,
            saveBulk: saveBulkPortalDepartmentAttendanceAction,
          }}
        />
      </div>
    </div>
  );
}
