"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/features/auth/queries";
import type { ActionResult } from "./types";

const systemRoleSchema = z.object({
  churchId: z.string().uuid(),
  userId: z.string().uuid(),
  enabled: z.boolean(),
});

export async function setSystemAdminAction(
  rawInput: unknown,
): Promise<ActionResult<{ enabled: boolean }>> {
  await requireSystemAdmin();
  const parsed = systemRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid system role request.",
      code: "VALIDATION_FAILED",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_system_admin", {
    p_church_id: parsed.data.churchId,
    p_user_id: parsed.data.userId,
    p_enabled: parsed.data.enabled,
  });
  if (error) {
    return {
      success: false,
      error:
        error.code === "42501"
          ? "Only the Master Admin can manage Admin accounts."
          : "Failed to update system role.",
      code: error.code,
    };
  }

  revalidatePath("/admin/church/advanced");
  return {
    success: true,
    data: { enabled: Boolean(data) },
    message: "System role updated.",
  };
}
