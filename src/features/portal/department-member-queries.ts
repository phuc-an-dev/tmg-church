import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

export type PortalDepartmentMemberRow = {
  membershipId: string;
  memberId: string;
  name: string;
  assignmentId: string | null;
};

export async function getPortalDepartmentMembers(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
) {
  await requirePortalContext();
  const s = await createClient();
  const { data: department, error: departmentError } = await s
    .from("portal_department_directory")
    .select("id,name,ministry_term_id,ministry_slug,term_slug")
    .eq("slug", departmentSlug)
    .eq("term_slug", termSlug)
    .eq("ministry_slug", ministrySlug)
    .maybeSingle();
  if (departmentError || !department) return null;
  const { data, error } = await s
    .from("portal_department_member_directory")
    .select("membership_id,member_id,full_name,assignment_id")
    .eq("department_id", department.id)
    .order("full_name");
  if (error) throw new Error("Failed to fetch department members");
  return {
    department: { id: department.id, name: department.name },
    members: (data ?? []).map((row) => ({
      membershipId: row.membership_id,
      memberId: row.member_id,
      name: row.full_name,
      assignmentId: row.assignment_id,
    })) satisfies PortalDepartmentMemberRow[],
  };
}
