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

export type InvitationCandidate = {
  memberProfileId: string;
  fullName: string;
  email: string | null;
};

export type InvitationStatus = {
  id: string;
  memberProfileId: string;
  email: string;
  expiresAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
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

export const getInvitationCandidates = cache(
  async (churchId: string): Promise<InvitationCandidate[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("member_profile")
      .select("id, full_name, email, user_id")
      .eq("church_id", churchId)
      .is("archived_at", null)
      .is("user_id", null)
      .order("full_name");
    if (error) throw new Error("Failed to fetch invitation candidates");
    return (data ?? []).map((profile) => ({
      memberProfileId: profile.id,
      fullName: profile.full_name,
      email: profile.email,
    }));
  },
);

export const getInvitationStatuses = cache(
  async (churchId: string): Promise<InvitationStatus[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("member_access_invitation_status")
      .select(
        "id, member_profile_id, email, expires_at, consumed_at, revoked_at, created_at",
      )
      .eq("church_id", churchId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Failed to fetch invitation statuses");
    return (data ?? []).map((invitation) => ({
      id: invitation.id ?? "",
      memberProfileId: invitation.member_profile_id ?? "",
      email: invitation.email ?? "",
      expiresAt: invitation.expires_at ?? "",
      consumedAt: invitation.consumed_at,
      revokedAt: invitation.revoked_at,
      createdAt: invitation.created_at ?? "",
    }));
  },
);
