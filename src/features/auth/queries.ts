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
