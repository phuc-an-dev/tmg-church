import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireGroupContext } from "@/features/context/queries";
import type { GroupRole, GroupStatus } from "./group-schemas";

export interface GroupMemberItem {
  id: string;
  membershipId: string;
  memberId: string;
  name: string;
  role: GroupRole;
  status: GroupStatus;
  joinedAt: string;
  endedAt: string | null;
}

export interface GroupLeadership {
  groupLeader: GroupMemberItem | null;
  deputyLeader: GroupMemberItem | null;
  bibleStudyLeader: GroupMemberItem | null;
}

export interface EligibleTermMemberItem {
  membershipId: string;
  memberId: string;
  name: string;
  currentGroupName: string | null;
  currentGroupId: string | null;
}

export interface GroupDetailData {
  group: {
    id: string;
    name: string;
    slug: string;
    accentColor: string;
    iconKey: string;
    ministryTermId: string;
  };
  members: GroupMemberItem[];
  leadership: GroupLeadership;
  history: GroupMemberItem[];
  eligibleMembers: EligibleTermMemberItem[];
}

export async function getGroupDetailData(
  ministrySlug: string,
  termSlug: string,
  groupSlug: string,
): Promise<GroupDetailData | null> {
  const context = await requireGroupContext(ministrySlug, termSlug, groupSlug);
  if (!context) return null;

  const supabase = await createClient();

  // 1. Fetch current open group members
  const { data: openMembers, error: openError } = await supabase
    .from("term_group_membership")
    .select(
      `
      id,
      role,
      status,
      joined_at,
      ended_at,
      ministry_membership_id,
      ministry_membership!inner (
        id,
        member_profile_id,
        member_profile!inner (
          id,
          full_name,
          archived_at
        )
      )
    `,
    )
    .eq("term_group_id", context.group.id)
    .is("ended_at", null)
    .is("ministry_membership.member_profile.archived_at", null)
    .order("joined_at", { ascending: true });

  if (openError) {
    console.error("Failed to fetch group members:", openError);
    throw new Error("Failed to fetch group members");
  }

  const rolePriority: Record<GroupRole, number> = {
    group_leader: 1,
    deputy_leader: 2,
    bible_study_leader: 3,
    member: 4,
  };

  const members: GroupMemberItem[] = (openMembers ?? [])
    .map((row) => {
      const mm = row.ministry_membership as unknown as {
        id: string;
        member_profile_id: string;
        member_profile:
          | { id: string; full_name: string }
          | { id: string; full_name: string }[];
      };
      const profile = Array.isArray(mm.member_profile)
        ? mm.member_profile[0]
        : mm.member_profile;

      return {
        id: row.id,
        membershipId: row.ministry_membership_id,
        memberId: profile.id,
        name: profile.full_name,
        role: row.role as GroupRole,
        status: row.status as GroupStatus,
        joinedAt: row.joined_at,
        endedAt: row.ended_at,
      };
    })
    .sort((a, b) => {
      const priorityDiff = rolePriority[a.role] - rolePriority[b.role];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name, "vi");
    });

  // Leadership section only displays ACTIVE leaders per requirements
  const leadership: GroupLeadership = {
    groupLeader:
      members.find((m) => m.role === "group_leader" && m.status === "active") ??
      null,
    deputyLeader:
      members.find(
        (m) => m.role === "deputy_leader" && m.status === "active",
      ) ?? null,
    bibleStudyLeader:
      members.find(
        (m) => m.role === "bible_study_leader" && m.status === "active",
      ) ?? null,
  };

  // 2. Fetch history (ended memberships)
  const { data: historyMembers, error: historyError } = await supabase
    .from("term_group_membership")
    .select(
      `
      id,
      role,
      status,
      joined_at,
      ended_at,
      ministry_membership_id,
      ministry_membership!inner (
        id,
        member_profile_id,
        member_profile!inner (
          id,
          full_name
        )
      )
    `,
    )
    .eq("term_group_id", context.group.id)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false });

  if (historyError) {
    console.error("Failed to fetch group history:", historyError);
    throw new Error("Failed to fetch group history");
  }

  const history: GroupMemberItem[] = (historyMembers ?? []).map((row) => {
    const mm = row.ministry_membership as unknown as {
      id: string;
      member_profile_id: string;
      member_profile:
        { id: string; full_name: string } | { id: string; full_name: string }[];
    };
    const profile = Array.isArray(mm.member_profile)
      ? mm.member_profile[0]
      : mm.member_profile;

    return {
      id: row.id,
      membershipId: row.ministry_membership_id,
      memberId: profile.id,
      name: profile.full_name,
      role: row.role as GroupRole,
      status: row.status as GroupStatus,
      joinedAt: row.joined_at,
      endedAt: row.ended_at,
    };
  });

  // 3. Fetch all enrolled members in the same Ministry Term for the Add Member drawer
  const { data: termMemberships, error: termError } = await supabase
    .from("ministry_membership")
    .select(
      `
      id,
      member_profile_id,
      member_profile!inner (
        id,
        full_name,
        archived_at
      )
    `,
    )
    .eq("ministry_term_id", context.term.id)
    .is("member_profile.archived_at", null)
    .order("member_profile(full_name)");

  if (termError) {
    console.error("Failed to fetch term members:", termError);
    throw new Error("Failed to fetch term members");
  }

  const allTermMembershipIds = (termMemberships ?? []).map((m) => m.id);

  // Find existing open group memberships across the entire term
  const { data: openGroupRows, error: openGroupErr } =
    allTermMembershipIds.length > 0
      ? await supabase
          .from("term_group_membership")
          .select(
            "ministry_membership_id, term_group_id, term_group!inner(id, name)",
          )
          .in("ministry_membership_id", allTermMembershipIds)
          .is("ended_at", null)
      : { data: [], error: null };

  if (openGroupErr) {
    console.error("Failed to fetch open group memberships:", openGroupErr);
    throw new Error("Failed to fetch open group memberships");
  }

  const openGroupMap = new Map<
    string,
    { groupId: string; groupName: string }
  >();
  for (const row of openGroupRows ?? []) {
    const tg = Array.isArray(row.term_group)
      ? row.term_group[0]
      : row.term_group;
    if (tg) {
      openGroupMap.set(row.ministry_membership_id, {
        groupId: tg.id,
        groupName: tg.name,
      });
    }
  }

  // Eligible members for Add Member: any term enrolled member NOT currently open in this group
  const eligibleMembers: EligibleTermMemberItem[] = (termMemberships ?? [])
    .filter((tm) => {
      const openGroup = openGroupMap.get(tm.id);
      return openGroup?.groupId !== context.group.id;
    })
    .map((tm) => {
      const profile = Array.isArray(tm.member_profile)
        ? tm.member_profile[0]
        : tm.member_profile;
      const openGroup = openGroupMap.get(tm.id);
      return {
        membershipId: tm.id,
        memberId: profile.id,
        name: profile.full_name,
        currentGroupName: openGroup?.groupName ?? null,
        currentGroupId: openGroup?.groupId ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return {
    group: {
      id: context.group.id,
      name: context.group.name,
      slug: context.group.slug,
      accentColor: context.group.accentColor,
      iconKey: context.group.iconKey,
      ministryTermId: context.term.id,
    },
    members,
    leadership,
    history,
    eligibleMembers,
  };
}
