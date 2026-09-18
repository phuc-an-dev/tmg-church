"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

const roleSchema = z.object({
  departmentId: z.string().uuid(),
  roleId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
});
const roleIdSchema = z.object({ roleId: z.string().uuid() });
const assignmentSchema = z.object({
  sessionId: z.string().uuid(),
  roleId: z.string().uuid(),
  membershipId: z.string().uuid(),
});
const assignmentIdSchema = z.object({ assignmentId: z.string().uuid() });
type Result = { success: boolean; error?: string };

export async function savePortalDepartmentServiceRoleAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid service role." };
  const s = await createClient();
  const { error } = await s.rpc("portal_save_department_service_role", {
    p_department_id: parsed.data.departmentId,
    p_role_id: parsed.data.roleId,
    p_name: parsed.data.name,
  });
  if (!error) revalidatePath("/portal");
  return error
    ? { success: false, error: "Unable to save service role." }
    : { success: true };
}
export async function deletePortalDepartmentServiceRoleAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = roleIdSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid service role." };
  const s = await createClient();
  const { error } = await s.rpc("portal_delete_department_service_role", {
    p_role_id: parsed.data.roleId,
  });
  return error
    ? {
        success: false,
        error:
          error.code === "23503"
            ? "Role has session assignments."
            : "Unable to delete service role.",
      }
    : { success: true };
}
export async function savePortalServiceAssignmentAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = assignmentSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid service assignment." };
  const s = await createClient();
  const { error } = await s.rpc("portal_save_service_assignment", {
    p_session_id: parsed.data.sessionId,
    p_role_id: parsed.data.roleId,
    p_membership_id: parsed.data.membershipId,
  });
  return error
    ? { success: false, error: "Unable to save service assignment." }
    : { success: true };
}
export async function removePortalServiceAssignmentAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = assignmentIdSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid service assignment." };
  const s = await createClient();
  const { error } = await s.rpc("portal_remove_service_assignment", {
    p_assignment_id: parsed.data.assignmentId,
  });
  return error
    ? { success: false, error: "Unable to remove service assignment." }
    : { success: true };
}
