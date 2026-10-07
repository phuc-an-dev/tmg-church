"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePortalContext } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => {
    const parsed = new Date(`${date}T12:00:00`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === date &&
      parsed.getDay() === 0
    );
  });

const saveSchema = z.object({
  termId: z.string().uuid(),
  sessionDate: dateSchema,
  reason: z.string().trim().max(240).optional(),
});

const deleteSchema = z.object({
  termId: z.string().uuid(),
  sessionDate: dateSchema,
});

type ActionResult = { success: boolean; error?: string };

export async function savePortalSessionExemptionAction(
  raw: unknown,
): Promise<ActionResult> {
  await requirePortalContext();
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Enter a valid Sunday and reason." };

  const s = await createClient();
  const { error } = await s.rpc("portal_save_ministry_session_exemption", {
    p_term_id: parsed.data.termId,
    p_session_date: parsed.data.sessionDate,
    p_reason: parsed.data.reason ?? "",
  });
  if (error)
    return {
      success: false,
      error:
        error.code === "42501"
          ? "You are not allowed to manage ministry sessions."
          : "Unable to mark this Sunday as exempt.",
    };

  revalidatePath("/portal", "page");
  return { success: true };
}

export async function deletePortalSessionExemptionAction(
  raw: unknown,
): Promise<ActionResult> {
  await requirePortalContext();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Select a valid exempt Sunday." };

  const s = await createClient();
  const { error } = await s.rpc("portal_delete_ministry_session_exemption", {
    p_term_id: parsed.data.termId,
    p_session_date: parsed.data.sessionDate,
  });
  if (error)
    return {
      success: false,
      error:
        error.code === "42501"
          ? "You are not allowed to manage ministry sessions."
          : "Unable to restore this Sunday to the schedule.",
    };

  revalidatePath("/portal", "page");
  return { success: true };
}
