"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import {
  assignGroupMemberSchema,
  assignGroupMembersSchema,
  updateGroupMemberRoleSchema,
  updateGroupMemberStatusSchema,
  leaveGroupSchema,
} from "./group-schemas";

export type GroupActionResult = {
  success: boolean;
  code?: string;
  error?: string;
  message?: string;
};

export async function assignGroupMemberAction(
  rawInput: unknown,
  paths?: { ministrySlug: string; termSlug: string; groupSlug: string },
): Promise<GroupActionResult> {
  await requireOperationalContext();
  const parsed = assignGroupMemberSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_FAILED",
      error:
        parsed.error.issues[0]?.message ?? "Invalid group member assignment.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_group_member", {
    target_group_id: parsed.data.groupId,
    target_membership_id: parsed.data.membershipId,
  });

  if (error) {
    if (error.code === "23505" || error.message?.includes("already")) {
      return {
        success: false,
        code: "ALREADY_ASSIGNED",
        error: "Member is already in this group.",
      };
    }
    return {
      success: false,
      code: "ASSIGN_FAILED",
      error: error.message || "Failed to assign member to group.",
    };
  }

  if (paths) {
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}/groups/${paths.groupSlug}`,
    );
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}`,
    );
  }

  return {
    success: true,
    message: "Member added to group.",
  };
}

export async function assignGroupMembersAction(
  rawInput: unknown,
  paths?: { ministrySlug: string; termSlug: string; groupSlug: string },
): Promise<GroupActionResult & { assignedCount?: number }> {
  await requireOperationalContext();
  const parsed = assignGroupMembersSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_FAILED",
      error:
        parsed.error.issues[0]?.message ?? "Invalid group members assignment.",
    };
  }

  const supabase = await createClient();
  let assignedCount = 0;

  for (const membershipId of parsed.data.membershipIds) {
    const { error } = await supabase.rpc("assign_group_member", {
      target_group_id: parsed.data.groupId,
      target_membership_id: membershipId,
    });

    if (error) {
      if (error.code === "23505" || error.message?.includes("already")) {
        continue;
      }
      return {
        success: false,
        code: "ASSIGN_FAILED",
        error: error.message || "Failed to assign members to group.",
      };
    }
    assignedCount++;
  }

  if (paths) {
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}/groups/${paths.groupSlug}`,
    );
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}`,
    );
  }

  return {
    success: true,
    assignedCount,
    message: `Assigned ${assignedCount} member${assignedCount === 1 ? "" : "s"} to group.`,
  };
}

export async function updateGroupMemberRoleAction(
  rawInput: unknown,
  paths?: { ministrySlug: string; termSlug: string; groupSlug: string },
): Promise<GroupActionResult> {
  await requireOperationalContext();
  const parsed = updateGroupMemberRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_FAILED",
      error: parsed.error.issues[0]?.message ?? "Invalid role update data.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_group_member_role", {
    target_record_id: parsed.data.recordId,
    target_role: parsed.data.role,
  });

  if (error) {
    if (
      error.code === "23505" ||
      error.message?.includes("already held by another active member")
    ) {
      return {
        success: false,
        code: "ROLE_TAKEN",
        error:
          "This leadership role is already held by another active member in the group.",
      };
    }
    return {
      success: false,
      code: "UPDATE_FAILED",
      error: error.message || "Failed to update member role.",
    };
  }

  if (paths) {
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}/groups/${paths.groupSlug}`,
    );
  }

  return {
    success: true,
    message: "Member role updated.",
  };
}

export async function updateGroupMemberStatusAction(
  rawInput: unknown,
  paths?: { ministrySlug: string; termSlug: string; groupSlug: string },
): Promise<GroupActionResult> {
  await requireOperationalContext();
  const parsed = updateGroupMemberStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_FAILED",
      error: parsed.error.issues[0]?.message ?? "Invalid status update data.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_group_member_status", {
    target_record_id: parsed.data.recordId,
    target_status: parsed.data.status,
  });

  if (error) {
    if (
      error.code === "23505" ||
      error.message?.includes("already held by another active member")
    ) {
      return {
        success: false,
        code: "ROLE_TAKEN",
        error:
          "Cannot activate: this leadership role is already held by another active member in the group.",
      };
    }
    return {
      success: false,
      code: "UPDATE_FAILED",
      error: error.message || "Failed to update member status.",
    };
  }

  if (paths) {
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}/groups/${paths.groupSlug}`,
    );
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}`,
    );
  }

  return {
    success: true,
    message:
      parsed.data.status === "left"
        ? "Member marked as left."
        : `Member status updated to ${parsed.data.status}.`,
  };
}

export async function leaveGroupAction(
  rawInput: unknown,
  paths?: { ministrySlug: string; termSlug: string; groupSlug: string },
): Promise<GroupActionResult> {
  await requireOperationalContext();
  const parsed = leaveGroupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_FAILED",
      error: parsed.error.issues[0]?.message ?? "Invalid leave group data.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_group_member", {
    target_record_id: parsed.data.recordId,
  });

  if (error) {
    return {
      success: false,
      code: "LEAVE_FAILED",
      error: error.message || "Failed to mark member as left.",
    };
  }

  if (paths) {
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}/groups/${paths.groupSlug}`,
    );
    revalidatePath(
      `/admin/ministries/${paths.ministrySlug}/terms/${paths.termSlug}`,
    );
  }

  return {
    success: true,
    message: "Member marked as left.",
  };
}
