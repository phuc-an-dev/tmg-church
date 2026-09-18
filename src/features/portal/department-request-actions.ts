"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

const departmentSchema = z.object({ departmentId: z.string().uuid() });
const requestSchema = z.object({ requestId: z.string().uuid() });
const decisionSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().max(500).optional(),
});
type Result = { success: boolean; error?: string };

export async function submitDepartmentRequestAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = departmentSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid department." };
  const s = await createClient();
  const { error } = await s.rpc("portal_submit_department_request", {
    p_department_id: parsed.data.departmentId,
  });
  return error
    ? {
        success: false,
        error:
          error.code === "23505"
            ? "A pending request already exists."
            : "Unable to submit request.",
      }
    : { success: true };
}

export async function withdrawDepartmentRequestAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const s = await createClient();
  const { error } = await s.rpc("portal_withdraw_department_request", {
    p_request_id: parsed.data.requestId,
  });
  return error
    ? { success: false, error: "Unable to withdraw request." }
    : { success: true };
}

export async function decideDepartmentRequestAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid request decision." };
  const s = await createClient();
  const { error } = await s.rpc("portal_decide_department_request", {
    p_request_id: parsed.data.requestId,
    p_decision: parsed.data.decision,
    p_rejection_reason: parsed.data.rejectionReason ?? null,
  });
  if (!error) revalidatePath("/portal");
  return error
    ? { success: false, error: "Unable to decide request." }
    : { success: true };
}
