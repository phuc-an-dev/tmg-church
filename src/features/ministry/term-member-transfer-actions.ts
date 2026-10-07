"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";

const termSchema = z.object({ termId: z.uuid() });
const previewSchema = termSchema.extend({
  rows: z
    .array(
      z.object({
        member_id: z.string().trim().max(100).optional(),
        email: z.string().trim().max(254).optional(),
      }),
    )
    .min(1)
    .max(1000),
});

async function getTransferClient(termId: string) {
  const context = await requireOperationalContext();
  const s = await createClient();
  const { data, error } = await s
    .from("ministry_term")
    .select("id,ministry!inner(church_id)")
    .eq("id", termId)
    .eq("ministry.church_id", context.church.id)
    .maybeSingle();
  if (error || !data) return null;
  return { s, churchId: context.church.id };
}

export async function previewTermMemberImportAction(raw: unknown) {
  const p = previewSchema.safeParse(raw);
  if (!p.success)
    return {
      success: false as const,
      error: "Provide up to 1,000 rows with a member ID or email.",
    };
  const client = await getTransferClient(p.data.termId);
  if (!client)
    return { success: false as const, error: "Ministry term was not found." };
  const [profiles, memberships] = await Promise.all([
    client.s
      .from("member_profile")
      .select("id,full_name,email")
      .eq("church_id", client.churchId)
      .is("archived_at", null),
    client.s
      .from("ministry_membership")
      .select("member_profile_id")
      .eq("ministry_term_id", p.data.termId),
  ]);
  if (profiles.error || memberships.error)
    return {
      success: false as const,
      error: "Unable to validate imported members.",
    };
  const enrolled = new Set(
    (memberships.data ?? []).map((m) => m.member_profile_id),
  );
  const seen = new Set<string>();
  const rows = p.data.rows.map((row, index) => {
    const email = row.email?.toLowerCase();
    const matches = (profiles.data ?? []).filter(
      (member) =>
        (row.member_id || email) &&
        (!row.member_id || member.id === row.member_id) &&
        (!email || member.email?.trim().toLowerCase() === email),
    );
    const member = matches.length === 1 ? matches[0] : null;
    let reason = member
      ? "Ready to add"
      : "Member not found or identifiers do not match";
    let status: "ready" | "enrolled" | "duplicate" | "invalid" = member
      ? "ready"
      : "invalid";
    if (member && enrolled.has(member.id)) {
      status = "enrolled";
      reason = "Already enrolled";
    } else if (member && seen.has(member.id)) {
      status = "duplicate";
      reason = "Duplicate row";
    }
    if (member) seen.add(member.id);
    return {
      row: index + 1,
      memberId: member?.id ?? null,
      label:
        member?.full_name || row.email || row.member_id || "Missing identifier",
      status,
      reason,
    };
  });
  return { success: true as const, rows };
}

export async function exportTermMembersAction(raw: unknown) {
  const p = termSchema.safeParse(raw);
  if (!p.success)
    return { success: false as const, error: "Invalid ministry term." };
  const client = await getTransferClient(p.data.termId);
  if (!client)
    return { success: false as const, error: "Ministry term was not found." };
  const { data, error } = await client.s
    .from("ministry_membership")
    .select(
      "member_profile!inner(id,full_name,email,archived_at),term_group_membership(status,ended_at,term_group(name)),ministry_assignment(term_department(name))",
    )
    .eq("ministry_term_id", p.data.termId)
    .is("member_profile.archived_at", null);
  if (error)
    return { success: false as const, error: "Unable to export members." };
  const rows = (data ?? [])
    .map((row) => {
      const member = row.member_profile as unknown as {
        id: string;
        full_name: string;
        email: string | null;
      };
      const groups = row.term_group_membership as unknown as Array<{
        status: string;
        ended_at: string | null;
        term_group: { name: string } | null;
      }>;
      const assignments = row.ministry_assignment as unknown as Array<{
        term_department: { name: string } | null;
      }>;
      return [
        member.id,
        member.full_name,
        member.email ?? "",
        groups
          .filter((group) => group.status === "active" && !group.ended_at)
          .map((group) => group.term_group?.name)
          .filter(Boolean)
          .join("; "),
        assignments
          .map((assignment) => assignment.term_department?.name)
          .filter(Boolean)
          .join("; "),
      ];
    })
    .sort((a, b) => a[1].localeCompare(b[1]));
  return { success: true as const, rows };
}
