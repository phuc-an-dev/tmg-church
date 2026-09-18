import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

export async function getPortalDepartmentServices(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
) {
  await requirePortalContext();
  const s = await createClient();
  const { data: rows, error } = await s
    .from("portal_department_service_directory")
    .select(
      "department_id,department_name,department_slug,ministry_term_id,term_slug,ministry_slug,role_id,role_name",
    )
    .eq("department_slug", departmentSlug)
    .eq("term_slug", termSlug)
    .eq("ministry_slug", ministrySlug)
    .order("role_name");
  if (error || !rows?.[0]) return null;
  const department = rows[0];
  const [sessionsResult, membersResult, assignmentsResult] = await Promise.all([
    s
      .from("portal_department_session_directory")
      .select("session_id,session_slug,session_title,session_date")
      .eq("department_id", department.department_id)
      .order("session_date", { ascending: false }),
    s
      .from("portal_department_member_directory")
      .select("membership_id,member_id,full_name,assignment_id")
      .eq("department_id", department.department_id)
      .order("full_name"),
    s
      .from("portal_department_service_assignment_directory")
      .select(
        "assignment_id,session_id,session_slug,session_title,session_date,role_id,role_name,membership_id,full_name",
      )
      .eq("department_id", department.department_id)
      .order("session_date", { ascending: false }),
  ]);
  if (sessionsResult.error || membersResult.error || assignmentsResult.error)
    throw new Error("Failed to fetch Department service data");
  return {
    department: {
      id: department.department_id,
      name: department.department_name,
    },
    roles: rows
      .filter((row) => row.role_id)
      .map((row) => ({
        id: row.role_id as string,
        name: row.role_name as string,
      })),
    sessions: sessionsResult.data ?? [],
    members: (membersResult.data ?? [])
      .filter((row) => row.assignment_id)
      .map((row) => ({ id: row.membership_id, name: row.full_name })),
    assignments: assignmentsResult.data ?? [],
  };
}
