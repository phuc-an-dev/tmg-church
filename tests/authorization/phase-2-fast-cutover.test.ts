import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const password = "TMGPhase1FixturePassword!";
const churchId = "c0000000-0000-4000-8000-000000000001";
const masterProfileId = "e1a52f99-6f89-425a-aaca-676369dd6991";
const termId = "51de3dbb-929f-473a-ac34-014f33c79938";
const ids = {
  masterAdmin: "a841f275-afc9-46cf-9b23-a6268ab2fb4b",
  admin: "00000000-0000-4000-8000-000000000099",
  noRoleMember: "00000000-0000-4000-8000-000000000098",
} as const;
const emails = {
  masterAdmin: "anphucphamtrinh@gmail.com",
  admin: "phase1-admin@example.test",
  noRoleMember: "phase1-no-role@example.test",
} as const;
type Client = SupabaseClient<Database>;
const clients = {} as Record<keyof typeof emails, Client>;
const anon = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signIn(email: string) {
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await client.auth.signInWithPassword({ email, password });
  expect(result.error).toBeNull();
  return client;
}

describe("Phase 2 fast cutover", () => {
  beforeAll(async () => {
    for (const persona of Object.keys(emails) as (keyof typeof emails)[]) {
      clients[persona] = await signIn(emails[persona]);
      expect((await clients[persona].auth.getUser()).data.user?.id).toBe(
        ids[persona],
      );
    }
  });

  afterAll(async () => {
    await Promise.all(
      Object.values(clients).map((client) => client.auth.signOut()),
    );
  });

  it("allows only Church system admins to resolve the Church capability", async () => {
    const allowed = await clients.masterAdmin.rpc("has_capability", {
      p_capability: "church.manage",
      p_scope_type: "church",
      p_scope_id: churchId,
    });
    expect(allowed.error).toBeNull();
    expect(allowed.data).toBe(true);

    const denied = await clients.noRoleMember.rpc("has_capability", {
      p_capability: "church.manage",
      p_scope_type: "church",
      p_scope_id: churchId,
    });
    expect(denied.error).toBeNull();
    expect(denied.data).toBe(false);
  });

  it("denies anonymous protected reads and writes", async () => {
    const read = await anon.from("member_profile").select("id");
    expect(read.data).toBeNull();
    expect(read.error?.code).toBe("42501");
    const write = await anon
      .from("member_profile")
      .update({ full_name: "Anonymous" })
      .eq("id", masterProfileId);
    expect(write.data).toEqual(null);
    expect(write.error?.code).toBe("42501");
  });

  it("keeps the member projection inside the viewer's Church", async () => {
    const { data, error } = await clients.noRoleMember
      .from("member_profile_public")
      .select("church_id")
      .eq("church_id", churchId);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(new Set(data?.map((row) => row.church_id))).toEqual(
      new Set([churchId]),
    );
  });

  it("denies direct mutating RPC access to a no-role member", async () => {
    const result = await clients.noRoleMember.rpc(
      "enroll_member_with_assignments",
      {
        enrollment_member_id: masterProfileId,
        enrollment_term_id: termId,
        enrollment_group_id: "00000000-0000-4000-8000-000000000099",
        enrollment_department_ids: [],
      },
    );
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("42501");
  });

  it("lets Master Admin manage Admin assignments, but not Admin or no-role users", async () => {
    const assign = await clients.masterAdmin.rpc("set_system_admin", {
      p_church_id: churchId,
      p_user_id: ids.admin,
      p_enabled: true,
    });
    expect(assign.error).toBeNull();
    expect(assign.data).toBe(true);

    const adminDenied = await clients.admin.rpc("set_system_admin", {
      p_church_id: churchId,
      p_user_id: ids.noRoleMember,
      p_enabled: true,
    });
    expect(adminDenied.error?.code).toBe("42501");

    const noRoleDenied = await clients.noRoleMember.rpc("set_system_admin", {
      p_church_id: churchId,
      p_user_id: ids.admin,
      p_enabled: false,
    });
    expect(noRoleDenied.error?.code).toBe("42501");

    const revoke = await clients.masterAdmin.rpc("set_system_admin", {
      p_church_id: churchId,
      p_user_id: ids.admin,
      p_enabled: false,
    });
    expect(revoke.error).toBeNull();
    expect(revoke.data).toBe(true);
  });

  it("lets system admins assign and remove an enrolled Ministry role", async () => {
    const assign = await clients.masterAdmin.rpc("assign_term_role", {
      p_term_id: termId,
      p_member_profile_id: masterProfileId,
      p_role: "ministry_head",
    });
    expect(assign.error).toBeNull();
    expect(assign.data).toBe(true);

    const remove = await clients.masterAdmin.rpc("remove_term_role", {
      p_term_id: termId,
      p_role: "ministry_head",
    });
    expect(remove.error).toBeNull();
    expect(remove.data).toBe(true);
  });

  it("rejects Ministry role assignment for an unenrolled member", async () => {
    const profileId = crypto.randomUUID();
    const insert = await clients.masterAdmin.from("member_profile").insert({
      id: profileId,
      church_id: churchId,
      full_name: "Unenrolled Role Tester",
      slug: `unenrolled-role-${profileId.slice(0, 8)}`,
    });
    expect(insert.error).toBeNull();

    const result = await clients.masterAdmin.rpc("assign_term_role", {
      p_term_id: termId,
      p_member_profile_id: profileId,
      p_role: "ministry_head",
    });
    expect(result.error?.code).toBe("P0001");

    const cleanup = await clients.masterAdmin
      .from("member_profile")
      .delete()
      .eq("id", profileId);
    expect(cleanup.error).toBeNull();
  });

  it("scopes invitations, hashes tokens, and rejects mismatched authenticated email", async () => {
    const profileId = crypto.randomUUID();
    const email = `invitation-${profileId.slice(0, 8)}@example.test`;
    const insert = await clients.masterAdmin.from("member_profile").insert({
      id: profileId,
      church_id: churchId,
      full_name: "Invitation Target",
      email,
      slug: `invitation-target-${profileId.slice(0, 8)}`,
    });
    expect(insert.error).toBeNull();

    const created = await clients.masterAdmin.rpc(
      "create_member_access_invitation",
      { p_church_id: churchId, p_member_profile_id: profileId },
    );
    expect(created.error).toBeNull();
    const payload = created.data as {
      id: string;
      email: string;
      token: string;
    };
    expect(payload.email).toBe(email);
    expect(payload.token).toHaveLength(64);

    const status = await clients.masterAdmin
      .from("member_access_invitation_status")
      .select("id, email")
      .eq("id", payload.id)
      .single();
    expect(status.error).toBeNull();
    expect(status.data?.email).toBe(email);
    expect(status.data && "token_hash" in status.data).toBe(false);

    const preview = await anon.rpc("preview_member_access_invitation", {
      p_token: payload.token,
    });
    expect(preview.error).toBeNull();
    expect((preview.data as { email: string }).email).toBe(email);

    const noRoleCreate = await clients.noRoleMember.rpc(
      "create_member_access_invitation",
      { p_church_id: churchId, p_member_profile_id: profileId },
    );
    expect(noRoleCreate.error?.code).toBe("42501");

    const mismatchedConsume = await clients.noRoleMember.rpc(
      "consume_member_access_invitation",
      { p_token: payload.token, p_email: email },
    );
    expect(mismatchedConsume.error?.code).toBe("P0001");

    const resent = await clients.masterAdmin.rpc(
      "create_member_access_invitation",
      { p_church_id: churchId, p_member_profile_id: profileId },
    );
    expect(resent.error).toBeNull();
    const resentPayload = resent.data as { id: string; token: string };
    expect(resentPayload.token).not.toBe(payload.token);

    const oldPreview = await anon.rpc("preview_member_access_invitation", {
      p_token: payload.token,
    });
    expect(oldPreview.data).toBeNull();

    const revoked = await clients.masterAdmin.rpc(
      "revoke_member_access_invitation",
      { p_church_id: churchId, p_invitation_id: resentPayload.id },
    );
    expect(revoked.error).toBeNull();
    expect(revoked.data).toBe(true);

    const revokedPreview = await anon.rpc("preview_member_access_invitation", {
      p_token: resentPayload.token,
    });
    expect(revokedPreview.data).toBeNull();
  });

  it("resolves portal capabilities by scoped role and lifecycle", async () => {
    const ministryId = crypto.randomUUID();
    const portalTermId = crypto.randomUUID();
    const groupId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const ministry = await clients.masterAdmin.from("ministry").insert({
      id: ministryId,
      church_id: churchId,
      name: "Portal Capability Ministry",
      slug: `portal-capability-ministry-${ministryId.slice(0, 8)}`,
    });
    expect(ministry.error).toBeNull();
    const term = await clients.masterAdmin.from("ministry_term").insert({
      id: portalTermId,
      ministry_id: ministryId,
      name: "Portal Capability Term",
      slug: `portal-capability-term-${portalTermId.slice(0, 8)}`,
    });
    expect(term.error).toBeNull();
    const activateTerm = await clients.masterAdmin
      .from("ministry_term")
      .update({ lifecycle: "active" })
      .eq("id", portalTermId);
    expect(activateTerm.error).toBeNull();

    const group = await clients.masterAdmin.from("term_group").insert({
      id: groupId,
      ministry_term_id: portalTermId,
      name: "Portal Capability Group",
      slug: `portal-capability-${groupId.slice(0, 8)}`,
    });
    expect(group.error).toBeNull();
    const membership = await clients.masterAdmin
      .from("ministry_membership")
      .insert({
        id: membershipId,
        ministry_term_id: portalTermId,
        member_profile_id: "e1a52f99-6f89-425a-aaca-676369dd6992",
      });
    expect(membership.error).toBeNull();
    const groupMembership = await clients.masterAdmin
      .from("term_group_membership")
      .insert({
        ministry_membership_id: membershipId,
        term_group_id: groupId,
        role: "group_leader",
      });
    expect(groupMembership.error).toBeNull();

    const leader = await clients.noRoleMember.rpc("has_capability", {
      p_capability: "group.session.manage",
      p_scope_type: "group",
      p_scope_id: groupId,
    });
    expect(leader.error).toBeNull();
    expect(leader.data).toBe(true);

    const read = await clients.noRoleMember.rpc("has_capability", {
      p_capability: "group.read",
      p_scope_type: "group",
      p_scope_id: groupId,
    });
    expect(read.error).toBeNull();
    expect(read.data).toBe(true);

    const deputy = await clients.masterAdmin
      .from("term_group_membership")
      .update({ role: "deputy_leader" })
      .eq("ministry_membership_id", membershipId);
    expect(deputy.error).toBeNull();
    const deputyManage = await clients.noRoleMember.rpc("has_capability", {
      p_capability: "group.session.manage",
      p_scope_type: "group",
      p_scope_id: groupId,
    });
    expect(deputyManage.error).toBeNull();
    expect(deputyManage.data).toBe(false);

    const sessionId = crypto.randomUUID();
    const session = await clients.masterAdmin
      .from("ministry_session")
      .insert({
        id: sessionId,
        church_id: churchId,
        ministry_term_id: portalTermId,
        term_group_id: groupId,
        title: "Portal RLS Session",
        slug: `portal-rls-${sessionId.slice(0, 8)}`,
        session_date: "2026-09-18",
      })
      .select("id")
      .single();
    expect(session.error).toBeNull();

    const readable = await clients.noRoleMember
      .from("ministry_session")
      .select("id")
      .eq("id", sessionId)
      .single();
    expect(readable.error).toBeNull();

    const destructive = await clients.noRoleMember
      .from("ministry_session")
      .delete()
      .eq("id", sessionId);
    expect(destructive.error).toBeNull();
    expect(destructive.data).toBeNull();

    const stillPresent = await clients.masterAdmin
      .from("ministry_session")
      .select("id")
      .eq("id", sessionId)
      .single();
    expect(stillPresent.error).toBeNull();

    const cleanup = await clients.masterAdmin
      .from("ministry_session")
      .delete()
      .eq("id", sessionId);
    expect(cleanup.error).toBeNull();

    await clients.masterAdmin
      .from("term_group_membership")
      .delete()
      .eq("ministry_membership_id", membershipId);
    await clients.masterAdmin
      .from("ministry_membership")
      .delete()
      .eq("id", membershipId);
    await clients.masterAdmin.from("term_group").delete().eq("id", groupId);
    const removeTerm = await clients.masterAdmin
      .from("ministry_term")
      .delete()
      .eq("id", portalTermId);
    expect(removeTerm.error).toBeNull();
    const removeMinistry = await clients.masterAdmin
      .from("ministry")
      .delete()
      .eq("id", ministryId);
    expect(removeMinistry.error).toBeNull();
  });
});
