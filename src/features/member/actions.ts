"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import {
  archiveMemberSchema,
  assignTermGroupSchema,
  createMemberSchema,
  enrollMemberWithAssignmentsSchema,
  removeMinistryMembershipSchema,
  restoreMemberSchema,
  setMinistryAssignmentsSchema,
  updateMemberSchema,
} from "./schemas";
import { normalizePhoneNumber } from "./phone";
import type { MemberActionResult, MutationActionResult } from "./types";

export async function createMemberAction(
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

    const parsed = createMemberSchema.safeParse(rawInput);
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
    const { fullName, phone, birthYear } = parsed.data;
    const { data, error } = await supabase
      .from("member_profile")
      .insert({
        church_id: church.id,
        full_name: fullName,
        phone: normalizePhoneNumber(phone),
        birth_year: birthYear,
      })
      .select("id, full_name, phone, birth_year, archived_at")
      .single();

    if (error || !data) {
      return {
        success: false,
        error: "The member could not be created. Please try again.",
        code: "CREATE_FAILED",
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
        archivedAt: data.archived_at,
      },
      message: "Member created successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while creating the member.",
      code: "UNKNOWN_ERROR",
    };
  }
}

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
        phone: normalizePhoneNumber(phone),
        birth_year: birthYear,
      })
      .eq("id", id)
      .eq("church_id", church.id)
      .select("id, full_name, phone, birth_year, archived_at")
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
    revalidatePath(`/admin/members/${id}`);

    return {
      success: true,
      data: {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
        archivedAt: data.archived_at,
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

export async function archiveMemberAction(
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

    const parsed = archiveMemberSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid member ID.",
        code: "VALIDATION_FAILED",
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("member_profile")
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("church_id", church.id)
      .is("archived_at", null)
      .select("id, full_name, phone, birth_year, archived_at")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: "The member could not be archived. Please try again.",
        code: "ARCHIVE_FAILED",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "The member was not found or is already archived.",
        code: "NOT_FOUND",
      };
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/members/${parsed.data.id}`);

    return {
      success: true,
      data: {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
        archivedAt: data.archived_at,
      },
      message: "Member archived successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while archiving the member.",
      code: "UNKNOWN_ERROR",
    };
  }
}

export async function restoreMemberAction(
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

    const parsed = restoreMemberSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid member ID.",
        code: "VALIDATION_FAILED",
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("member_profile")
      .update({
        archived_at: null,
      })
      .eq("id", parsed.data.id)
      .eq("church_id", church.id)
      .not("archived_at", "is", null)
      .select("id, full_name, phone, birth_year, archived_at")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: "The member could not be restored. Please try again.",
        code: "RESTORE_FAILED",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "The member was not found or is already active.",
        code: "NOT_FOUND",
      };
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/members/${parsed.data.id}`);

    return {
      success: true,
      data: {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
        archivedAt: data.archived_at,
      },
      message: "Member restored successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while restoring the member.",
      code: "UNKNOWN_ERROR",
    };
  }
}

export async function enrollMemberWithAssignmentsAction(
  rawInput: unknown,
): Promise<MutationActionResult> {
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

    const parsed = enrollMemberWithAssignmentsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid enrollment data.",
        code: "VALIDATION_FAILED",
      };
    }

    const { memberId, ministryTermId, termGroupId, departmentIds } =
      parsed.data;
    const supabase = await createClient();

    // Verify member belongs to active church
    const { data: member, error: memberErr } = await supabase
      .from("member_profile")
      .select("id")
      .eq("id", memberId)
      .eq("church_id", church.id)
      .maybeSingle();

    if (memberErr || !member) {
      return {
        success: false,
        error: "Member not found in the active church.",
        code: "MEMBER_NOT_FOUND",
      };
    }

    // Verify ministry term belongs to a ministry in the active church
    const { data: term, error: termErr } = await supabase
      .from("ministry_term")
      .select("id, ministry:ministry_id (church_id)")
      .eq("id", ministryTermId)
      .maybeSingle();

    const termMinistry = Array.isArray(term?.ministry)
      ? term?.ministry[0]
      : term?.ministry;

    if (termErr || !term || termMinistry?.church_id !== church.id) {
      return {
        success: false,
        error: "Ministry term not found in the active church.",
        code: "TERM_NOT_FOUND",
      };
    }

    const { error: enrollmentError } = await supabase.rpc(
      "enroll_member_with_assignments",
      {
        enrollment_member_id: memberId,
        enrollment_term_id: ministryTermId,
        enrollment_group_id: termGroupId,
        enrollment_department_ids: departmentIds,
      },
    );

    if (enrollmentError) {
      if (enrollmentError.code === "23505") {
        return {
          success: false,
          error: "This member is already enrolled in this ministry term.",
          code: "DUPLICATE_MEMBERSHIP",
        };
      }
      return {
        success: false,
        error: "Failed to enroll member with the selected assignments.",
        code: "ENROLLMENT_FAILED",
      };
    }

    revalidatePath(`/admin/members/${memberId}`);
    return {
      success: true,
      message: "Member enrolled successfully in ministry term.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while enrolling member.",
      code: "UNKNOWN_ERROR",
    };
  }
}

export async function removeMinistryMembershipAction(
  rawInput: unknown,
): Promise<MutationActionResult> {
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

    const parsed = removeMinistryMembershipSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid membership removal request.",
        code: "VALIDATION_FAILED",
      };
    }

    const { membershipId, memberId } = parsed.data;
    const supabase = await createClient();

    // Verify membership belongs to this member and church
    const { data: membership, error: memErr } = await supabase
      .from("ministry_membership")
      .select("id, member_profile:member_profile_id (church_id)")
      .eq("id", membershipId)
      .eq("member_profile_id", memberId)
      .maybeSingle();

    const memProfile = Array.isArray(membership?.member_profile)
      ? membership?.member_profile[0]
      : membership?.member_profile;

    if (memErr || !membership || memProfile?.church_id !== church.id) {
      return {
        success: false,
        error: "Membership record not found.",
        code: "MEMBERSHIP_NOT_FOUND",
      };
    }

    const { error: removalError } = await supabase.rpc(
      "remove_ministry_membership_with_assignments",
      { removal_membership_id: membershipId },
    );

    if (removalError) {
      // Check for foreign key restriction (e.g. historical session participants / attendance)
      if (removalError.code === "23503") {
        return {
          success: false,
          error:
            "This membership cannot be deleted because it is referenced by historical records. To preserve historical integrity, it must remain in place.",
          code: "HISTORICAL_RESTRICTION",
        };
      }
      return {
        success: false,
        error: "Failed to remove membership. Please try again.",
        code: "DELETE_FAILED",
      };
    }

    revalidatePath(`/admin/members/${memberId}`);
    return {
      success: true,
      message: "Membership removed successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while removing membership.",
      code: "UNKNOWN_ERROR",
    };
  }
}

export async function assignTermGroupAction(
  rawInput: unknown,
): Promise<MutationActionResult> {
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

    const parsed = assignTermGroupSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Invalid group assignment data.",
        code: "VALIDATION_FAILED",
      };
    }

    const { membershipId, memberId, termGroupId } = parsed.data;
    const supabase = await createClient();

    // Verify membership belongs to member and church
    const { data: membership, error: memErr } = await supabase
      .from("ministry_membership")
      .select(
        "id, ministry_term_id, member_profile:member_profile_id (church_id)",
      )
      .eq("id", membershipId)
      .eq("member_profile_id", memberId)
      .maybeSingle();

    const memProfile = Array.isArray(membership?.member_profile)
      ? membership?.member_profile[0]
      : membership?.member_profile;

    if (memErr || !membership || memProfile?.church_id !== church.id) {
      return {
        success: false,
        error: "Membership record not found.",
        code: "MEMBERSHIP_NOT_FOUND",
      };
    }

    // If termGroupId is null, remove existing group membership
    if (!termGroupId) {
      const { error: delErr } = await supabase
        .from("term_group_membership")
        .delete()
        .eq("ministry_membership_id", membershipId);

      if (delErr) {
        return {
          success: false,
          error: "Failed to clear group assignment.",
          code: "CLEAR_FAILED",
        };
      }

      revalidatePath(`/admin/members/${memberId}`);
      return {
        success: true,
        message: "Group assignment removed.",
      };
    }

    // If setting a group, verify group belongs to the exact same ministry term
    const { data: group, error: groupErr } = await supabase
      .from("term_group")
      .select("id, ministry_term_id")
      .eq("id", termGroupId)
      .eq("ministry_term_id", membership.ministry_term_id)
      .maybeSingle();

    if (groupErr || !group) {
      return {
        success: false,
        error: "Selected group does not belong to this ministry term.",
        code: "GROUP_MISMATCH",
      };
    }

    // Upsert or insert/update group membership (unique on ministry_membership_id)
    const { error: upsertErr } = await supabase
      .from("term_group_membership")
      .upsert(
        {
          ministry_membership_id: membershipId,
          term_group_id: termGroupId,
        },
        { onConflict: "ministry_membership_id" },
      );

    if (upsertErr) {
      return {
        success: false,
        error: "Failed to assign group. Please try again.",
        code: "ASSIGN_FAILED",
      };
    }

    revalidatePath(`/admin/members/${memberId}`);
    return {
      success: true,
      message: "Group assigned successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while assigning group.",
      code: "UNKNOWN_ERROR",
    };
  }
}

export async function setMinistryAssignmentsAction(
  rawInput: unknown,
): Promise<MutationActionResult> {
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

    const parsed = setMinistryAssignmentsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Invalid department assignment data.",
        code: "VALIDATION_FAILED",
      };
    }

    const { membershipId, memberId, termDepartmentIds } = parsed.data;
    const supabase = await createClient();

    // Verify membership belongs to member and church
    const { data: membership, error: memErr } = await supabase
      .from("ministry_membership")
      .select(
        "id, ministry_term_id, member_profile:member_profile_id (church_id)",
      )
      .eq("id", membershipId)
      .eq("member_profile_id", memberId)
      .maybeSingle();

    const memProfile = Array.isArray(membership?.member_profile)
      ? membership?.member_profile[0]
      : membership?.member_profile;

    if (memErr || !membership || memProfile?.church_id !== church.id) {
      return {
        success: false,
        error: "Membership record not found.",
        code: "MEMBERSHIP_NOT_FOUND",
      };
    }

    const { error: assignmentError } = await supabase.rpc(
      "set_ministry_assignments",
      {
        assignment_membership_id: membershipId,
        assignment_department_ids: termDepartmentIds,
      },
    );

    if (assignmentError) {
      return {
        success: false,
        error: "Failed to update department assignments. Please try again.",
        code: "ASSIGN_FAILED",
      };
    }

    revalidatePath(`/admin/members/${memberId}`);
    return {
      success: true,
      message:
        termDepartmentIds.length === 0
          ? "Department assignments cleared successfully."
          : "Department assignments updated successfully.",
    };
  } catch {
    return {
      success: false,
      error:
        "An unexpected error occurred while updating department assignments.",
      code: "UNKNOWN_ERROR",
    };
  }
}
