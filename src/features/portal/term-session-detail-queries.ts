import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";
import type {
  SessionDetail,
  SessionParticipantDetail,
  SessionServiceAssignmentData,
} from "@/features/session/types";

type AttendanceFilters = {
  q?: string;
  status?: "all" | "pending" | "present" | "absent" | "excused";
  page?: number;
  pageSize?: number;
};

export async function getPortalTermSessionDetail(
  ministrySlug: string,
  termSlug: string,
  sessionSlug: string,
  filters: AttendanceFilters = {},
): Promise<SessionDetail | null> {
  await requirePortalContext();
  const s = await createClient();
  const { data: terms, error: termsError } = await s.rpc(
    "portal_delegated_terms",
  );
  if (termsError) throw new Error("Failed to fetch delegated ministry terms");
  const term = (terms ?? []).find(
    (row) => row.ministry_slug === ministrySlug && row.term_slug === termSlug,
  );
  if (!term) return null;

  const { data: session, error: sessionError } = await s
    .from("ministry_session")
    .select("id")
    .eq("slug", sessionSlug)
    .eq("ministry_term_id", term.ministry_term_id)
    .is("term_department_id", null)
    .is("term_group_id", null)
    .maybeSingle();
  if (sessionError) throw new Error("Failed to fetch ministry session");
  if (!session) return null;

  const { data, error } = await s.rpc(
    "portal_ministry_session_attendance_data",
    { p_session_id: session.id },
  );
  if (error) throw new Error("Failed to fetch ministry session attendance");
  if (!data) return null;
  const payload = data as {
    session: Omit<
      SessionDetail,
      | "summary"
      | "participants"
      | "count"
      | "page"
      | "pageSize"
      | "filteredMemberIds"
    >;
    participants: SessionParticipantDetail[];
  };
  const participantDetails = payload.participants;

  const q = filters.q?.trim().toLocaleLowerCase() ?? "";
  const filteredParticipants = participantDetails.filter((participant) => {
    if (q && !participant.fullName.toLocaleLowerCase().includes(q))
      return false;
    if (filters.status === "pending") return participant.status === null;
    if (filters.status && filters.status !== "all")
      return participant.status === filters.status;
    return true;
  });
  const pageSize = [20, 50, 100].includes(filters.pageSize ?? 20)
    ? (filters.pageSize ?? 20)
    : 20;
  const count = filteredParticipants.length;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const pageParticipants = filteredParticipants.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const summary = participantDetails.reduce(
    (counts, participant) => {
      if (participant.status) counts.recordedCount += 1;
      else counts.pendingCount += 1;
      if (participant.status === "present") counts.presentCount += 1;
      if (participant.status === "absent") counts.absentCount += 1;
      if (participant.status === "excused") counts.excusedCount += 1;
      return counts;
    },
    {
      enrolledCount: participantDetails.length,
      recordedCount: 0,
      presentCount: 0,
      absentCount: 0,
      excusedCount: 0,
      pendingCount: 0,
    },
  );
  return {
    ...payload.session,
    summary,
    participants: pageParticipants,
    count,
    page,
    pageSize,
    filteredMemberIds: filteredParticipants.map(
      (participant) => participant.memberId,
    ),
  };
}

export async function getPortalTermSessionServiceAssignmentData(
  ministrySlug: string,
  termSlug: string,
  sessionSlug: string,
): Promise<SessionServiceAssignmentData | null> {
  await requirePortalContext();
  const s = await createClient();
  const { data: terms, error: termsError } = await s.rpc(
    "portal_delegated_terms",
  );
  if (termsError) throw new Error("Failed to fetch delegated ministry terms");
  const term = (terms ?? []).find(
    (row) => row.ministry_slug === ministrySlug && row.term_slug === termSlug,
  );
  if (!term) return null;

  const { data: session, error: sessionError } = await s
    .from("ministry_session")
    .select("id")
    .eq("slug", sessionSlug)
    .eq("ministry_term_id", term.ministry_term_id)
    .is("term_department_id", null)
    .is("term_group_id", null)
    .maybeSingle();
  if (sessionError) throw new Error("Failed to fetch ministry session");
  if (!session) return null;

  const { data, error } = await s.rpc(
    "portal_ministry_session_service_assignment_data",
    { p_session_id: session.id },
  );
  if (error) throw new Error("Failed to fetch ministry session assignments");
  return (data as SessionServiceAssignmentData | null) ?? null;
}
