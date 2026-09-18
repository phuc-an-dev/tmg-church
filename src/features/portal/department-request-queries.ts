import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

export async function getPortalDepartmentRequests(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
) {
  const context = await requirePortalContext();
  const s = await createClient();
  const { data: rows, error } = await s
    .from("portal_department_request_directory")
    .select(
      "department_id,department_name,department_slug,ministry_term_id,term_slug,ministry_slug,request_id,status,rejection_reason,created_at,requester_member_id,requester_name",
    )
    .eq("department_slug", departmentSlug)
    .eq("term_slug", termSlug)
    .eq("ministry_slug", ministrySlug)
    .order("created_at", { ascending: false });
  if (error || !rows?.[0]) return null;
  const department = rows[0];
  const { data: canManage } = await s.rpc("has_capability", {
    p_capability: "department.members.manage",
    p_scope_type: "department",
    p_scope_id: department.department_id,
  });
  return {
    department: {
      id: department.department_id,
      name: department.department_name,
    },
    canManage: canManage === true,
    memberProfileId: context.memberProfileId,
    requests: rows
      .filter((row) => row.request_id)
      .map((row) => ({
        id: row.request_id as string,
        status: row.status as string,
        reason: row.rejection_reason,
        requesterId: row.requester_member_id,
        requesterName: row.requester_name ?? "Member",
        createdAt: row.created_at ?? "",
      })),
  };
}

export async function getPortalRequestDepartments() {
  await requirePortalContext();
  const s = await createClient();
  const { data, error } = await s
    .from("portal_department_request_targets")
    .select(
      "department_id,department_name,department_slug,term_slug,ministry_slug",
    )
    .order("department_name");
  if (error) return [];
  const seen = new Set<string>();
  return (data ?? []).filter((row) => {
    if (seen.has(row.department_id)) return false;
    seen.add(row.department_id);
    return true;
  });
}
