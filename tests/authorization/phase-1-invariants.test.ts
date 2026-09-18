import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { runLocalFixtureSql } from "./phase-1-global-setup";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const CHURCH_ID = "c0000000-0000-4000-8000-000000000001";
const MASTER_ADMIN_USER_ID = "a841f275-afc9-46cf-9b23-a6268ab2fb4b";
const MASTER_ADMIN_PROFILE_ID = "e1a52f99-6f89-425a-aaca-676369dd6991";
const MASTER_ADMIN_EMAIL = "anphucphamtrinh@gmail.com";
const FIXTURE_PASSWORD = "TMGPhase1FixturePassword!";
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000099";
const MINISTRY_ID = "1b7fb214-e255-4007-80d6-ebd1cece1a30";
const TERM_ID = "51de3dbb-929f-473a-ac34-014f33c79938";

const anonClient = createClient<Database>(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let leaderClient: SupabaseClient<Database>;

function localSql(sql: string) {
  const hostname = new URL(supabaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Local fixture SQL is forbidden outside localhost.");
  }
  return runLocalFixtureSql(sql);
}

describe("Phase 1: Authorization Foundation Invariants", () => {
  beforeAll(async () => {
    leaderClient = createClient<Database>(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await leaderClient.auth.signInWithPassword({
      email: MASTER_ADMIN_EMAIL,
      password: FIXTURE_PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.user?.id).toBe(MASTER_ADMIN_USER_ID);
  });

  afterAll(async () => {
    await leaderClient.auth.signOut();
  });

  it("upgrades a populated baseline with the confirmed profile link, singleton master, and bootstrap audit", async () => {
    const { data: profile, error: profileError } = await leaderClient
      .from("member_profile")
      .select("user_id, email")
      .eq("id", MASTER_ADMIN_PROFILE_ID)
      .single();
    expect(profileError).toBeNull();
    expect(profile).toEqual({
      user_id: MASTER_ADMIN_USER_ID,
      email: MASTER_ADMIN_EMAIL,
    });

    const { data: master, error: masterError } = await leaderClient
      .from("system_role_assignment")
      .select("id, user_id")
      .eq("church_id", CHURCH_ID)
      .eq("role", "master_admin")
      .single();
    expect(masterError).toBeNull();
    expect(master?.user_id).toBe(MASTER_ADMIN_USER_ID);

    const { data: audit, error: auditError } = await leaderClient
      .from("application_audit_log")
      .select("action, target_type, target_id, scope_type, scope_id")
      .eq("action", "authorization.bootstrap_master_admin")
      .eq("target_type", "system_role_assignment")
      .eq("target_id", master!.id)
      .eq("scope_type", "church")
      .eq("scope_id", CHURCH_ID);
    expect(auditError).toBeNull();
    expect(audit).toHaveLength(1);
  });

  it("keeps RLS assertions on anon and email/password clients", async () => {
    const { data: anonRoles } = await anonClient
      .from("system_role_assignment")
      .select("id")
      .eq("church_id", CHURCH_ID);
    expect(anonRoles).toEqual([]);

    const { data, error } = await leaderClient.rpc("has_capability", {
      p_capability: "church.manage",
      p_scope_type: "church",
      p_scope_id: CHURCH_ID,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("rejects a second master_admin and protects the only master_admin", () => {
    localSql(`
      do $$ begin
        begin
          insert into public.system_role_assignment (church_id, user_id, role)
          values ('${CHURCH_ID}', '${ADMIN_USER_ID}', 'master_admin');
          raise exception 'second master unexpectedly succeeded';
        exception when unique_violation then null;
        end;
        begin
          delete from public.system_role_assignment
          where church_id = '${CHURCH_ID}' and role = 'master_admin';
          raise exception 'master deletion unexpectedly succeeded';
        exception when others then
          if position('Anti-lockout' in sqlerrm) = 0 then raise; end if;
        end;
      end $$;
    `);
  });

  it("rejects demoting the only master_admin", () => {
    localSql(`
      do $$ begin
        begin
          update public.system_role_assignment
          set role = 'admin'
          where church_id = '${CHURCH_ID}' and role = 'master_admin';
          raise exception 'master demotion unexpectedly succeeded';
        exception when others then
          if position('Anti-lockout' in sqlerrm) = 0 then raise; end if;
        end;
      end $$;
    `);
  });

  it("creates and finds the automatic system-role audit by exact target", async () => {
    const assignmentId = crypto.randomUUID();
    localSql(`
      insert into public.system_role_assignment (id, church_id, user_id, role)
      values ('${assignmentId}', '${CHURCH_ID}', '${ADMIN_USER_ID}', 'admin');
    `);

    const { data, error } = await leaderClient
      .from("application_audit_log")
      .select("action, target_type, target_id, scope_type, scope_id")
      .eq("action", "system_role.assigned")
      .eq("target_type", "system_role_assignment")
      .eq("target_id", assignmentId)
      .eq("scope_type", "church")
      .eq("scope_id", CHURCH_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("denies direct term-role writes until the role-management phase", async () => {
    const { error: createError } = await leaderClient
      .from("term_role_assignment")
      .insert({
        ministry_term_id: TERM_ID,
        member_profile_id: MASTER_ADMIN_PROFILE_ID,
        role: "secretary",
      })
      .select("id")
      .single();
    expect(createError?.code).toBe("42501");
  });

  it("rejects a non-enrolled term officer", async () => {
    const profileId = crypto.randomUUID();
    localSql(`
      insert into public.member_profile (id, church_id, full_name, slug)
      values ('${profileId}', '${CHURCH_ID}', 'Unenrolled Invariant Tester', 'unenrolled-${profileId.slice(0, 8)}');
    `);
    const { error } = await leaderClient.from("term_role_assignment").insert({
      ministry_term_id: TERM_ID,
      member_profile_id: profileId,
      role: "treasurer",
    });
    expect(error?.code).toBe("P0001");
  });

  it("records lifecycle transitions by exact target and blocks role changes after closure", async () => {
    const termId = crypto.randomUUID();
    const slugSuffix = termId.slice(0, 8);
    const { error: insertError } = await leaderClient
      .from("ministry_term")
      .insert({
        id: termId,
        ministry_id: MINISTRY_ID,
        name: `Audit lifecycle ${slugSuffix}`,
        slug: `audit-lifecycle-${slugSuffix}`,
        lifecycle: "draft",
      });
    expect(insertError).toBeNull();

    const { error: activateError } = await leaderClient
      .from("ministry_term")
      .update({ lifecycle: "active" })
      .eq("id", termId);
    expect(activateError).toBeNull();

    const { data: audit, error: auditError } = await leaderClient
      .from("application_audit_log")
      .select("action, target_type, target_id, scope_type, scope_id")
      .eq("action", "ministry_term.lifecycle_transition")
      .eq("target_type", "ministry_term")
      .eq("target_id", termId)
      .eq("scope_type", "ministry_term")
      .eq("scope_id", termId);
    expect(auditError).toBeNull();
    expect(audit).toHaveLength(1);

    const { error: closeError } = await leaderClient
      .from("ministry_term")
      .update({ lifecycle: "closed" })
      .eq("id", termId);
    expect(closeError).toBeNull();

    const { error: roleError } = await leaderClient
      .from("term_role_assignment")
      .insert({
        ministry_term_id: termId,
        member_profile_id: MASTER_ADMIN_PROFILE_ID,
        role: "treasurer",
      });
    expect(roleError?.message).toMatch(/closed|immutable/i);
  });

  it("does not allow a role assignment to leave a closed term", async () => {
    const closedTermId = crypto.randomUUID();
    const draftTermId = crypto.randomUUID();
    localSql(`
      insert into public.ministry_term (id, ministry_id, name, slug, lifecycle)
      values ('${closedTermId}', '${MINISTRY_ID}', 'Closed role source', 'closed-role-source-${closedTermId.slice(0, 8)}', 'draft'),
        ('${draftTermId}', '${MINISTRY_ID}', 'Draft role target', 'draft-role-target-${draftTermId.slice(0, 8)}', 'draft');
      insert into public.ministry_membership (ministry_term_id, member_profile_id)
      values ('${closedTermId}', '${MASTER_ADMIN_PROFILE_ID}'), ('${draftTermId}', '${MASTER_ADMIN_PROFILE_ID}');
      insert into public.term_role_assignment (ministry_term_id, member_profile_id, role)
      values ('${closedTermId}', '${MASTER_ADMIN_PROFILE_ID}', 'treasurer');
      update public.ministry_term set lifecycle = 'active' where id = '${closedTermId}';
      update public.ministry_term set lifecycle = 'closed' where id = '${closedTermId}';
    `);
    const { data: updated, error } = await leaderClient
      .from("term_role_assignment")
      .update({ ministry_term_id: draftTermId })
      .eq("ministry_term_id", closedTermId)
      .eq("role", "treasurer")
      .select("id");
    expect(error).toBeNull();
    expect(updated).toEqual([]);
  });

  it("keeps the generic audit RPC unavailable to authenticated users", async () => {
    const { error } = await leaderClient.rpc("log_application_audit_event", {
      p_church_id: CHURCH_ID,
      p_actor_id: MASTER_ADMIN_USER_ID,
      p_action: "test.generic-audit-call",
      p_scope_type: "church",
      p_scope_id: CHURCH_ID,
      p_target_type: "test",
    });
    expect(error?.code).toBe("42501");
  });

  it("rejects sensitive nested audit payloads and accepts safe payloads", () => {
    const safeId = crypto.randomUUID();
    localSql(`
      insert into public.application_audit_log (id, church_id, action, scope_type, scope_id, target_type, payload)
      values ('${safeId}', '${CHURCH_ID}', 'test.safe-payload', 'church', '${CHURCH_ID}', 'test', '{"context":{"approved":true}}'::jsonb);
      do $$ begin
        begin
          insert into public.application_audit_log (church_id, action, scope_type, scope_id, target_type, payload)
          values ('${CHURCH_ID}', 'test.unsafe-payload', 'church', '${CHURCH_ID}', 'test', '{"context":{"invitation_token":"forbidden"}}'::jsonb);
          raise exception 'unsafe audit payload unexpectedly succeeded';
        exception when check_violation then null;
        end;
      end $$;
    `);
  });

  it("rejects direct client inserts and database-level audit mutation", async () => {
    const { error } = await leaderClient.from("application_audit_log").insert({
      church_id: CHURCH_ID,
      action: "test.client-insert",
      scope_type: "church",
      scope_id: CHURCH_ID,
      target_type: "test",
    });
    expect(error?.code).toBe("42501");

    localSql(`
      do $$ begin
        begin
          update public.application_audit_log set action = 'test.tampered' where action = 'test.safe-payload';
          raise exception 'audit update unexpectedly succeeded';
        exception when others then
          if position('append-only' in lower(sqlerrm)) = 0 then raise; end if;
        end;
        begin
          delete from public.application_audit_log where action = 'test.safe-payload';
          raise exception 'audit delete unexpectedly succeeded';
        exception when others then
          if position('append-only' in lower(sqlerrm)) = 0 then raise; end if;
        end;
      end $$;
    `);
  });
});
