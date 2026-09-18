"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import { generateVietnameseSlug, isUuid } from "@/lib/slug";
import {
  archiveMemberSchema,
  assignTermGroupSchema,
  createMemberSchema,
  enrollMemberWithAssignmentsSchema,
  removeMinistryMembershipSchema,
  restoreMemberSchema,
  setMinistryAssignmentsSchema,
  setMemberSegmentsSchema,
  updateMemberSchema,
} from "./schemas";
import { normalizePhoneNumber } from "./phone";
import type { MemberActionResult, MutationActionResult } from "./types";

async function uniqueMemberSlug(churchId: string, fullName: string) {
  const supabase = await createClient();
  const rawBase = generateVietnameseSlug(fullName) || "member";
  const base = isUuid(rawBase) ? `${rawBase}-member` : rawBase;
  for (let n = 1; n < 100; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await supabase
      .from("member_profile")
      .select("id")
      .eq("church_id", churchId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error("Member slug lookup failed");
    if (!data) return slug;
  }
  throw new Error("Member slug limit reached");
}

async function revalidateMemberPaths(churchId: string, memberId: string) {
  revalidatePath("/admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_profile")
    .select("slug")
    .eq("id", memberId)
    .eq("church_id", churchId)
    .maybeSingle();
  if (data) revalidatePath(`/admin/members/${data.slug}`);
}

async function createMemberWithUniqueSlug(input: {
  churchId: string;
  fullName: string;
  phone: string | null;
  birthYear: number | null;
  gender: "female" | "male" | null;
}) {
  const supabase = await createClient();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = await uniqueMemberSlug(input.churchId, input.fullName);
    const result = await supabase
      .from("member_profile")
      .insert({
        church_id: input.churchId,
        slug,
        full_name: input.fullName,
        phone: input.phone,
        birth_year: input.birthYear,
        gender: input.gender,
      })
      .select("id, slug, full_name, phone, birth_year, gender, archived_at")
      .single();
    if (
      !result.error ||
      result.error.code !== "23505" ||
      !result.error.message.includes("member_profile_church_id_slug_key")
    )
      return result;
  }
  return { data: null, error: null };
}

export async function createMemberAction(
  rawInput: unknown,
): Promise<MemberActionResult> {
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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

    const { fullName, phone, birthYear, gender } = parsed.data;
    const { data, error } = await createMemberWithUniqueSlug({
      churchId: church.id,
      fullName,
      phone: normalizePhoneNumber(phone),
      birthYear,
      gender: gender ?? null,
    });

    if (error || !data) {
      return {
        success: false,
        error: "The member could not be created. Please try again.",
        code: "CREATE_FAILED",
      };
    }

    await revalidateMemberPaths(church.id, data.id);

    return {
      success: true,
      data: {
        id: data.id,
        slug: data.slug,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
        gender: data.gender,
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
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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
    const { id, fullName, phone, birthYear, gender } = parsed.data;
    const { data, error } = await supabase
      .from("member_profile")
      .update({
        full_name: fullName,
        phone: normalizePhoneNumber(phone),
        birth_year: birthYear,
        ...(gender === undefined ? {} : { gender }),
      })
      .eq("id", id)
      .eq("church_id", church.id)
      .select("id, slug, full_name, phone, birth_year, gender, archived_at")
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

    await revalidateMemberPaths(church.id, id);

    return {
      success: true,
      data: {
        id: data.id,
        slug: data.slug,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
        gender: data.gender,
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
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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
      .select("id, slug, full_name, phone, birth_year, gender, archived_at")
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

    await revalidateMemberPaths(church.id, parsed.data.id);

    return {
      success: true,
      data: {
        id: data.id,
        slug: data.slug,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
        gender: data.gender,
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
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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
      .select("id, slug, full_name, phone, birth_year, gender, archived_at")
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

    await revalidateMemberPaths(church.id, parsed.data.id);

    return {
      success: true,
      data: {
        id: data.id,
        slug: data.slug,
        fullName: data.full_name,
        phone: data.phone,
        birthYear: data.birth_year,
        gender: data.gender,
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

export async function setMemberSegmentsAction(
  rawInput: unknown,
): Promise<MutationActionResult> {
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
    const parsed = setMemberSegmentsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_FAILED",
        error: "Please correct the selected segments.",
      };
    }
    const supabase = await createClient();
    const { data: member } = await supabase
      .from("member_profile")
      .select("id")
      .eq("id", parsed.data.memberId)
      .eq("church_id", church.id)
      .maybeSingle();
    if (!member)
      return { success: false, code: "NOT_FOUND", error: "Member not found." };
    const { error } = await supabase.rpc("set_member_segments", {
      target_member_id: member.id,
      target_segment_ids: parsed.data.segmentIds,
    });
    if (error)
      return {
        success: false,
        code: "DATABASE_ERROR",
        error: "Unable to update member segments.",
      };
    await revalidateMemberPaths(church.id, member.id);
    revalidatePath("/admin/segments");
    return { success: true, message: "Member segments updated." };
  } catch {
    return {
      success: false,
      code: "DATABASE_ERROR",
      error: "Unable to update member segments.",
    };
  }
}

export async function enrollMemberWithAssignmentsAction(
  rawInput: unknown,
): Promise<MutationActionResult> {
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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
        enrollment_group_id: termGroupId as unknown as string,
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

    await revalidateMemberPaths(church.id, memberId);
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
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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

    await revalidateMemberPaths(church.id, memberId);
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
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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

    // If termGroupId is null, mark existing open group membership as left
    if (!termGroupId) {
      const { data: openRecord } = await supabase
        .from("term_group_membership")
        .select("id")
        .eq("ministry_membership_id", membershipId)
        .is("ended_at", null)
        .maybeSingle();

      if (openRecord) {
        const { error: removeErr } = await supabase.rpc("remove_group_member", {
          target_record_id: openRecord.id,
        });

        if (removeErr) {
          return {
            success: false,
            error: "Failed to clear group assignment.",
            code: "CLEAR_FAILED",
          };
        }
      }

      await revalidateMemberPaths(church.id, memberId);
      return {
        success: true,
        message: "Group assignment removed.",
      };
    }

    // Call atomic RPC to assign or move member
    const { error: assignErr } = await supabase.rpc("assign_group_member", {
      target_group_id: termGroupId,
      target_membership_id: membershipId,
    });

    if (assignErr) {
      if (
        assignErr.code === "22023" &&
        assignErr.message?.includes("already in this group")
      ) {
        return {
          success: true,
          message: "Member is already in this group.",
        };
      }
      return {
        success: false,
        error: assignErr.message || "Failed to assign group. Please try again.",
        code: "ASSIGN_FAILED",
      };
    }

    await revalidateMemberPaths(church.id, memberId);
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
  const ctx = await requireOperationalContext();
  const church = ctx.church;
  try {
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

    await revalidateMemberPaths(church.id, memberId);
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
