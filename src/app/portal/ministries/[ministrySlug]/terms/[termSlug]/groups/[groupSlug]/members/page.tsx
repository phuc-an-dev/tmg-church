import { notFound } from "next/navigation";
import { getPortalGroupMembers } from "@/features/portal/group-member-queries";
import { PortalGroupMemberView } from "@/features/portal/group-member-view";

export default async function PortalGroupMembersPage({
  params,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    groupSlug: string;
  }>;
}) {
  const { ministrySlug, termSlug, groupSlug } = await params;
  const data = await getPortalGroupMembers(ministrySlug, termSlug, groupSlug);
  if (!data) notFound();
  return (
    <PortalGroupMemberView
      group={data.group}
      members={data.members}
      canManage={data.canManage}
    />
  );
}
