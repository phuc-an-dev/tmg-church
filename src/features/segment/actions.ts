"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import { generateVietnameseSlug, isUuid } from "@/lib/slug";
import {
  deleteSegmentSchema,
  segmentConditionsSchema,
  saveSegmentSchema,
} from "./schemas";
import type { SegmentActionResult } from "./types";

const fail = (code: string, error: string): SegmentActionResult => ({
  success: false,
  code,
  error,
});
const invalid = (error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): SegmentActionResult => ({
  success: false,
  code: "VALIDATION_FAILED",
  error: "Please correct the highlighted fields.",
  fieldErrors: Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      ([, values]) => values?.length,
    ),
  ) as Record<string, string[]>,
});
function segmentWriteFailure(errorCode: string | undefined, verb: string) {
  if (errorCode === "23505")
    return fail("CONFLICT", "A segment with this name already exists.");
  if (errorCode === "23514")
    return fail("VALIDATION_FAILED", "Choose a valid segment color and icon.");
  return fail("DATABASE_ERROR", `Unable to ${verb} this segment.`);
}
function refresh(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/segments");
  if (slug) revalidatePath(`/admin/segments/${slug}`);
}
async function uniqueSlug(churchId: string, name: string) {
  const supabase = await createClient();
  const rawBase = generateVietnameseSlug(name) || "segment";
  const base = isUuid(rawBase) ? `${rawBase}-segment` : rawBase;
  for (let n = 1; n < 100; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const query = supabase
      .from("member_segment")
      .select("id")
      .eq("church_id", churchId)
      .eq("slug", slug);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return slug;
  }
  throw new Error("Slug limit reached");
}
export async function saveSegmentAction(
  raw: unknown,
): Promise<SegmentActionResult> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = saveSegmentSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const church = ctx.church;
    const supabase = await createClient();
    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from("member_segment")
        .select("id, slug")
        .eq("id", parsed.data.id)
        .eq("church_id", church.id)
        .maybeSingle();
      if (!existing)
        return fail("NOT_FOUND", "The requested segment was not found.");
      const { error } = await supabase
        .from("member_segment")
        .update({
          name: parsed.data.name,
          accent_color: parsed.data.accentColor,
          icon_key: parsed.data.iconKey,
        })
        .eq("id", existing.id)
        .eq("church_id", church.id);
      if (error) return segmentWriteFailure(error.code, "update");
      refresh(existing.slug);
      return {
        success: true,
        data: { slug: existing.slug },
        message: "Segment updated successfully.",
      };
    }
    const slug = await uniqueSlug(church.id, parsed.data.name);
    const { error } = await supabase.from("member_segment").insert({
      church_id: church.id,
      name: parsed.data.name,
      slug,
      accent_color: parsed.data.accentColor,
      icon_key: parsed.data.iconKey,
    });
    if (error) return segmentWriteFailure(error.code, "create");
    refresh(slug);
    return {
      success: true,
      data: { slug },
      message: "Segment created successfully.",
    };
  } catch {
    return fail(
      "DATABASE_ERROR",
      "Unable to save this segment. Please try again.",
    );
  }
}
export async function deleteSegmentAction(
  raw: unknown,
): Promise<SegmentActionResult> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = deleteSegmentSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const churchId = ctx.church.id;
    const supabase = await createClient();
    const { data: segment } = await supabase
      .from("member_segment")
      .select("id, slug")
      .eq("id", parsed.data.id)
      .eq("church_id", churchId)
      .maybeSingle();
    if (!segment)
      return fail("NOT_FOUND", "The requested segment was not found.");
    const { error } = await supabase
      .from("member_segment")
      .delete()
      .eq("id", segment.id);
    if (error)
      return fail(
        error.code === "23503" ? "DEPENDENCY_BLOCKED" : "DATABASE_ERROR",
        error.code === "23503"
          ? "Remove all members from this segment before deleting it."
          : "Unable to delete this segment.",
      );
    refresh(segment.slug);
    return { success: true, message: "Segment deleted successfully." };
  } catch {
    return fail(
      "DATABASE_ERROR",
      "Unable to delete this segment. Please try again.",
    );
  }
}
export async function previewSegmentMembersByConditionsAction(raw: unknown) {
  const parsed = segmentConditionsSchema.safeParse(raw);
  if (!parsed.success) return null;
  await requireOperationalContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "preview_segment_members_by_rules",
    {
      target_segment_id: parsed.data.segmentId,
      target_conditions: parsed.data.conditions,
    },
  );
  return error ? null : data;
}

export async function saveSegmentConditionsAction(
  raw: unknown,
): Promise<SegmentActionResult> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = segmentConditionsSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const churchId = ctx.church.id;
    const supabase = await createClient();
    const { data: segment } = await supabase
      .from("member_segment")
      .select("id, slug")
      .eq("id", parsed.data.segmentId)
      .eq("church_id", churchId)
      .maybeSingle();
    if (!segment)
      return fail("NOT_FOUND", "The requested segment was not found.");
    const { data: addedCount, error } = await supabase.rpc(
      "save_segment_rules_and_add_members",
      {
        target_segment_id: segment.id,
        target_conditions: parsed.data.conditions,
      },
    );
    if (error)
      return fail("DATABASE_ERROR", "Unable to save these conditions.");
    refresh(segment.slug);
    return {
      success: true,
      message: addedCount
        ? `Conditions saved. ${addedCount} matching ${addedCount === 1 ? "member was" : "members were"} added.`
        : "Conditions saved. All matching members are already in this segment.",
    };
  } catch {
    return fail("DATABASE_ERROR", "Unable to save these conditions.");
  }
}
