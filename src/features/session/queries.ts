import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import { isUuid } from "@/lib/slug";
import type { SessionDetail, SessionPage, SessionTermOption } from "./types";
function safePageSize(value: number) {
  return value === 50 || value === 100 ? value : 20;
}
export async function getSessionTerms(): Promise<SessionTermOption[]> {
  const ctx = await requireOperationalContext();
  const s = await createClient();
  const { data, error } = await s
    .from("ministry_term")
    .select("id,name,ministry!inner(church_id,name)")
    .eq("ministry.church_id", ctx.church.id)
    .order("name");
  if (error) throw new Error("Failed to fetch session terms");
  return (data ?? []).map((x) => ({
    id: x.id,
    name: x.name,
    ministryName: (x.ministry as unknown as { name: string }).name,
  }));
}
export async function getSessions(p: {
  q: string;
  term: string;
  page: number;
  pageSize: number;
}): Promise<SessionPage> {
  const terms = await getSessionTerms();
  const ids = terms.map((x) => x.id);
  const pageSize = safePageSize(p.pageSize);
  if (!ids.length) return { items: [], count: 0, page: 1, pageSize };
  const s = await createClient();
  let q = s
    .from("ministry_session")
    .select(
      "id,title,session_date,ministry_term_id,session_participant(count)",
      { count: "exact" },
    )
    .in("ministry_term_id", p.term ? [p.term] : ids)
    .order("session_date", { ascending: false })
    .order("id");
  if (p.q.trim()) q = q.ilike("title", `%${p.q.trim()}%`);
  const page = Math.max(1, p.page);
  const { data, count, error } = await q.range(
    (page - 1) * pageSize,
    page * pageSize - 1,
  );
  if (error) throw new Error("Failed to fetch sessions");
  const byId = new Map(terms.map((x) => [x.id, x]));
  return {
    items: (data ?? []).map((x) => {
      const t = byId.get(x.ministry_term_id)!;
      const participants =
        (x.session_participant as unknown as { count: number }[])?.[0]?.count ??
        0;
      return {
        id: x.id,
        title: x.title,
        sessionDate: x.session_date,
        termId: x.ministry_term_id,
        termName: t.name,
        ministryName: t.ministryName,
        participantCount: participants,
        canDelete: participants === 0,
      };
    }),
    count: count ?? 0,
    page,
    pageSize,
  };
}
export async function getSessionDetail(
  id: string,
): Promise<SessionDetail | null> {
  if (!isUuid(id)) return null;
  const ctx = await requireOperationalContext();
  const s = await createClient();
  const { data: raw, error: sessionError } = await s
    .from("ministry_session")
    .select(
      "id,title,session_date,ministry_term_id,ministry_term!inner(name,ministry!inner(church_id,name)),session_participant(count)",
    )
    .eq("id", id)
    .eq("ministry_term.ministry.church_id", ctx.church.id)
    .maybeSingle();
  if (sessionError) throw new Error("Failed to fetch session");
  if (!raw) return null;
  const relation = raw.ministry_term as unknown as {
    name: string;
    ministry: { name: string };
  };
  const participantCount =
    (raw.session_participant as unknown as { count: number }[])?.[0]?.count ??
    0;
  const item = {
    id: raw.id,
    title: raw.title,
    sessionDate: raw.session_date,
    termId: raw.ministry_term_id,
    termName: relation.name,
    ministryName: relation.ministry.name,
    participantCount,
    canDelete: participantCount === 0,
  };
  const [{ data, error }, { data: attendanceRows, error: attendanceError }] =
    await Promise.all([
      s
        .from("ministry_membership")
        .select("member_profile_id,member_profile!inner(full_name,archived_at)")
        .eq("ministry_term_id", item.termId)
        .is("member_profile.archived_at", null)
        .order("member_profile(full_name)"),
      s
        .from("session_participant")
        .select("member_profile_id,attendance_record(status)")
        .eq("ministry_session_id", id),
    ]);
  if (error || attendanceError)
    throw new Error("Failed to fetch session participants");
  const statusByMember = new Map(
    (attendanceRows ?? []).map((row) => [
      row.member_profile_id,
      (row.attendance_record as unknown as { status: string } | null)?.status ??
        null,
    ]),
  );
  return {
    ...item,
    participants: (data ?? []).map((x) => {
      return {
        memberId: x.member_profile_id,
        fullName: (x.member_profile as unknown as { full_name: string })
          .full_name,
        status: (statusByMember.get(x.member_profile_id) ?? null) as
          "present" | "absent" | "excused" | null,
      };
    }),
  };
}
