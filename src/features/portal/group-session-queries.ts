import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

export type PortalGroupSession = {
  id: string;
  slug: string;
  title: string;
  sessionDate: string;
  participantCount: number;
  canManage: boolean;
  canDelete: boolean;
};

export type PortalGroupSessionDetail = PortalGroupSession & {
  groupName: string;
  members: Array<{
    id: string;
    name: string;
    status: "present" | "absent" | "excused" | null;
  }>;
};

export async function getPortalGroupSessions(
  ministrySlug: string,
  termSlug: string,
  groupSlug: string,
) {
  const context = await requirePortalContext();
  const s = await createClient();
  const { data: group, error: groupError } = await s
    .from("portal_group_directory")
    .select("id,name,ministry_term_id,term_slug,ministry_slug")
    .eq("slug", groupSlug)
    .eq("term_slug", termSlug)
    .eq("ministry_slug", ministrySlug)
    .maybeSingle();
  if (groupError || !group) return null;

  const { data: canManage } = await s.rpc("has_capability", {
    p_capability: "group.session.manage",
    p_scope_type: "group",
    p_scope_id: group.id,
  });
  const { data: sessions, error } = await s
    .from("ministry_session")
    .select(
      "id,slug,title,session_date,session_participant(count),session_assignment(count),service_assignment(count)",
    )
    .eq("term_group_id", group.id)
    .order("session_date", { ascending: false })
    .order("id");
  if (error) throw new Error("Failed to fetch group sessions");

  return {
    group: {
      id: group.id,
      name: group.name,
      ministryTermId: group.ministry_term_id,
    },
    isSystemAdmin: context.isSystemAdmin,
    canManage: canManage === true,
    sessions: (sessions ?? []).map((session) => {
      const participantCount =
        (session.session_participant as { count: number }[] | null)?.[0]
          ?.count ?? 0;
      const assignmentCount =
        (session.session_assignment as { count: number }[] | null)?.[0]
          ?.count ?? 0;
      const serviceCount =
        (session.service_assignment as { count: number }[] | null)?.[0]
          ?.count ?? 0;
      return {
        id: session.id,
        slug: session.slug,
        title: session.title,
        sessionDate: session.session_date,
        participantCount,
        canManage: canManage === true,
        canDelete:
          canManage === true &&
          participantCount === 0 &&
          assignmentCount === 0 &&
          serviceCount === 0,
      } satisfies PortalGroupSession;
    }),
  };
}

export async function getPortalGroupSessionDetail(
  ministrySlug: string,
  termSlug: string,
  groupSlug: string,
  sessionSlug: string,
): Promise<PortalGroupSessionDetail | null> {
  const data = await getPortalGroupSessions(ministrySlug, termSlug, groupSlug);
  if (!data) return null;
  const session = data.sessions.find((item) => item.slug === sessionSlug);
  if (!session) return null;
  const s = await createClient();
  const { data: members, error } = await s
    .from("member_profile_public")
    .select("id,full_name,term_group_id")
    .eq("ministry_term_id", data.group.ministryTermId)
    .eq("term_group_id", data.group.id)
    .order("full_name");
  if (error) throw new Error("Failed to fetch group members");
  const { data: attendance, error: attendanceError } = await s
    .from("session_participant")
    .select("member_profile_id,attendance_record(status)")
    .eq("ministry_session_id", session.id);
  if (attendanceError) throw new Error("Failed to fetch session attendance");
  const statusByMember = new Map<string, "present" | "absent" | "excused">();
  for (const row of attendance ?? []) {
    const record = Array.isArray(row.attendance_record)
      ? row.attendance_record[0]
      : row.attendance_record;
    if (record?.status)
      statusByMember.set(
        row.member_profile_id,
        record.status as "present" | "absent" | "excused",
      );
  }
  return {
    ...session,
    groupName: data.group.name,
    members: (members ?? [])
      .filter((member) => member.id && member.full_name)
      .map((member) => ({
        id: member.id as string,
        name: member.full_name as string,
        status: statusByMember.get(member.id as string) ?? null,
      })),
  };
}
