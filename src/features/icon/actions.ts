"use server";

import { revalidatePath } from "next/cache";
import * as LucideIcons from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/features/auth/queries";

function toPascalCase(kebab: string): string {
  return kebab.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
}

function isValidLucideIcon(name: string): boolean {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return false;
  const pascal = toPascalCase(name);
  if (!Object.prototype.hasOwnProperty.call(LucideIcons, pascal)) return false;
  return (
    typeof (LucideIcons as Record<string, unknown>)[pascal] === "object" ||
    typeof (LucideIcons as Record<string, unknown>)[pascal] === "function"
  );
}
import {
  addFrequentIconSchema,
  importFrequentIconsSchema,
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
  await requireSystemAdmin();
  const parsed = addFrequentIconSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  if (!isValidLucideIcon(parsed.data.name)) {
    return fail(
      "INVALID_ICON",
      "The specified icon is not a valid Lucide icon.",
    );
  }

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
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/segments");
  return {
    success: true,
    message: `Icon "${parsed.data.name}" added to frequently used list.`,
  };
}

export async function removeFrequentIconAction(
  raw: unknown,
): Promise<IconActionResult> {
  await requireSystemAdmin();
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
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/segments");
  return {
    success: true,
    message: "Icon removed from frequently used list.",
  };
}

export async function reorderFrequentIconsAction(
  raw: unknown,
): Promise<IconActionResult> {
  await requireSystemAdmin();
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
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/segments");
  return {
    success: true,
    message: "Icon order updated.",
  };
}

export async function importFrequentIconsAction(
  raw: unknown,
): Promise<IconActionResult> {
  await requireSystemAdmin();
  const parsed = importFrequentIconsSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const { names, mode } = parsed.data;

  // Filter valid Lucide icons (skip non-existent ones)
  const validNames = names.filter(isValidLucideIcon);

  // Deduplicate within the imported array
  const uniqueNames = Array.from(new Set(validNames));

  if (uniqueNames.length === 0) {
    return fail(
      "NO_VALID_ICONS",
      "No valid Lucide icons found to import. Non-existent icons were skipped.",
    );
  }

  const supabase = await createClient();

  if (mode === "replace") {
    // Delete all existing frequent icons
    const { error: deleteError } = await supabase
      .from("frequent_icon")
      .delete()
      .not("id", "is", null);

    if (deleteError) {
      return fail(
        "DATABASE_ERROR",
        "Unable to clear existing icons for replacement.",
      );
    }

    // Insert all new icons with their order
    const toInsert = uniqueNames.map((name, index) => ({
      name,
      display_order: index,
    }));

    const { error: insertError } = await supabase
      .from("frequent_icon")
      .insert(toInsert);

    if (insertError) {
      return fail(
        "DATABASE_ERROR",
        "Unable to save imported icons to the database.",
      );
    }

    revalidatePath("/admin/icons");
    revalidatePath("/admin/ministries");
    revalidatePath("/admin/segments");
    return {
      success: true,
      message: `Replaced icon list with ${toInsert.length} imported icons.`,
    };
  } else {
    // Mode is "merge"
    const { data: existing, error: fetchError } = await supabase
      .from("frequent_icon")
      .select("name, display_order")
      .order("display_order", { ascending: false });

    if (fetchError) {
      return fail("DATABASE_ERROR", "Unable to query existing icons.");
    }

    const existingNamesSet = new Set((existing ?? []).map((r) => r.name));
    const newNames = uniqueNames.filter((n) => !existingNamesSet.has(n));

    if (newNames.length === 0) {
      return {
        success: true,
        message: "All imported icons are already in the frequently used list.",
      };
    }

    const currentMaxOrder = existing?.[0]?.display_order ?? -1;
    const toInsert = newNames.map((name, index) => ({
      name,
      display_order: currentMaxOrder + 1 + index,
    }));

    const { error: insertError } = await supabase
      .from("frequent_icon")
      .insert(toInsert);

    if (insertError) {
      return fail(
        "DATABASE_ERROR",
        "Unable to add imported icons to the database.",
      );
    }

    revalidatePath("/admin/icons");
    revalidatePath("/admin/ministries");
    revalidatePath("/admin/segments");
    return {
      success: true,
      message: `Added ${toInsert.length} new icons to the frequently used list.`,
    };
  }
}
