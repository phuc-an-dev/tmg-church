import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type LeaderRow = Database["public"]["Tables"]["leaders"]["Row"];

export type AuthContext =
  | {
      status: "unauthenticated";
      user: null;
      email: null;
    }
  | {
      status: "unauthorized";
      user: User;
      email: string;
    }
  | {
      status: "authorized";
      user: User;
      email: string;
      leader: LeaderRow;
    };

/**
 * Retrieves the current authentication and leader authorization context.
 * Deduplicated per request using React cache().
 * Uses getUser() rather than getSession() as server authorization evidence.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "unauthenticated",
      user: null,
      email: null,
    };
  }

  const { data: leader, error: leaderError } = await supabase
    .from("leaders")
    .select("user_id, email, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = user.email ?? leader?.email ?? "";

  if (leaderError || !leader) {
    return {
      status: "unauthorized",
      user,
      email,
    };
  }

  return {
    status: "authorized",
    user,
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
