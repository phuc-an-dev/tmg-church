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

const termRoleSchema = z.object({
  termId: z.string().uuid(),
  memberProfileId: z.string().uuid(),
  role: z.string().min(1),
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

export async function assignTermRoleAction(
  rawInput: unknown,
): Promise<ActionResult<{ assigned: boolean }>> {
  await requireSystemAdmin();
  const parsed = termRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid term role request.",
      code: "VALIDATION_FAILED",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_term_role", {
    p_term_id: parsed.data.termId,
    p_member_profile_id: parsed.data.memberProfileId,
    p_role: parsed.data.role,
  });
  if (error) {
    return {
      success: false,
      error: "Failed to assign Ministry role.",
      code: error.code,
    };
  }
  revalidatePath("/admin/ministries");
  return {
    success: true,
    data: { assigned: true },
    message: "Ministry role assigned.",
  };
}

export async function removeTermRoleAction(
  rawInput: unknown,
): Promise<ActionResult<{ removed: boolean }>> {
  await requireSystemAdmin();
  const parsed = z
    .object({ termId: z.string().uuid(), role: z.string().min(1) })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid term role request.",
      code: "VALIDATION_FAILED",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_term_role", {
    p_term_id: parsed.data.termId,
    p_role: parsed.data.role,
  });
  if (error) {
    return {
      success: false,
      error: "Failed to remove Ministry role.",
      code: error.code,
    };
  }
  revalidatePath("/admin/ministries");
  return {
    success: true,
    data: { removed: true },
    message: "Ministry role removed.",
  };
}
