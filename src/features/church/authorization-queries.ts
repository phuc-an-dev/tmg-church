import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SystemRoleCandidate = {
  userId: string;
  memberProfileId: string;
  fullName: string;
  email: string | null;
  role: "master_admin" | "admin" | null;
};

export const getSystemRoleCandidates = cache(
  async (churchId: string): Promise<SystemRoleCandidate[]> => {
    const supabase = await createClient();
    const [
      { data: profiles, error: profileError },
      { data: assignments, error: assignmentError },
    ] = await Promise.all([
      supabase
        .from("member_profile")
        .select("id, user_id, full_name, email")
        .eq("church_id", churchId)
        .is("archived_at", null)
        .not("user_id", "is", null)
        .order("full_name"),
      supabase
        .from("system_role_assignment")
        .select("user_id, role")
        .eq("church_id", churchId),
    ]);

    if (profileError || assignmentError) {
      throw new Error("Failed to fetch system role assignments");
    }

    const roleByUser = new Map(
      (assignments ?? []).map((assignment) => [
        assignment.user_id,
        assignment.role,
      ]),
    );

    return (profiles ?? [])
      .filter((profile): profile is typeof profile & { user_id: string } =>
        Boolean(profile.user_id),
      )
      .map((profile) => ({
        userId: profile.user_id,
        memberProfileId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role:
          (roleByUser.get(profile.user_id) as SystemRoleCandidate["role"]) ??
          null,
      }));
  },
);
