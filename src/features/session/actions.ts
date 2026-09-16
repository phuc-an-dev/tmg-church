"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import {
  attendanceSchema,
  deleteSessionSchema,
  sessionSchema,
} from "./schemas";
type Result = { success: boolean; message?: string; error?: string };
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
        .select("id")
        .maybeSingle()
    : await s
        .from("ministry_session")
        .insert({
          ministry_term_id: term.id,
          title: p.data.title,
          session_date: p.data.sessionDate,
        })
        .select("id")
        .maybeSingle();
  if (r.error || !r.data)
    return {
      success: false,
      error: "Unable to save this session. It may no longer exist.",
    };
  revalidatePath("/admin/sessions");
  return { success: true, message: "Session saved." };
}
export async function deleteSessionAction(raw: unknown): Promise<Result> {
  await requireOperationalContext();
  const p = deleteSessionSchema.safeParse(raw);
  if (!p.success) return { success: false, error: "Invalid session." };
  const s = await createClient();
  const { count, error } = await s
    .from("session_participant")
    .select("id", { count: "exact", head: true })
    .eq("ministry_session_id", p.data.id);
  if (error || count)
    return {
      success: false,
      error:
        "Sessions with participants or attendance history cannot be deleted.",
    };
  const r = await s.from("ministry_session").delete().eq("id", p.data.id);
  if (r.error) return { success: false, error: "Unable to delete session." };
  revalidatePath("/admin/sessions");
  return { success: true, message: "Session deleted." };
}
export async function saveAttendanceAction(raw: unknown): Promise<Result> {
  await requireOperationalContext();
  const p = attendanceSchema.safeParse(raw);
  if (!p.success) return { success: false, error: "Invalid attendance." };
  const s = await createClient();
  const { error } = await s.rpc("save_session_attendance", {
    target_session_id: p.data.sessionId,
    target_member_id: p.data.memberId,
    target_status: p.data.status,
  });
  if (error) return { success: false, error: "Unable to save attendance." };
  revalidatePath(`/admin/sessions/${p.data.sessionId}`);
  return { success: true, message: "Attendance saved." };
}
