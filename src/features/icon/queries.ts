import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import type { FrequentIconItem } from "./types";

export async function getFrequentIcons(): Promise<FrequentIconItem[]> {
  await requireLeader();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("frequent_icon")
    .select("id, name, display_order")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch frequent icons");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    displayOrder: row.display_order,
  }));
}
