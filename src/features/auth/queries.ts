import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type LeaderRow = Database["public"]["Tables"]["leaders"]["Row"];

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
      leader: LeaderRow;
    };

/**
 * Retrieves the current authentication and leader authorization context.
 * Deduplicated per request using React cache().
 * Verifies the session JWT with getClaims() before checking leader status.
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

  const { data: leader, error: leaderError } = await supabase
    .from("leaders")
    .select("user_id, email, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  const email =
    (typeof claims.email === "string" ? claims.email : null) ??
    leader?.email ??
    "";

  if (leaderError || !leader) {
    return {
      status: "unauthorized",
      email,
    };
  }

  return {
    status: "authorized",
    email,
    leader,
  };
});

/**
 * Guard for protected administration routes.
 * Redirects unauthenticated users to /admin/login.
 * Redirects authenticated non-leaders to /admin/unauthorized.
 * Returns the authorized context when successful.
 */
export async function requireLeader(): Promise<
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
