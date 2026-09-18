import { notFound } from "next/navigation";
import { getPortalGroupSessionDetail } from "@/features/portal/group-session-queries";
import { PortalGroupSessionDetail } from "@/features/portal/group-session-view";

export default async function PortalGroupSessionPage({
  params,
}: {
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
  return (
    <PortalGroupSessionDetail
      session={data}
      canManage={data.canManage}
      backPath={`/portal/ministries/${ministrySlug}/terms/${termSlug}/groups/${groupSlug}/sessions`}
    />
  );
}
