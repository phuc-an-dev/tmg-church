import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/features/auth/queries";
import type { ChurchState, ChurchViewModel } from "./types";

/**
 * Retrieves the operational state of the Church entity for administration.
 * Supports zero, one, or invalid-multiple church configurations.
 * Wrapped in React cache() to deduplicate queries within the same request lifecycle.
 */
export const getAdminChurchState = cache(async (): Promise<ChurchState> => {
  await requireSystemAdmin();
  const supabase = await createClient();

  const { data: churches, error: churchError } = await supabase
    .from("church")
    .select("id, name, slug, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (churchError) {
    throw new Error("Failed to fetch church records");
  }

  if (!churches || churches.length === 0) {
    return { status: "zero" };
  }

  if (churches.length > 1) {
    return {
      status: "multiple",
      count: churches.length,
      churches: churches.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
    };
  }

  const church = churches[0];

  const [
    { count: ministryCount, error: ministryError },
    { count: memberCount, error: memberError },
    { count: segmentCount, error: segmentError },
  ] = await Promise.all([
    supabase
      .from("ministry")
      .select("*", { count: "exact", head: true })
      .eq("church_id", church.id),
    supabase
      .from("member_profile")
      .select("*", { count: "exact", head: true })
      .eq("church_id", church.id),
    supabase
      .from("member_segment")
      .select("*", { count: "exact", head: true })
      .eq("church_id", church.id),
  ]);

  if (ministryError || memberError || segmentError) {
    throw new Error("Failed to check church dependencies");
  }

  const minCount = ministryCount ?? 0;
  const memCount = memberCount ?? 0;
  const segCount = segmentCount ?? 0;

  const viewModel: ChurchViewModel = {
    id: church.id,
    name: church.name,
    slug: church.slug,
    createdAt: church.created_at,
    updatedAt: church.updated_at,
    ministryCount: minCount,
    memberCount: memCount,
    segmentCount: segCount,
    isDeletable: minCount === 0 && memCount === 0 && segCount === 0,
  };

  return {
    status: "one",
    church: viewModel,
  };
});
