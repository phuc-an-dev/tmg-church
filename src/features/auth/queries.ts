import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type SystemRoleAssignment =
  Database["public"]["Tables"]["system_role_assignment"]["Row"];

export type AuthContext =
  | {
      status: "unauthenticated";
      email: null;
    }
  | {
      status: "unauthorized";
      email: string;
    }
  | {
      status: "authorized";
      email: string;
      systemRole: Pick<SystemRoleAssignment, "user_id" | "church_id" | "role">;
    };

export type PortalTermRole = { termId: string; role: string };
export type PortalGroupRole = { groupId: string; role: string };
export type PortalContext = {
  userId: string;
  email: string;
  memberProfileId: string | null;
  isSystemAdmin: boolean;
  termRoles: PortalTermRole[];
  groupRoles: PortalGroupRole[];
};

/**
 * Retrieves the current authentication and system-admin authorization context.
 * Deduplicated per request using React cache().
 * Verifies the session JWT with getClaims() before checking system role state.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims;
  const userId = claims?.sub;

  if (claimsError || !claims || typeof userId !== "string") {
    return {
      status: "unauthenticated",
      email: null,
    };
  }

  const { data: systemRole, error: roleError } = await supabase
    .from("system_role_assignment")
    .select("user_id, church_id, role")
    .eq("user_id", userId)
    .in("role", ["master_admin", "admin"])
    .limit(1)
    .maybeSingle();

  const email = (typeof claims.email === "string" ? claims.email : null) ?? "";

  if (roleError || !systemRole) {
    return {
      status: "unauthorized",
      email,
    };
  }

  return {
    status: "authorized",
    email,
    systemRole,
  };
});

/**
 * Guard for protected administration routes.
 * Redirects unauthenticated users to /admin/login.
 * Redirects authenticated users without a Master/Admin role to /admin/unauthorized.
 * Returns the authorized context when successful.
 */
export async function requireSystemAdmin(): Promise<
  Extract<AuthContext, { status: "authorized" }>
> {
  const context = await getAuthContext();

  if (context.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (context.status === "unauthorized") {
    redirect("/admin/unauthorized");
  }

  return context;
}

export const getPortalContext = cache(
  async (): Promise<PortalContext | null> => {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const claims = claimsData?.claims;
    const userId = claims?.sub;
    if (claimsError || !claims || typeof userId !== "string") return null;

    const { data, error } = await supabase.rpc("get_my_portal_context");
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }
    const record = data as Record<string, unknown>;
    const termRoles = Array.isArray(record.term_roles)
      ? record.term_roles
          .filter(
            (value): value is { term_id: string; role: string } =>
              Boolean(value) &&
              typeof value === "object" &&
              typeof (value as Record<string, unknown>).term_id === "string" &&
              typeof (value as Record<string, unknown>).role === "string",
          )
          .map((value) => ({ termId: value.term_id, role: value.role }))
      : [];
    const groupRoles = Array.isArray(record.group_roles)
      ? record.group_roles
          .filter(
            (value): value is { group_id: string; role: string } =>
              Boolean(value) &&
              typeof value === "object" &&
              typeof (value as Record<string, unknown>).group_id === "string" &&
              typeof (value as Record<string, unknown>).role === "string",
          )
          .map((value) => ({ groupId: value.group_id, role: value.role }))
      : [];
    const isSystemAdmin = record.is_system_admin === true;
    const memberProfileId =
      typeof record.member_profile_id === "string"
        ? record.member_profile_id
        : null;
    if (!isSystemAdmin && !memberProfileId) {
      return null;
    }
    return {
      userId,
      email: typeof claims.email === "string" ? claims.email : "",
      memberProfileId,
      isSystemAdmin,
      termRoles,
      groupRoles,
    };
  },
);

export async function requirePortalContext(): Promise<PortalContext> {
  const context = await getPortalContext();
  if (!context) {
    const auth = await getAuthContext();
    if (auth.status === "unauthenticated") redirect("/admin/login");
    redirect("/admin/unauthorized");
  }
  return context;
}
