import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

export type PortalGroupMemberRow = {
  membershipId: string;
  memberId: string;
  name: string;
  groupMembershipId: string | null;
  role: string | null;
  status: string | null;
  currentGroupId: string | null;
};

export async function getPortalGroupMembers(
  ministrySlug: string,
  termSlug: string,
  groupSlug: string,
) {
  await requirePortalContext();
  const s = await createClient();
  const { data: group, error: groupError } = await s
    .from("portal_group_directory")
    .select("id,name,ministry_term_id,ministry_slug,term_slug")
    .eq("slug", groupSlug)
    .eq("term_slug", termSlug)
    .eq("ministry_slug", ministrySlug)
    .maybeSingle();
  if (groupError || !group) return null;

  const { data: canManage } = await s.rpc("has_capability", {
    p_capability: "group.members.manage",
    p_scope_type: "group",
    p_scope_id: group.id,
  });
  const { data, error } = await s
    .from("portal_group_member_directory")
    .select(
      "membership_id,member_id,full_name,group_membership_id,role,status,current_group_id",
    )
    .eq("group_id", group.id)
    .order("full_name");
  if (error) throw new Error("Failed to fetch group members");
  return {
    group: {
      id: group.id,
      name: group.name,
      ministryTermId: group.ministry_term_id,
    },
    canManage: canManage === true,
    members: (data ?? []).map((row) => ({
      membershipId: row.membership_id,
      memberId: row.member_id,
      name: row.full_name,
      groupMembershipId: row.group_membership_id,
      role: row.role,
      status: row.status,
      currentGroupId: row.current_group_id,
    })) satisfies PortalGroupMemberRow[],
  };
}
