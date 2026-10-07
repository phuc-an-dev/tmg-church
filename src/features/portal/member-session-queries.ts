import "server-only";
import { cache } from "react";
import { requirePortalContext } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

export type MemberSession = {
  id: string;
  slug: string;
  title: string;
  date: string;
  ministrySlug: string;
  termSlug: string;
  scope: string;
  scopeType: "ministry" | "group" | "department";
  myRoles: string[];
  href: string;
  roster: {
    roleId: string;
    roleName: string;
    departmentName: string | null;
    memberNames: string[];
  }[];
};

type MemberData = {
  sessions: MemberSession[];
  workspaces: {
    id: string;
    kind: "Ministry" | "Department" | "Group";
    name: string;
    context: string;
    href: string;
    accentColor?: string;
    iconKey?: string;
  }[];
};

export const getPortalMemberData = cache(
  async (sessionSlug?: string): Promise<MemberData> => {
    await requirePortalContext();
    const s = await createClient();
    const { data, error } = await s.rpc(
      "portal_member_sessions",
      sessionSlug ? { p_session_slug: sessionSlug } : {},
    );
    if (error) throw new Error("Failed to fetch member sessions");
    const payload = data as unknown as MemberData;
    return {
      ...payload,
      workspaces: payload.workspaces.map((workspace) => ({
        ...workspace,
        href:
          workspace.kind === "Ministry" ||
          workspace.kind === "Group" ||
          workspace.kind === "Department"
            ? `/portal?section=upcoming&scope=${workspace.kind.toLowerCase()}&q=${encodeURIComponent(workspace.name)}`
            : workspace.href,
      })),
      sessions: payload.sessions.map((session) => ({
        ...session,
        href: `/portal/ministries/${session.ministrySlug}/terms/${session.termSlug}/sessions/${session.slug}?from=upcoming`,
      })),
    };
  },
);
