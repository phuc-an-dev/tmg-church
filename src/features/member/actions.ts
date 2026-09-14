"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import { updateMemberSchema } from "./schemas";
import type { MemberActionResult } from "./types";

export async function updateMemberAction(
  rawInput: unknown,
): Promise<MemberActionResult> {
  try {
    await requireLeader();
    const church = await getActiveChurch();

    if (!church) {
      return {
        success: false,
        error: "No active church is available.",
        code: "CHURCH_NOT_FOUND",
      };
    }

    const parsed = updateMemberSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const [key, issues] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        if (issues?.length) fieldErrors[key] = issues;
      }
      return {
        success: false,
        error: "Validation failed. Please check the entered data.",
        fieldErrors,
        code: "VALIDATION_FAILED",
      };
    }

    const supabase = await createClient();
    const { id, fullName, phone, birthYear } = parsed.data;
    const { data, error } = await supabase
      .from("member_profile")
      .update({
        full_name: fullName,
        phone: phone || null,
        birth_year: birthYear,
      })
      .eq("id", id)
      .eq("church_id", church.id)
      .is("archived_at", null)
      .select("id, full_name, phone, birth_year")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: "The member could not be updated. Please try again.",
        code: "UPDATE_FAILED",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "The requested member was not found.",
        code: "NOT_FOUND",
      };
    }

    revalidatePath("/admin");

    return {
      success: true,
      data: {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
      },
      message: "Member updated successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while updating the member.",
      code: "UNKNOWN_ERROR",
    };
  }
}
