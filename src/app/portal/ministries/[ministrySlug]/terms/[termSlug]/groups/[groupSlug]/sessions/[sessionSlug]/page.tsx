import { format, parseISO } from "date-fns";
import { GroupSessionAssignments } from "@/features/session/components/group-session-assignments";
import { AttendanceManagement } from "@/features/session/components/attendance-management";
import { buildSessionAttendanceDetail } from "@/features/session/attendance-detail";
import { sessionDetailSearchParamsCache } from "@/features/session/search-params";
import {
  savePortalGroupAssignmentAction,
  removePortalGroupAssignmentAction,
  savePortalAttendanceAction,
  savePortalBulkAttendanceAction,
} from "@/features/portal/group-session-actions";
import { notFound } from "next/navigation";
import {
  getPortalGroupSessionDetail,
  getPortalGroupSessionAssignmentData,
} from "@/features/portal/group-session-queries";
import { PortalGroupSessionDetail } from "@/features/portal/group-session-view";

export default async function PortalGroupSessionPage({
  params,
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    groupSlug: string;
    sessionSlug: string;
  }>;
}) {
  const { ministrySlug, termSlug, groupSlug, sessionSlug } = await params;
  const data = await getPortalGroupSessionDetail(
    ministrySlug,
    termSlug,
    groupSlug,
    sessionSlug,
  );
  if (!data) notFound();
  const backPath = `/portal/ministries/${ministrySlug}/terms/${termSlug}/groups/${groupSlug}/sessions`;
  if (data.canManage) {
    const params = await searchParams;
    const description = `${data.groupName} · ${format(parseISO(data.sessionDate), "EEE, MMM d, yyyy")}`;
    if (params.tab === "assignments") {
      const assignmentData = await getPortalGroupSessionAssignmentData(
        data,
        ministrySlug,
        termSlug,
      );
      if (!assignmentData) notFound();
      return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <GroupSessionAssignments
              assignmentData={assignmentData}
              basePath={`${backPath}/${sessionSlug}`}
              returnUrl={backPath}
              description={description}
              actions={{
                save: savePortalGroupAssignmentAction,
                remove: removePortalGroupAssignmentAction,
              }}
            />
          </div>
        </div>
      );
    }
    const filters = await sessionDetailSearchParamsCache.parse(params);
    const session = buildSessionAttendanceDetail(
      {
        ...data,
        termName: "",
        ministryName: "",
        scopeLabel: data.groupName,
      },
      data.members.map((member) => ({
        memberId: member.id,
        fullName: member.name,
        status: member.status,
        group: null,
        departments: [],
      })),
      filters,
    );
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <AttendanceManagement
            session={session}
            description={description}
            basePath={`${backPath}/${sessionSlug}`}
            returnUrl={backPath}
            actions={{
              save: savePortalAttendanceAction,
              saveBulk: savePortalBulkAttendanceAction,
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <PortalGroupSessionDetail
      session={data}
      canManage={data.canManage}
      backPath={backPath}
    />
  );
}
