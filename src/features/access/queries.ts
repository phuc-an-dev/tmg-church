import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/features/auth/queries";
import type { Database } from "@/types/database";

export type AccessRequest =
  Database["public"]["Tables"]["member_access_request"]["Row"];
export const getPendingAccessRequestCount = cache(async () => {
  const auth = await requireSystemAdmin();
  const s = await createClient();
  const { count } = await s
    .from("member_access_request")
    .select("id", { head: true, count: "exact" })
    .eq("church_id", auth.systemRole.church_id)
    .eq("status", "pending");
  return count ?? 0;
});
export async function getAccessRequests() {
  const auth = await requireSystemAdmin();
  const s = await createClient();
  const [requests, members] = await Promise.all([
    s
      .from("member_access_request")
      .select("*")
      .eq("church_id", auth.systemRole.church_id)
      .order("created_at", { ascending: false }),
    s
      .from("member_profile")
      .select("id,full_name,email,gender,date_of_birth,phone")
      .eq("church_id", auth.systemRole.church_id)
      .is("archived_at", null)
      .is("user_id", null)
      .order("full_name"),
  ]);
  if (requests.error || members.error)
    throw new Error("Unable to load access requests.");
  return { requests: requests.data ?? [], members: members.data ?? [] };
}
export async function getOwnAccessRequest() {
  const s = await createClient();
  const { data: claims } = await s.auth.getClaims();
  if (!claims?.claims?.sub) return null;
  const { data, error } = await s
    .from("member_access_request")
    .select("*")
    .eq("user_id", claims.claims.sub)
    .maybeSingle();
  if (error) throw new Error("Unable to load access request status.");
  return data;
}
