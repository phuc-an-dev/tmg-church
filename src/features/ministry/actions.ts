"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import { generateVietnameseSlug } from "@/lib/slug";
import {
  deleteSchema,
  ministrySchema,
  structureSchema,
  termSchema,
} from "./schemas";
import type { ActionResult } from "./types";

function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): ActionResult<never> {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(([, v]) => v?.length),
  ) as Record<string, string[]>;
  return {
    success: false,
    code: "VALIDATION_FAILED",
    error: "Please correct the highlighted fields.",
    fieldErrors,
  };
}
function resultError(code: string, error: string): ActionResult<never> {
  return { success: false, code, error };
}
function dbError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): ActionResult<never> {
  if (
    error?.code === "23505" &&
    error.message?.includes("ministry_term_one_active_per_ministry_idx")
  )
    return resultError(
      "ACTIVE_TERM_EXISTS",
      "Close or change the current active term before activating another term.",
    );
  if (error?.code === "23505")
    return resultError(
      "CONFLICT",
      "A record with this name or slug already exists in this scope.",
    );
  if (error?.code === "23503")
    return resultError(
      "DEPENDENCY_BLOCKED",
      "This record has protected dependent history and cannot be deleted.",
    );
  return resultError("DATABASE_ERROR", fallback);
}
async function uniqueSlug(
  table: "ministry" | "ministry_term",
  parentId: string,
  name: string,
  customSlug?: string,
  excludeId?: string,
) {
  const supabase = await createClient();
  const base = customSlug || generateVietnameseSlug(name) || "item";
  for (let n = 1; n < 100; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    let query =
      table === "ministry"
        ? supabase
            .from("ministry")
            .select("id")
            .eq("church_id", parentId)
            .eq("slug", candidate)
        : supabase
            .from("ministry_term")
            .select("id")
            .eq("ministry_id", parentId)
            .eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error("slug lookup failed");
    if (!data) return candidate;
  }
  throw new Error("slug limit reached");
}
function paths(ministryId?: string, termId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/ministries");
  if (ministryId) revalidatePath(`/admin/ministries/${ministryId}`);
  if (ministryId && termId)
    revalidatePath(`/admin/ministries/${ministryId}/terms/${termId}`);
}

export async function saveMinistryAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireLeader();
    const parsed = ministrySchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const church = await getActiveChurch();
    if (!church)
      return resultError(
        "CHURCH_NOT_READY",
        "Configure one active church before managing ministries.",
      );
    const supabase = await createClient();
    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from("ministry")
        .select("id, slug")
        .eq("id", parsed.data.id)
        .eq("church_id", church.id)
        .maybeSingle();
      if (!existing)
        return resultError(
          "NOT_FOUND",
          "The requested ministry was not found.",
        );
      const slug = parsed.data.slug
        ? await uniqueSlug(
            "ministry",
            church.id,
            parsed.data.name,
            parsed.data.slug,
            existing.id,
          )
        : existing.slug;
      const { error } = await supabase
        .from("ministry")
        .update({
          name: parsed.data.name,
          slug,
          accent_color: parsed.data.accentColor,
          icon_key: parsed.data.iconKey,
        })
        .eq("id", existing.id)
        .eq("church_id", church.id);
      if (error) return dbError(error, "Unable to update this ministry.");
      paths(existing.id);
      return {
        success: true,
        data: { id: existing.id },
        message: "Ministry updated successfully.",
      };
    }
    const slug = await uniqueSlug(
      "ministry",
      church.id,
      parsed.data.name,
      parsed.data.slug,
    );
    const { data, error } = await supabase
      .from("ministry")
      .insert({
        church_id: church.id,
        name: parsed.data.name,
        slug,
        accent_color: parsed.data.accentColor,
        icon_key: parsed.data.iconKey,
      })
      .select("id")
      .single();
    if (error || !data)
      return dbError(error, "Unable to create this ministry.");
    paths(data.id);
    return {
      success: true,
      data: { id: data.id },
      message: "Ministry created successfully.",
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to save this ministry. Please try again.",
    );
  }
}

export async function deleteMinistryAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireLeader();
    const parsed = deleteSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const church = await getActiveChurch();
    if (!church)
      return resultError("NOT_FOUND", "The requested ministry was not found.");
    const supabase = await createClient();
    const { data: record } = await supabase
      .from("ministry")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("church_id", church.id)
      .maybeSingle();
    if (!record)
      return resultError("NOT_FOUND", "The requested ministry was not found.");
    const { error } = await supabase
      .from("ministry")
      .delete()
      .eq("id", record.id)
      .eq("church_id", church.id);
    if (error) return dbError(error, "Unable to delete this ministry.");
    paths(record.id);
    return {
      success: true,
      data: { id: record.id },
      message: "Ministry deleted successfully.",
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to delete this ministry. Please try again.",
    );
  }
}

export async function saveTermAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireLeader();
    const parsed = termSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const church = await getActiveChurch();
    if (!church)
      return resultError("NOT_FOUND", "The requested ministry was not found.");
    const supabase = await createClient();
    const { data: ministry } = await supabase
      .from("ministry")
      .select("id")
      .eq("id", parsed.data.ministryId)
      .eq("church_id", church.id)
      .maybeSingle();
    if (!ministry)
      return resultError("NOT_FOUND", "The requested ministry was not found.");
    const values = {
      name: parsed.data.name,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      lifecycle: parsed.data.lifecycle,
    };
    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from("ministry_term")
        .select("id, slug")
        .eq("id", parsed.data.id)
        .eq("ministry_id", ministry.id)
        .maybeSingle();
      if (!existing)
        return resultError("NOT_FOUND", "The requested term was not found.");
      const slug = parsed.data.slug
        ? await uniqueSlug(
            "ministry_term",
            ministry.id,
            parsed.data.name,
            parsed.data.slug,
            existing.id,
          )
        : existing.slug;
      const { error } = await supabase
        .from("ministry_term")
        .update({ ...values, slug })
        .eq("id", existing.id)
        .eq("ministry_id", ministry.id);
      if (error) return dbError(error, "Unable to update this term.");
      paths(ministry.id, existing.id);
      return {
        success: true,
        data: { id: existing.id },
        message: "Term updated successfully.",
      };
    }
    const slug = await uniqueSlug(
      "ministry_term",
      ministry.id,
      parsed.data.name,
      parsed.data.slug,
    );
    const { data, error } = await supabase
      .from("ministry_term")
      .insert({ ministry_id: ministry.id, ...values, slug })
      .select("id")
      .single();
    if (error || !data) return dbError(error, "Unable to create this term.");
    paths(ministry.id, data.id);
    return {
      success: true,
      data: { id: data.id },
      message: "Term created successfully.",
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to save this term. Please try again.",
    );
  }
}

export async function deleteTermAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireLeader();
    const parsed = deleteSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.parentId)
      return !parsed.success
        ? invalid(parsed.error)
        : resultError("VALIDATION_FAILED", "A parent ministry is required.");
    const context = await getActiveChurch();
    if (!context)
      return resultError("NOT_FOUND", "The requested term was not found.");
    const supabase = await createClient();
    const { data: ministry } = await supabase
      .from("ministry")
      .select("id")
      .eq("id", parsed.data.parentId)
      .eq("church_id", context.id)
      .maybeSingle();
    const { data: term } = ministry
      ? await supabase
          .from("ministry_term")
          .select("id")
          .eq("id", parsed.data.id)
          .eq("ministry_id", ministry.id)
          .maybeSingle()
      : { data: null };
    if (!term || !ministry)
      return resultError("NOT_FOUND", "The requested term was not found.");
    const { error } = await supabase
      .from("ministry_term")
      .delete()
      .eq("id", term.id)
      .eq("ministry_id", ministry.id);
    if (error) return dbError(error, "Unable to delete this term.");
    paths(ministry.id, term.id);
    return {
      success: true,
      data: { id: term.id },
      message: "Term deleted successfully.",
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to delete this term. Please try again.",
    );
  }
}

export async function saveStructureAction(
  section: "groups" | "departments",
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireLeader();
    const parsed = structureSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const supabase = await createClient();
    const table = section === "groups" ? "term_group" : "term_department";
    const { data: term } = await supabase
      .from("ministry_term")
      .select("id, ministry_id")
      .eq("id", parsed.data.termId)
      .eq("ministry_id", parsed.data.ministryId)
      .maybeSingle();
    if (!term)
      return resultError("NOT_FOUND", "The requested term was not found.");
    const values = { name: parsed.data.name };
    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from(table)
        .select("id")
        .eq("id", parsed.data.id)
        .eq("ministry_term_id", term.id)
        .maybeSingle();
      if (!existing)
        return resultError(
          "NOT_FOUND",
          `The requested ${section === "groups" ? "group" : "department"} was not found.`,
        );
      const { error } = await supabase
        .from(table)
        .update(values)
        .eq("id", existing.id)
        .eq("ministry_term_id", term.id);
      if (error)
        return dbError(
          error,
          `Unable to update this ${section === "groups" ? "group" : "department"}.`,
        );
      paths(term.ministry_id, term.id);
      return {
        success: true,
        data: { id: existing.id },
        message: `${section === "groups" ? "Group" : "Department"} updated successfully.`,
      };
    }
    const { data, error } = await supabase
      .from(table)
      .insert({ ministry_term_id: term.id, ...values })
      .select("id")
      .single();
    if (error || !data)
      return dbError(
        error,
        `Unable to create this ${section === "groups" ? "group" : "department"}.`,
      );
    paths(term.ministry_id, term.id);
    return {
      success: true,
      data: { id: data.id },
      message: `${section === "groups" ? "Group" : "Department"} created successfully.`,
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to save this structural record. Please try again.",
    );
  }
}

export async function deleteStructureAction(
  section: "groups" | "departments",
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireLeader();
    const parsed = deleteSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.parentId || !parsed.data.ministryId)
      return !parsed.success
        ? invalid(parsed.error)
        : resultError(
            "VALIDATION_FAILED",
            "A parent ministry and term are required.",
          );
    const supabase = await createClient();
    const table = section === "groups" ? "term_group" : "term_department";
    const { data: term } = await supabase
      .from("ministry_term")
      .select("id, ministry_id")
      .eq("id", parsed.data.parentId)
      .eq("ministry_id", parsed.data.ministryId)
      .maybeSingle();
    const { data: record } = term
      ? await supabase
          .from(table)
          .select("id")
          .eq("id", parsed.data.id)
          .eq("ministry_term_id", term.id)
          .maybeSingle()
      : { data: null };
    if (!record || !term)
      return resultError(
        "NOT_FOUND",
        `The requested ${section === "groups" ? "group" : "department"} was not found.`,
      );
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", record.id)
      .eq("ministry_term_id", term.id);
    if (error)
      return dbError(
        error,
        `Unable to delete this ${section === "groups" ? "group" : "department"}.`,
      );
    paths(term.ministry_id, term.id);
    return {
      success: true,
      data: { id: record.id },
      message: `${section === "groups" ? "Group" : "Department"} deleted successfully.`,
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to delete this structural record. Please try again.",
    );
  }
}
