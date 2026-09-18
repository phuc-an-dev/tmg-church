"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

const assignSchema = z.object({
  departmentId: z.string().uuid(),
  membershipId: z.string().uuid(),
});
const removeSchema = z.object({ assignmentId: z.string().uuid() });
type Result = { success: boolean; error?: string };

export async function assignPortalDepartmentMemberAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid department assignment." };
  const s = await createClient();
  const { error } = await s.rpc("portal_assign_department_member", {
    p_department_id: parsed.data.departmentId,
    p_membership_id: parsed.data.membershipId,
  });
  if (error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Member is already assigned to this department."
          : "Unable to assign member.",
    };
  revalidatePath("/portal");
  return { success: true };
}

export async function removePortalDepartmentMemberAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = removeSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid department assignment." };
  const s = await createClient();
  const { error } = await s.rpc("portal_remove_department_member", {
    p_assignment_id: parsed.data.assignmentId,
  });
  if (error)
    return {
      success: false,
      error: "Unable to remove member from department.",
    };
  revalidatePath("/portal");
  return { success: true };
}
