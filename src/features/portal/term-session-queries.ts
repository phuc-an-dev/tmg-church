import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

export async function getPortalDelegatedTerms() {
  await requirePortalContext();
  const s = await createClient();
  const { data, error } = await s.rpc("portal_delegated_terms");
  if (error) throw new Error("Failed to fetch delegated ministry terms");
  return data ?? [];
}

export async function canManagePortalTermSessions(ministryTermId: string) {
  await requirePortalContext();
  const s = await createClient();
  const { data, error } = await s.rpc("has_capability", {
    p_capability: "ministry.operational.manage",
    p_scope_type: "ministry_term",
    p_scope_id: ministryTermId,
  });
  if (error) throw new Error("Failed to check ministry session access");
  return data === true;
}

export async function getPortalTermSessions(
  ministrySlug: string,
  termSlug: string,
) {
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
  const termId = term.ministry_term_id;
  const { data: sessions, error } = await s
    .from("ministry_session")
    .select("id,slug,title,session_date,session_participant(count)")
    .eq("ministry_term_id", termId)
    .is("term_department_id", null)
    .is("term_group_id", null)
    .order("session_date", { ascending: false })
    .order("id");
  if (error) throw new Error("Failed to fetch ministry sessions");
  const { data: roster, error: rosterError } = await s.rpc(
    "portal_ministry_session_roster",
    { p_term_id: termId },
  );
  if (rosterError) throw new Error("Failed to fetch ministry session roster");
  const rosterBySession = new Map<
    string,
    { roleId: string; roleName: string; memberNames: string[] }[]
  >();
  for (const row of roster ?? []) {
    const roles = rosterBySession.get(row.session_id) ?? [];
    roles.push({
      roleId: row.role_id,
      roleName: row.role_name,
      memberNames: row.member_names,
    });
    rosterBySession.set(row.session_id, roles);
  }
  return {
    id: termId,
    sessions: (sessions ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      sessionDate: row.session_date,
      participantCount: row.session_participant[0]?.count ?? 0,
      roster: rosterBySession.get(row.id) ?? [],
    })),
  };
}
