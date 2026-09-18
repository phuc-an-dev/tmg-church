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
});
