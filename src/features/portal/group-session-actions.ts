"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";
import { generateVietnameseSlug } from "@/lib/slug";
import {
  attendanceSchema,
  bulkAttendanceSchema,
  deleteSessionSchema,
  sessionSchema,
} from "@/features/session/schemas";

type Result = { success: boolean; error?: string; slug?: string };

async function canManageGroup(groupId: string) {
  await requirePortalContext();
  const s = await createClient();
  const { data } = await s.rpc("has_capability", {
    p_capability: "group.session.manage",
    p_scope_type: "group",
    p_scope_id: groupId,
  });
  return data === true;
}

export async function savePortalGroupSessionAction(
  raw: unknown,
): Promise<Result> {
  const p = sessionSchema.safeParse(raw);
  if (!p.success || !p.data.termGroupId || p.data.termDepartmentId)
    return { success: false, error: "Invalid group session." };
  if (!(await canManageGroup(p.data.termGroupId)))
    return {
      success: false,
      error: "You do not have permission to manage this group session.",
    };
  const s = await createClient();
  if (p.data.id) {
    const { data, error } = await s
      .from("ministry_session")
      .update({ title: p.data.title, session_date: p.data.sessionDate })
      .eq("id", p.data.id)
      .eq("term_group_id", p.data.termGroupId)
      .select("slug")
      .maybeSingle();
    if (error || !data)
      return { success: false, error: "Unable to update this session." };
    return { success: true, slug: data.slug };
  }
  const slug = `${generateVietnameseSlug(`${p.data.title} ${p.data.sessionDate}`) || "session"}-${Date.now().toString(36)}`;
  const { data, error } = await s.rpc("create_group_session", {
    p_group_id: p.data.termGroupId,
    p_slug: slug,
    p_title: p.data.title,
    p_session_date: p.data.sessionDate,
  });
  if (error || !data?.[0])
    return { success: false, error: "Unable to create this session." };
  return { success: true, slug: data[0].slug };
}

export async function deletePortalGroupSessionAction(
  raw: unknown,
): Promise<Result> {
  const p = deleteSessionSchema.safeParse(raw);
  if (!p.success) return { success: false, error: "Invalid session." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select(
      "id,slug,term_group_id,session_participant(count),session_assignment(count),service_assignment(count)",
    )
    .eq("id", p.data.id)
    .maybeSingle();
  if (
    !session ||
    !session.term_group_id ||
    !(await canManageGroup(session.term_group_id))
  )
    return { success: false, error: "Invalid session." };
  const participantCount =
    (session.session_participant as { count: number }[] | null)?.[0]?.count ??
    0;
  const assignmentCount =
    (session.session_assignment as { count: number }[] | null)?.[0]?.count ?? 0;
  const serviceCount =
    (session.service_assignment as { count: number }[] | null)?.[0]?.count ?? 0;
  if (participantCount || assignmentCount || serviceCount)
    return {
      success: false,
      error: "Sessions with attendance history cannot be deleted.",
    };
  const { error } = await s
    .from("ministry_session")
    .delete()
    .eq("id", session.id);
  return error
    ? { success: false, error: "Unable to delete this session." }
    : { success: true, slug: session.slug };
}

export async function savePortalAttendanceAction(
  raw: unknown,
): Promise<Result> {
  const p = attendanceSchema.safeParse(raw);
  if (!p.success) return { success: false, error: "Invalid attendance." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug,term_group_id")
    .eq("id", p.data.sessionId)
    .maybeSingle();
  if (!session?.term_group_id || !(await canManageGroup(session.term_group_id)))
    return {
      success: false,
      error: "You do not have permission to record attendance.",
    };
  const { error } = await s.rpc("save_session_attendance", {
    target_session_id: session.id,
    target_member_id: p.data.memberId,
    target_status: p.data.status,
  });
  return error
    ? { success: false, error: "Unable to save attendance." }
    : { success: true, slug: session.slug };
}

export async function savePortalBulkAttendanceAction(
  raw: unknown,
): Promise<Result> {
  const p = bulkAttendanceSchema.safeParse(raw);
  if (!p.success) return { success: false, error: "Invalid attendance." };
  const s = await createClient();
  const { data: session } = await s
    .from("ministry_session")
    .select("id,slug,term_group_id")
    .eq("id", p.data.sessionId)
    .maybeSingle();
  if (!session?.term_group_id || !(await canManageGroup(session.term_group_id)))
    return {
      success: false,
      error: "You do not have permission to record attendance.",
    };
  const { error } = await s.rpc("save_bulk_session_attendance", {
    target_session_id: session.id,
    target_member_ids: p.data.memberIds,
    target_status: p.data.status,
  });
  return error
    ? { success: false, error: "Unable to save attendance." }
    : { success: true, slug: session.slug };
}
