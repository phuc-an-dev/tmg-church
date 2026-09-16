"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import {
  addFrequentIconSchema,
  removeFrequentIconSchema,
  reorderFrequentIconsSchema,
} from "./schemas";
import type { IconActionResult } from "./types";

const fail = (code: string, error: string): IconActionResult => ({
  success: false,
  code,
  error,
});

const invalid = (error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): IconActionResult => ({
  success: false,
  code: "VALIDATION_FAILED",
  error: "Please correct the highlighted fields.",
  fieldErrors: Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      ([, values]) => values?.length,
    ),
  ) as Record<string, string[]>,
});

export async function addFrequentIconAction(
  raw: unknown,
): Promise<IconActionResult> {
  await requireLeader();
  const parsed = addFrequentIconSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();

  // Check if already in frequent list
  const { data: existing, error: existingError } = await supabase
    .from("frequent_icon")
    .select("id")
    .eq("name", parsed.data.name)
    .maybeSingle();

  if (existingError) {
    return fail("DATABASE_ERROR", "Unable to check existing icons.");
  }

  if (existing) {
    return fail(
      "CONFLICT",
      "This icon is already in your frequently used list.",
    );
  }

  // Get next display order
  const { data: maxRow } = await supabase
    .from("frequent_icon")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.display_order ?? -1) + 1;

  const { error: insertError } = await supabase.from("frequent_icon").insert({
    name: parsed.data.name,
    display_order: nextOrder,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return fail(
        "CONFLICT",
        "This icon is already in your frequently used list.",
      );
    }
    return fail(
      "DATABASE_ERROR",
      "Unable to add icon to frequently used list.",
    );
  }

  revalidatePath("/admin/icons");
  return {
    success: true,
    message: `Icon "${parsed.data.name}" added to frequently used list.`,
  };
}

export async function removeFrequentIconAction(
  raw: unknown,
): Promise<IconActionResult> {
  await requireLeader();
  const parsed = removeFrequentIconSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();

  const { error } = await supabase
    .from("frequent_icon")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return fail(
      "DATABASE_ERROR",
      "Unable to remove icon from frequently used list.",
    );
  }

  revalidatePath("/admin/icons");
  return {
    success: true,
    message: "Icon removed from frequently used list.",
  };
}

export async function reorderFrequentIconsAction(
  raw: unknown,
): Promise<IconActionResult> {
  await requireLeader();
  const parsed = reorderFrequentIconsSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();

  const updates = parsed.data.orderedIds.map((id, index) =>
    supabase
      .from("frequent_icon")
      .update({ display_order: index })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    return fail("DATABASE_ERROR", "Unable to update icon display orders.");
  }

  revalidatePath("/admin/icons");
  return {
    success: true,
    message: "Icon order updated.",
  };
}
