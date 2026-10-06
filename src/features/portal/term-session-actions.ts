"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";
import { generateVietnameseSlug, isUuid } from "@/lib/slug";

const saveSchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  ministryTermId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Enter the session title.")
    .max(120, "Title must be 120 characters or fewer."),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)."),
});

const deleteSchema = z.object({ sessionId: z.string().uuid() });
const attendanceSchema = z.object({
  sessionId: z.string().uuid(),
  memberId: z.string().uuid(),
  status: z.enum(["present", "absent", "excused"]),
});
const bulkAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(["present", "absent", "excused"]),
});
const serviceRolesSchema = z.object({
  sessionId: z.string().uuid(),
  roleIds: z.array(z.string().uuid()).max(500),
});
const serviceAssignmentsSchema = z.object({
  sessionId: z.string().uuid(),
  roleId: z.string().uuid(),
  membershipIds: z.array(z.string().uuid()).min(1).max(500),
});
const removeServiceAssignmentSchema = z.object({
  sessionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
});

type Result = { success: boolean; error?: string };

async function uniqueSessionSlug(
  churchId: string,
  title: string,
  sessionDate: string,
) {
  const s = await createClient();
  const rawBase =
    generateVietnameseSlug(`${title} ${sessionDate}`) || "session";
  const base = isUuid(rawBase) ? `${rawBase}-session` : rawBase;
  for (let n = 1; n < 100; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await s
      .from("ministry_session")
      .select("id")
      .eq("church_id", churchId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error("Session slug lookup failed");
    if (!data) return slug;
  }
  throw new Error("Session slug limit reached");
}

export async function savePortalTermSessionAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Please correct the session details." };
  const s = await createClient();
  const { data: canManage } = await s.rpc("has_capability", {
    p_capability: "ministry.operational.manage",
    p_scope_type: "ministry_term",
    p_scope_id: parsed.data.ministryTermId,
  });
  if (canManage !== true)
    return {
      success: false,
      error: "You are not allowed to manage ministry sessions.",
    };

  const { data: churchId } = await s.rpc("portal_term_church_id", {
    p_term_id: parsed.data.ministryTermId,
  });
  if (!churchId) return { success: false, error: "Term not found." };

  if (parsed.data.sessionId) {
    const { data: updated, error } = await s
      .from("ministry_session")
      .update({
        title: parsed.data.title,
        session_date: parsed.data.sessionDate,
      })
      .eq("id", parsed.data.sessionId)
      .eq("ministry_term_id", parsed.data.ministryTermId)
      .is("term_department_id", null)
      .is("term_group_id", null)
      .select("id")
      .maybeSingle();
    if (error)
      return {
        success: false,
        error:
          error.code === "42501"
            ? "You are not allowed to manage ministry sessions."
            : "Unable to update the session.",
      };
    if (!updated) return { success: false, error: "Session not found." };
    revalidatePath("/portal", "layout");
    return { success: true };
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = await uniqueSessionSlug(
      churchId,
      parsed.data.title,
      parsed.data.sessionDate,
    );
    const { error } = await s.from("ministry_session").insert({
      church_id: churchId,
      ministry_term_id: parsed.data.ministryTermId,
      slug,
      title: parsed.data.title,
      session_date: parsed.data.sessionDate,
    });
    if (!error) {
      revalidatePath("/portal", "layout");
      return { success: true };
    }
    if (error.code !== "23505") {
      return {
        success: false,
        error:
          error.code === "42501"
            ? "You are not allowed to manage ministry sessions."
            : "Unable to create the session.",
      };
    }
  }
  return { success: false, error: "Unable to allocate a unique session URL." };
}

export async function deletePortalTermSessionAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid session." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("ministry_term_id")
    .eq("id", parsed.data.sessionId)
    .is("term_department_id", null)
    .is("term_group_id", null)
    .maybeSingle();
  if (!session) return { success: false, error: "Session not found." };
  const { data: canManage } = await s.rpc("has_capability", {
    p_capability: "ministry.operational.manage",
    p_scope_type: "ministry_term",
    p_scope_id: session.ministry_term_id,
  });
  if (canManage !== true)
    return {
      success: false,
      error: "You are not allowed to manage ministry sessions.",
    };
  const { error } = await s
    .from("ministry_session")
    .delete()
    .eq("id", parsed.data.sessionId)
    .is("term_department_id", null)
    .is("term_group_id", null);
  if (error)
    return {
      success: false,
      error:
        error.code === "42501"
          ? "You are not allowed to manage ministry sessions."
          : "Unable to delete the session.",
    };
  revalidatePath("/portal", "layout");
  return { success: true };
}

export async function savePortalTermAttendanceAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = attendanceSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid attendance." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("ministry_term_id")
    .eq("id", parsed.data.sessionId)
    .is("term_department_id", null)
    .is("term_group_id", null)
    .maybeSingle();
  if (!session) return { success: false, error: "Session not found." };
  const { data: canManage } = await s.rpc("has_capability", {
    p_capability: "ministry.operational.manage",
    p_scope_type: "ministry_term",
    p_scope_id: session.ministry_term_id,
  });
  if (canManage !== true)
    return {
      success: false,
      error: "You are not allowed to record ministry attendance.",
    };
  const { error } = await s.rpc("portal_save_ministry_session_attendance", {
    p_session_id: parsed.data.sessionId,
    p_member_id: parsed.data.memberId,
    p_status: parsed.data.status,
  });
  if (error)
    return {
      success: false,
      error:
        error.code === "42501" || error.message.includes("not enrolled")
          ? "You do not have permission to record attendance for this member."
          : "Unable to save attendance.",
    };
  revalidatePath("/portal", "layout");
  return { success: true };
}

export async function saveBulkPortalTermAttendanceAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = bulkAttendanceSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid bulk attendance request." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,ministry_term_id")
    .eq("id", parsed.data.sessionId)
    .is("term_department_id", null)
    .is("term_group_id", null)
    .maybeSingle();
  if (!session) return { success: false, error: "Session not found." };
  const { data: canManage } = await s.rpc("has_capability", {
    p_capability: "ministry.operational.manage",
    p_scope_type: "ministry_term",
    p_scope_id: session.ministry_term_id,
  });
  if (canManage !== true)
    return {
      success: false,
      error: "You are not allowed to record ministry attendance.",
    };
  const { error } = await s.rpc(
    "portal_save_bulk_ministry_session_attendance",
    {
      p_session_id: session.id,
      p_member_ids: parsed.data.memberIds,
      p_status: parsed.data.status,
    },
  );
  if (error)
    return { success: false, error: "Unable to save bulk attendance." };
  revalidatePath("/portal", "layout");
  return { success: true };
}

export async function setPortalTermSessionServiceRolesAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = serviceRolesSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid service role selection." };
  const s = await createClient();
  const { error } = await s.rpc("portal_set_ministry_session_service_roles", {
    p_session_id: parsed.data.sessionId,
    p_role_ids: parsed.data.roleIds,
  });
  if (error)
    return {
      success: false,
      error:
        error.code === "23503"
          ? "Remove service assignments before removing a service role."
          : "Unable to update service roles.",
    };
  revalidatePath("/portal", "layout");
  return { success: true };
}

export async function batchSavePortalTermServiceAssignmentsAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = serviceAssignmentsSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid service assignment request." };
  const s = await createClient();
  const { error } = await s.rpc(
    "portal_batch_save_ministry_service_assignments",
    {
      p_session_id: parsed.data.sessionId,
      p_role_id: parsed.data.roleId,
      p_membership_ids: parsed.data.membershipIds,
    },
  );
  if (error)
    return {
      success: false,
      error:
        error.code === "42501"
          ? "You are not allowed to manage this ministry session."
          : "Unable to save service assignments.",
    };
  revalidatePath("/portal", "layout");
  return { success: true };
}

export async function removePortalTermServiceAssignmentAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = removeServiceAssignmentSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid service assignment." };
  const s = await createClient();
  const { error } = await s.rpc("portal_remove_ministry_service_assignment", {
    p_session_id: parsed.data.sessionId,
    p_assignment_id: parsed.data.assignmentId,
  });
  if (error)
    return {
      success: false,
      error:
        error.code === "42501"
          ? "You are not allowed to manage this ministry session."
          : "Unable to remove service assignment.",
    };
  revalidatePath("/portal", "layout");
  return { success: true };
}
