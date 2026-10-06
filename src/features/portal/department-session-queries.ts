import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

export type PortalDepartmentSessionRow = {
  id: string;
  slug: string;
  title: string;
  sessionDate: string;
  participantCount: number;
};

export async function getPortalDepartment(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
) {
  await requirePortalContext();
  const s = await createClient();
  const { data: department, error } = await s
    .from("portal_department_directory")
    .select("id,name,slug,ministry_term_id,ministry_slug,term_slug")
    .eq("slug", departmentSlug)
    .eq("term_slug", termSlug)
    .eq("ministry_slug", ministrySlug)
    .maybeSingle();
  if (error) throw new Error("Failed to fetch department");
  if (!department) return null;
  return {
    id: department.id,
    name: department.name,
    slug: department.slug,
    ministryTermId: department.ministry_term_id,
    ministrySlug: department.ministry_slug,
    termSlug: department.term_slug,
  };
}

export async function getPortalDepartmentSessions(
  departmentId: string,
): Promise<PortalDepartmentSessionRow[]> {
  const s = await createClient();
  const { data, error } = await s
    .from("ministry_session")
    .select("id,slug,title,session_date,session_participant(count)")
    .eq("term_department_id", departmentId)
    .order("session_date", { ascending: false })
    .order("id");
  if (error) throw new Error("Failed to fetch department sessions");
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    sessionDate: row.session_date,
    participantCount: row.session_participant[0]?.count ?? 0,
  }));
}

export type PortalDepartmentSessionDetail = {
  id: string;
  slug: string;
  title: string;
  sessionDate: string;
  departmentName: string;
  members: Array<{
    id: string;
    name: string;
    gender: string | null;
    status: "present" | "absent" | "excused" | null;
  }>;
};

export async function getPortalDepartmentSessionDetail(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
  sessionSlug: string,
): Promise<PortalDepartmentSessionDetail | null> {
  const department = await getPortalDepartment(
    ministrySlug,
    termSlug,
    departmentSlug,
  );
  if (!department) return null;
  const s = await createClient();
  const { data: session, error: sessionError } = await s
    .from("ministry_session")
    .select("id,slug,title,session_date")
    .eq("term_department_id", department.id)
    .eq("slug", sessionSlug)
    .maybeSingle();
  if (sessionError || !session) return null;

  // Roster: members assigned to this department.
  const { data: roster, error: rosterError } = await s
    .from("portal_department_member_directory")
    .select("member_id,full_name,gender,assignment_id")
    .eq("department_id", department.id)
    .order("full_name");
  if (rosterError) throw new Error("Failed to fetch department members");
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
    id: session.id,
    slug: session.slug,
    title: session.title,
    sessionDate: session.session_date,
    departmentName: department.name,
    members: (roster ?? [])
      .filter((member) => member.assignment_id)
      .map((member) => ({
        id: member.member_id,
        name: member.full_name,
        gender: member.gender,
        status: statusByMember.get(member.member_id) ?? null,
      })),
  };
}
