import { notFound } from "next/navigation";
import { getPortalGroupSessions } from "@/features/portal/group-session-queries";
import { PortalGroupSessionList } from "@/features/portal/group-session-view";

export default async function PortalGroupSessionsPage({
  params,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    groupSlug: string;
  }>;
}) {
  const { ministrySlug, termSlug, groupSlug } = await params;
  const data = await getPortalGroupSessions(ministrySlug, termSlug, groupSlug);
  if (!data) notFound();
  return (
    <PortalGroupSessionList
      group={data.group}
      sessions={data.sessions}
      canManage={data.canManage}
      basePath={`/portal/ministries/${ministrySlug}/terms/${termSlug}/groups/${groupSlug}/sessions`}
    />
  );
}
