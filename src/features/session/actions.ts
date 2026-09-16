"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import { generateVietnameseSlug, isUuid } from "@/lib/slug";
import {
  attendanceSchema,
  batchSaveServiceAssignmentsSchema,
  bulkAttendanceSchema,
  deleteSessionSchema,
  removeServiceAssignmentSchema,
  saveServiceAssignmentSchema,
  sessionSchema,
} from "./schemas";

type Result = { success: boolean; message?: string; error?: string };

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

async function createSessionWithUniqueSlug(input: {
  churchId: string;
  ministryTermId: string;
  title: string;
  sessionDate: string;
}) {
  const s = await createClient();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = await uniqueSessionSlug(
      input.churchId,
      input.title,
      input.sessionDate,
    );
    const result = await s
      .from("ministry_session")
      .insert({
        church_id: input.churchId,
        ministry_term_id: input.ministryTermId,
        slug,
        title: input.title,
        session_date: input.sessionDate,
      })
      .select("id,slug")
      .maybeSingle();

    if (
      !result.error ||
      result.error.code !== "23505" ||
      !result.error.message.includes("ministry_session_church_id_slug_key")
    ) {
      return result;
    }
  }
  return {
    data: null,
    error: new Error("Unable to allocate unique session slug"),
  };
}

export async function saveSessionAction(raw: unknown): Promise<Result> {
  const ctx = await requireOperationalContext();
  const p = sessionSchema.safeParse(raw);
  if (!p.success)
    return { success: false, error: "Please correct the session details." };
  const s = await createClient();
  const { data: term } = await s
    .from("ministry_term")
    .select("id,ministry!inner(church_id)")
    .eq("id", p.data.ministryTermId)
    .eq("ministry.church_id", ctx.church.id)
    .maybeSingle();
  if (!term)
    return { success: false, error: "The selected term was not found." };
  const r = p.data.id
    ? await s
        .from("ministry_session")
        .update({ title: p.data.title, session_date: p.data.sessionDate })
        .eq("id", p.data.id)
        .eq("ministry_term_id", term.id)
        .select("id,slug")
        .maybeSingle()
    : await createSessionWithUniqueSlug({
        churchId: ctx.church.id,
        ministryTermId: term.id,
        title: p.data.title,
        sessionDate: p.data.sessionDate,
      });
  if (r.error || !r.data)
    return {
      success: false,
      error: "Unable to save this session. It may no longer exist.",
    };
  revalidatePath("/admin/sessions");
  revalidatePath(`/admin/sessions/${r.data.slug}`);
  return { success: true, message: "Session saved." };
}

export async function deleteSessionAction(raw: unknown): Promise<Result> {
  const ctx = await requireOperationalContext();
  const p = deleteSessionSchema.safeParse(raw);
  if (!p.success) return { success: false, error: "Invalid session." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug")
    .eq("id", p.data.id)
    .eq("church_id", ctx.church.id)
    .maybeSingle();
  if (!session) return { success: false, error: "Invalid session." };
  const [
    { count: participantCount, error: participantError },
    { count: assignmentCount, error: assignmentError },
    { count: serviceCount, error: serviceError },
  ] = await Promise.all([
    s
      .from("session_participant")
      .select("id", { count: "exact", head: true })
      .eq("ministry_session_id", session.id),
    s
      .from("session_assignment")
      .select("id", { count: "exact", head: true })
      .eq("ministry_session_id", session.id),
    s
      .from("service_assignment")
      .select("id", { count: "exact", head: true })
      .eq("ministry_session_id", session.id),
  ]);
  if (
    participantError ||
    assignmentError ||
    serviceError ||
    participantCount ||
    assignmentCount ||
    serviceCount
  )
    return {
      success: false,
      error:
        "Sessions with participants or attendance history cannot be deleted.",
    };
  const r = await s.from("ministry_session").delete().eq("id", session.id);
  if (r.error) return { success: false, error: "Unable to delete session." };
  revalidatePath("/admin/sessions");
  revalidatePath(`/admin/sessions/${session.slug}`);
  return { success: true, message: "Session deleted." };
}

export async function saveAttendanceAction(raw: unknown): Promise<Result> {
  const ctx = await requireOperationalContext();
  const p = attendanceSchema.safeParse(raw);
  if (!p.success) return { success: false, error: "Invalid attendance." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug")
    .eq("id", p.data.sessionId)
    .eq("church_id", ctx.church.id)
    .maybeSingle();
  if (!session) return { success: false, error: "Invalid attendance." };
  const { error } = await s.rpc("save_session_attendance", {
    target_session_id: session.id,
    target_member_id: p.data.memberId,
    target_status: p.data.status,
  });
  if (error) return { success: false, error: "Unable to save attendance." };
  revalidatePath(`/admin/sessions/${session.slug}`);
  return { success: true, message: "Attendance saved." };
}

export async function saveBulkAttendanceAction(raw: unknown): Promise<Result> {
  const ctx = await requireOperationalContext();
  const p = bulkAttendanceSchema.safeParse(raw);
  if (!p.success)
    return { success: false, error: "Invalid bulk attendance request." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug")
    .eq("id", p.data.sessionId)
    .eq("church_id", ctx.church.id)
    .maybeSingle();
  if (!session) return { success: false, error: "Invalid session." };

  const { error } = await s.rpc("save_bulk_session_attendance", {
    target_session_id: session.id,
    target_member_ids: p.data.memberIds,
    target_status: p.data.status,
  });

  if (error)
    return { success: false, error: "Unable to save bulk attendance." };

  revalidatePath(`/admin/sessions/${session.slug}`);
  return {
    success: true,
    message: `Attendance saved for ${p.data.memberIds.length} members.`,
  };
}

export async function saveServiceAssignmentAction(
  raw: unknown,
): Promise<Result> {
  const ctx = await requireOperationalContext();
  const p = saveServiceAssignmentSchema.safeParse(raw);
  if (!p.success) {
    return { success: false, error: "Invalid service assignment request." };
  }

  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug")
    .eq("id", p.data.sessionId)
    .eq("church_id", ctx.church.id)
    .maybeSingle();

  if (!session) return { success: false, error: "Invalid session." };

  const { error } = await s.rpc("save_service_assignment", {
    target_session_id: session.id,
    target_role_id: p.data.roleId,
    target_membership_id: p.data.membershipId,
  });

  if (error) {
    console.error("Failed to save service assignment:", error);
    return { success: false, error: "Unable to save service assignment." };
  }

  revalidatePath(`/admin/sessions/${session.slug}`);
  return { success: true, message: "Member assigned to service role." };
}

export async function batchSaveServiceAssignmentsAction(
  raw: unknown,
): Promise<Result> {
  const ctx = await requireOperationalContext();
  const p = batchSaveServiceAssignmentsSchema.safeParse(raw);
  if (!p.success) {
    return { success: false, error: "Invalid service assignment request." };
  }

  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug")
    .eq("id", p.data.sessionId)
    .eq("church_id", ctx.church.id)
    .maybeSingle();

  if (!session) return { success: false, error: "Invalid session." };

  const { error } = await s.rpc("batch_save_service_assignments", {
    target_session_id: session.id,
    target_role_id: p.data.roleId,
    target_membership_ids: p.data.membershipIds,
  });

  if (error) {
    console.error("Failed to batch save service assignments:", error);
    return { success: false, error: "Unable to save service assignments." };
  }

  revalidatePath(`/admin/sessions/${session.slug}`);
  return {
    success: true,
    message: `Assigned ${p.data.membershipIds.length} members to service role.`,
  };
}

export async function removeServiceAssignmentAction(
  raw: unknown,
): Promise<Result> {
  const ctx = await requireOperationalContext();
  const p = removeServiceAssignmentSchema.safeParse(raw);
  if (!p.success) {
    return { success: false, error: "Invalid removal request." };
  }

  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug")
    .eq("id", p.data.sessionId)
    .eq("church_id", ctx.church.id)
    .maybeSingle();

  if (!session) return { success: false, error: "Invalid session." };

  const { error } = await s.rpc("remove_service_assignment", {
    target_assignment_id: p.data.assignmentId,
  });

  if (error) {
    console.error("Failed to remove service assignment:", error);
    return { success: false, error: "Unable to remove service assignment." };
  }

  revalidatePath(`/admin/sessions/${session.slug}`);
  return { success: true, message: "Service assignment removed." };
}
