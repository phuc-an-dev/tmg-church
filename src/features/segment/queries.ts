import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import type { SegmentDetail, SegmentItem } from "./types";

export async function getSegments(): Promise<SegmentItem[]> {
  await requireLeader();
  const church = await getActiveChurch();
  if (!church) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_segment")
    .select(
      "id, name, slug, accent_color, icon_key, member_segment_membership(count)",
    )
    .eq("church_id", church.id)
    .order("name")
    .order("id");
  if (error) throw new Error("Failed to fetch segments");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    accentColor: row.accent_color,
    iconKey: row.icon_key,
    memberCount:
      (row.member_segment_membership as { count: number }[] | null)?.[0]
        ?.count ?? 0,
  }));
}

export const getSegmentDetail = cache(
  async (slug: string): Promise<SegmentDetail | null> => {
    await requireLeader();
    const church = await getActiveChurch();
    if (!church) return null;
    const supabase = await createClient();
    const { data: segment, error } = await supabase
      .from("member_segment")
      .select(
        "id, name, slug, accent_color, icon_key, condition_rules, member_segment_membership(count)",
      )
      .eq("church_id", church.id)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !segment) return null;
    return {
      id: segment.id,
      name: segment.name,
      slug: segment.slug,
      accentColor: segment.accent_color,
      iconKey: segment.icon_key,
      memberCount:
        (segment.member_segment_membership as { count: number }[] | null)?.[0]
          ?.count ?? 0,
      conditions: segment.condition_rules as SegmentDetail["conditions"],
    };
  },
);
