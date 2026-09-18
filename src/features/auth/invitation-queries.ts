import "server-only";

import { createClient } from "@/lib/supabase/server";

export type InvitationPreview = {
  email: string;
  expiresAt: string;
};

export async function getMemberInvitationPreview(
  token: string,
): Promise<InvitationPreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "preview_member_access_invitation",
    { p_token: token },
  );
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (
    typeof record.email !== "string" ||
    typeof record.expires_at !== "string"
  ) {
    return null;
  }

  return {
    email: record.email,
    expiresAt: record.expires_at,
  };
}
