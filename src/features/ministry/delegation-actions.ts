"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/features/auth/queries";

export type DepartmentLeaderDelegation = {
  departmentId: string;
  departmentName: string;
  memberProfileId: string;
  memberName: string;
  memberSlug: string;
  gender: string | null;
  granted: boolean;
};

const grantSchema = z.object({
  ministryTermId: z.string().uuid(),
  departmentId: z.string().uuid(),
  memberProfileId: z.string().uuid(),
  granted: z.boolean(),
});

type Result = { success: boolean; error?: string };

export async function getTermDepartmentDelegationsAction(
  raw: unknown,
): Promise<{
  success: boolean;
  data?: DepartmentLeaderDelegation[];
  error?: string;
}> {
  await requireSystemAdmin();
  const parsed = z.object({ ministryTermId: z.string().uuid() }).safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid term request." };
  const s = await createClient();
  const { data: departments, error: departmentsError } = await s
    .from("term_department")
    .select(
      "id,name,leader_member_profile_id,leader:member_profile!term_department_leader_member_profile_id_fkey(id,full_name,slug,gender)",
    )
    .eq("ministry_term_id", parsed.data.ministryTermId)
    .not("leader_member_profile_id", "is", null)
    .order("name");
  if (departmentsError) {
    console.error("Failed to fetch Department Leaders", {
      code: departmentsError.code,
      message: departmentsError.message,
    });
    return { success: false, error: "Unable to load Department Leaders." };
  }

  const { data: delegations, error: delegationsError } = await s
    .from("ministry_operation_delegation")
    .select("member_profile_id")
    .eq("ministry_term_id", parsed.data.ministryTermId)
    .eq("capability", "ministry.operational.manage");
  if (delegationsError) {
    console.error("Failed to fetch ministry operation delegations", {
      code: delegationsError.code,
      message: delegationsError.message,
    });
    return { success: false, error: "Unable to load Department permissions." };
  }
  const grantedIds = new Set(
    (delegations ?? []).map((delegation) => delegation.member_profile_id),
  );
  return {
    success: true,
    data: (departments ?? []).flatMap((department) => {
      const leader = Array.isArray(department.leader)
        ? department.leader[0]
        : department.leader;
      return leader
        ? [
            {
              departmentId: department.id,
              departmentName: department.name,
              memberProfileId: leader.id,
              memberName: leader.full_name,
              memberSlug: leader.slug,
              gender: leader.gender,
              granted: grantedIds.has(leader.id),
            },
          ]
        : [];
    }),
  };
}

/**
 * Grants or revokes the ministry-level session management capability for one
 * current Department Leader in one term.
 */
export async function setMinistryOperationDelegationAction(
  raw: unknown,
): Promise<Result> {
  await requireSystemAdmin();
  const parsed = grantSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid delegation request." };
  const s = await createClient();

  const { data: department } = await s
    .from("term_department")
    .select("ministry_term_id,leader_member_profile_id")
    .eq("id", parsed.data.departmentId)
    .eq("ministry_term_id", parsed.data.ministryTermId)
    .maybeSingle();
  if (!department) return { success: false, error: "Department not found." };
  if (department.leader_member_profile_id !== parsed.data.memberProfileId)
    return {
      success: false,
      error: "Only the current Department Leader can receive this permission.",
    };
  if (!parsed.data.granted) {
    const { error } = await s
      .from("ministry_operation_delegation")
      .delete()
      .eq("ministry_term_id", parsed.data.ministryTermId)
      .eq("member_profile_id", parsed.data.memberProfileId)
      .eq("capability", "ministry.operational.manage");
    if (error) return { success: false, error: "Unable to revoke permission." };
    revalidatePath("/portal", "layout");
    return { success: true };
  }

  const { error } = await s.from("ministry_operation_delegation").upsert(
    {
      ministry_term_id: parsed.data.ministryTermId,
      member_profile_id: parsed.data.memberProfileId,
      capability: "ministry.operational.manage",
    },
    { onConflict: "ministry_term_id,member_profile_id,capability" },
  );
  if (error) return { success: false, error: "Unable to grant permission." };
  revalidatePath("/portal", "layout");
  return { success: true };
}
