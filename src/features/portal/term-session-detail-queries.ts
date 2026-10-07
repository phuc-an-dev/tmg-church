import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  buildSessionAttendanceDetail,
  type AttendanceFilters,
} from "@/features/session/attendance-detail";
import { requirePortalContext } from "@/features/auth/queries";
import type {
  SessionDetail,
  SessionParticipantDetail,
  SessionServiceAssignmentData,
} from "@/features/session/types";

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

  return buildSessionAttendanceDetail(
    payload.session,
    participantDetails,
    filters,
  );
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
