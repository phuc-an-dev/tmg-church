"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/features/auth/queries";
import { TERM_BOARD_ROLE_OPTIONS } from "@/features/ministry/board-roles";
import type { ActionResult } from "./types";

const systemRoleSchema = z.object({
  churchId: z.string().uuid(),
  userId: z.string().uuid(),
  enabled: z.boolean(),
});

const termRoleIdSchema = z
  .string()
  .refine((value) =>
    TERM_BOARD_ROLE_OPTIONS.some((option) => option.value === value),
  );

const termRoleSchema = z.object({
  termId: z.string().uuid(),
  memberProfileId: z.string().uuid(),
  role: termRoleIdSchema,
});

const departmentLeaderSchema = z.object({
  departmentId: z.string().uuid(),
  memberProfileId: z.string().uuid().nullable(),
});

export async function setDepartmentLeaderAction(
  rawInput: unknown,
): Promise<ActionResult<{ assigned: boolean }>> {
  await requireSystemAdmin();
  const parsed = departmentLeaderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid Department Leader request.",
      code: "VALIDATION_FAILED",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_department_leader", {
    p_department_id: parsed.data.departmentId,
    p_member_profile_id: parsed.data.memberProfileId,
  });
  if (error) {
    return {
      success: false,
      error: error.message.includes("currently serve on the Executive Board")
        ? "Choose a current Executive Board member from this term."
        : "Unable to update the Department Leader.",
      code: error.code,
    };
  }
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/ministries", "layout");
  revalidatePath("/portal", "layout");
  return {
    success: true,
    data: { assigned: parsed.data.memberProfileId !== null },
    message: "Department Leader updated.",
  };
}

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
      error: "Invalid Executive Board role request.",
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
      error: error.message.includes("Reassign Department Leader")
        ? "Reassign the Department Leader before changing this Board role."
        : error.message.includes("not enabled")
          ? "This role is not enabled for the Executive Board."
          : error.message.includes("not enrolled")
            ? "Choose a member enrolled in this term."
            : "Failed to assign Executive Board role.",
      code: error.code,
    };
  }
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/ministries", "layout");
  return {
    success: true,
    data: { assigned: true },
    message: "Executive Board role assigned.",
  };
}

export async function removeTermRoleAction(
  rawInput: unknown,
): Promise<ActionResult<{ removed: boolean }>> {
  await requireSystemAdmin();
  const parsed = z
    .object({
      termId: z.string().uuid(),
      role: termRoleIdSchema,
    })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid Executive Board role request.",
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
      error: error.message.includes("Reassign Department Leader")
        ? "Reassign the Department Leader before unassigning this Board role."
        : "Failed to unassign Executive Board role.",
      code: error.code,
    };
  }
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/ministries", "layout");
  return {
    success: true,
    data: { removed: true },
    message: "Executive Board role unassigned.",
  };
}
