"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";
import { generateVietnameseSlug, isUuid } from "@/lib/slug";
import {
  attendanceSchema,
  bulkAttendanceSchema,
} from "@/features/session/schemas";
import type { SessionAttendanceStatus } from "@/features/session/types";

const saveSchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  ministryTermId: z.string().uuid(),
  departmentId: z.string().uuid(),
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

export async function savePortalDepartmentSessionAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Please correct the session details." };
  const s = await createClient();

  const { data: churchId } = await s.rpc("portal_department_church_id", {
    p_department_id: parsed.data.departmentId,
    p_ministry_term_id: parsed.data.ministryTermId,
  });
  if (!churchId)
    return {
      success: false,
      error:
        "Department not found or you are not allowed to manage its sessions.",
    };

  if (parsed.data.sessionId) {
    // RLS enforces department.session.manage; the filter keeps edits scoped.
    const { error } = await s
      .from("ministry_session")
      .update({
        title: parsed.data.title,
        session_date: parsed.data.sessionDate,
      })
      .eq("id", parsed.data.sessionId)
      .eq("term_department_id", parsed.data.departmentId);
    if (error)
      return {
        success: false,
        error:
          error.code === "42501"
            ? "You are not allowed to manage this department's sessions."
            : "Unable to update the session.",
      };
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
      term_department_id: parsed.data.departmentId,
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
            ? "You are not allowed to manage this department's sessions."
            : "Unable to create the session.",
      };
    }
  }
  return { success: false, error: "Unable to allocate a unique session URL." };
}

export async function deletePortalDepartmentSessionAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid session." };
  const s = await createClient();
  const { error } = await s
    .from("ministry_session")
    .delete()
    .eq("id", parsed.data.sessionId);
  if (error)
    return {
      success: false,
      error:
        error.code === "42501"
          ? "You are not allowed to manage this department's sessions."
          : "Unable to delete the session.",
    };
  revalidatePath("/portal", "layout");
  return { success: true };
}

export async function savePortalDepartmentAttendanceAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = attendanceSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid attendance." };
  return writeDepartmentAttendance(
    parsed.data.sessionId,
    [parsed.data.memberId],
    parsed.data.status,
  );
}

export async function saveBulkPortalDepartmentAttendanceAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = bulkAttendanceSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid bulk attendance request." };
  return writeDepartmentAttendance(
    parsed.data.sessionId,
    parsed.data.memberIds,
    parsed.data.status,
  );
}

async function writeDepartmentAttendance(
  sessionId: string,
  memberIds: string[],
  status: SessionAttendanceStatus,
): Promise<Result> {
  const s = await createClient();
  const { error } = await s.rpc("portal_save_department_attendance", {
    p_session_id: sessionId,
    p_member_ids: memberIds,
    p_status: status,
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
