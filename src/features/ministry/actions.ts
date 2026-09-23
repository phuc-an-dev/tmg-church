"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import { generateVietnameseSlug, isUuid } from "@/lib/slug";
import {
  assignDepartmentMembersSchema,
  deleteSchema,
  deleteServiceStructureSchema,
  exportCollectionSchema,
  importMinistriesSchema,
  importStructuresSchema,
  importTermsSchema,
  ministrySchema,
  serviceRoleSchema,
  structureSchema,
  termSchema,
  unassignDepartmentMembersSchema,
} from "./schemas";
import { getDepartmentServiceStructure } from "./queries";
import {
  DEFAULT_MINISTRY_COLOR,
  DEFAULT_MINISTRY_ICON_KEY,
} from "./visual-identity";
import type { ActionResult, DepartmentServiceStructure } from "./types";

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
  if (
    error?.message?.includes("New ministry terms must start in draft lifecycle")
  )
    return resultError(
      "INVALID_LIFECYCLE",
      "New terms must start in draft lifecycle before activation.",
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
  const rawBase = customSlug || generateVietnameseSlug(name) || "item";
  const base = isUuid(rawBase) ? `${rawBase}-item` : rawBase;
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
async function uniqueStructureSlug(
  table: "term_group" | "term_department",
  termId: string,
  name: string,
  customSlug?: string,
  excludeId?: string,
) {
  const supabase = await createClient();
  const base = customSlug || generateVietnameseSlug(name) || "item";
  for (let n = 1; n < 100; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    let query =
      table === "term_group"
        ? supabase
            .from("term_group")
            .select("id")
            .eq("ministry_term_id", termId)
            .eq("slug", candidate)
        : supabase
            .from("term_department")
            .select("id")
            .eq("ministry_term_id", termId)
            .eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error("structure slug lookup failed");
    if (!data) return candidate;
  }
  throw new Error("structure slug limit reached");
}
async function paths(
  ministryId?: string,
  termId?: string,
  departmentSlug?: string,
) {
  revalidatePath("/admin");
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/ministries", "layout");
  if (!ministryId) return;
  const supabase = await createClient();
  const { data: ministry } = await supabase
    .from("ministry")
    .select("slug")
    .eq("id", ministryId)
    .maybeSingle();
  if (!ministry) return;
  revalidatePath(`/admin/ministries/${ministry.slug}`);
  if (!termId) return;
  const { data: term } = await supabase
    .from("ministry_term")
    .select("slug")
    .eq("id", termId)
    .eq("ministry_id", ministryId)
    .maybeSingle();
  if (term) {
    revalidatePath(`/admin/ministries/${ministry.slug}/terms/${term.slug}`);
    if (departmentSlug) {
      revalidatePath(
        `/admin/ministries/${ministry.slug}/terms/${term.slug}/departments/${departmentSlug}`,
      );
    }
  }
}

export async function saveMinistryAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = ministrySchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const supabase = await createClient();
    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from("ministry")
        .select("id, slug")
        .eq("id", parsed.data.id)
        .eq("church_id", ctx.church.id)
        .maybeSingle();
      if (!existing)
        return resultError(
          "NOT_FOUND",
          "The requested ministry was not found.",
        );
      const { error } = await supabase
        .from("ministry")
        .update({
          name: parsed.data.name,
          accent_color: parsed.data.accentColor,
          icon_key: parsed.data.iconKey,
        })
        .eq("id", existing.id)
        .eq("church_id", ctx.church.id);
      if (error) return dbError(error, "Unable to update this ministry.");
      await paths(existing.id);
      return {
        success: true,
        data: { id: existing.id },
        message: "Ministry updated successfully.",
      };
    }
    const slug = await uniqueSlug("ministry", ctx.church.id, parsed.data.name);
    const { data, error } = await supabase
      .from("ministry")
      .insert({
        church_id: ctx.church.id,
        name: parsed.data.name,
        slug,
        accent_color: parsed.data.accentColor,
        icon_key: parsed.data.iconKey,
      })
      .select("id")
      .single();
    if (error || !data)
      return dbError(error, "Unable to create this ministry.");
    await paths(data.id);
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
  const ctx = await requireOperationalContext();
  try {
    const parsed = deleteSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const supabase = await createClient();
    const { data: record } = await supabase
      .from("ministry")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("church_id", ctx.church.id)
      .maybeSingle();
    if (!record)
      return resultError("NOT_FOUND", "The requested ministry was not found.");
    const { error } = await supabase
      .from("ministry")
      .delete()
      .eq("id", record.id)
      .eq("church_id", ctx.church.id);
    if (error) return dbError(error, "Unable to delete this ministry.");
    await paths(record.id);
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
  const ctx = await requireOperationalContext();
  try {
    const parsed = termSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const supabase = await createClient();
    const { data: ministry } = await supabase
      .from("ministry")
      .select("id")
      .eq("id", parsed.data.ministryId)
      .eq("church_id", ctx.church.id)
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
      const { error } = await supabase
        .from("ministry_term")
        .update(values)
        .eq("id", existing.id)
        .eq("ministry_id", ministry.id);
      if (error) return dbError(error, "Unable to update this term.");
      await paths(ministry.id, existing.id);
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
    );
    const { data, error } = await supabase
      .from("ministry_term")
      .insert({ ministry_id: ministry.id, ...values, lifecycle: "draft", slug })
      .select("id")
      .single();
    if (error || !data) return dbError(error, "Unable to create this term.");
    await paths(ministry.id, data.id);
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
  const ctx = await requireOperationalContext();
  try {
    const parsed = deleteSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.parentId)
      return !parsed.success
        ? invalid(parsed.error)
        : resultError("VALIDATION_FAILED", "A parent ministry is required.");
    const supabase = await createClient();
    const { data: ministry } = await supabase
      .from("ministry")
      .select("id")
      .eq("id", parsed.data.parentId)
      .eq("church_id", ctx.church.id)
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
    await paths(ministry.id, term.id);
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
  await requireOperationalContext();
  try {
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
    const values = {
      name: parsed.data.name,
      accent_color: parsed.data.accentColor,
      icon_key: parsed.data.iconKey,
    };
    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from(table)
        .select("id, slug")
        .eq("id", parsed.data.id)
        .eq("ministry_term_id", term.id)
        .maybeSingle();
      if (!existing)
        return resultError(
          "NOT_FOUND",
          `The requested ${section === "groups" ? "group" : "department"} was not found.`,
        );
      const slug = parsed.data.slug
        ? await uniqueStructureSlug(
            table,
            term.id,
            parsed.data.name,
            parsed.data.slug,
            existing.id,
          )
        : existing.slug;
      const { error } = await supabase
        .from(table)
        .update({ ...values, slug })
        .eq("id", existing.id)
        .eq("ministry_term_id", term.id);
      if (error)
        return dbError(
          error,
          `Unable to update this ${section === "groups" ? "group" : "department"}.`,
        );
      await paths(term.ministry_id, term.id);
      return {
        success: true,
        data: { id: existing.id },
        message: `${section === "groups" ? "Group" : "Department"} updated successfully.`,
      };
    }
    const slug = await uniqueStructureSlug(
      table,
      term.id,
      parsed.data.name,
      parsed.data.slug,
    );
    const { data, error } = await supabase
      .from(table)
      .insert({ ministry_term_id: term.id, ...values, slug })
      .select("id")
      .single();
    if (error || !data)
      return dbError(
        error,
        `Unable to create this ${section === "groups" ? "group" : "department"}.`,
      );
    await paths(term.ministry_id, term.id);
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
  await requireOperationalContext();
  try {
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
    await paths(term.ministry_id, term.id);
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

export async function saveDepartmentServiceRoleAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = serviceRoleSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { data: dept } = await supabase
      .from("term_department")
      .select(
        "id, slug, ministry_term_id, ministry_term!inner(id, ministry_id, ministry!inner(church_id))",
      )
      .eq("id", parsed.data.termDepartmentId)
      .maybeSingle();

    const churchId = (
      dept?.ministry_term as unknown as {
        ministry: { church_id: string };
      }
    )?.ministry?.church_id;

    if (!dept || churchId !== ctx.church.id) {
      return resultError(
        "NOT_FOUND",
        "The requested department was not found.",
      );
    }

    if (parsed.data.id) {
      const { error } = await supabase
        .from("department_service_role")
        .update({ name: parsed.data.name })
        .eq("id", parsed.data.id)
        .eq("term_department_id", dept.id);

      if (error) {
        return dbError(error, "Unable to update this service role.");
      }

      await paths(
        dept.ministry_term.ministry_id,
        dept.ministry_term_id,
        dept.slug,
      );
      return {
        success: true,
        data: { id: parsed.data.id },
        message: "Service role updated successfully.",
      };
    }

    const { data, error } = await supabase
      .from("department_service_role")
      .insert({
        term_department_id: dept.id,
        name: parsed.data.name,
      })
      .select("id")
      .single();

    if (error || !data) {
      return dbError(error, "Unable to create this service role.");
    }

    await paths(
      dept.ministry_term.ministry_id,
      dept.ministry_term_id,
      dept.slug,
    );
    return {
      success: true,
      data: { id: data.id },
      message: "Service role created successfully.",
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to save this service role. Please try again.",
    );
  }
}

export async function deleteDepartmentServiceRoleAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = deleteServiceStructureSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();
    const { data: dept } = await supabase
      .from("term_department")
      .select(
        "id, slug, ministry_term_id, ministry_term!inner(id, ministry_id, ministry!inner(church_id))",
      )
      .eq("id", parsed.data.termDepartmentId)
      .maybeSingle();

    const churchId = (
      dept?.ministry_term as unknown as {
        ministry: { church_id: string };
      }
    )?.ministry?.church_id;

    if (!dept || churchId !== ctx.church.id) {
      return resultError(
        "NOT_FOUND",
        "The requested department was not found.",
      );
    }

    // Check if referenced by service_assignment
    const { count } = await supabase
      .from("service_assignment")
      .select("id", { count: "exact", head: true })
      .eq("department_service_role_id", parsed.data.id);

    if (count && count > 0) {
      return resultError(
        "DEPENDENCY_BLOCKED",
        "Cannot delete a service role that has session service assignments.",
      );
    }

    const { error } = await supabase
      .from("department_service_role")
      .delete()
      .eq("id", parsed.data.id)
      .eq("term_department_id", dept.id);

    if (error) {
      return dbError(error, "Unable to delete this service role.");
    }

    await paths(
      dept.ministry_term.ministry_id,
      dept.ministry_term_id,
      dept.slug,
    );
    return {
      success: true,
      data: { id: parsed.data.id },
      message: "Service role deleted successfully.",
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to delete this service role. Please try again.",
    );
  }
}

export async function getDepartmentServiceStructureAction(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
): Promise<ActionResult<DepartmentServiceStructure>> {
  await requireOperationalContext();
  try {
    const data = await getDepartmentServiceStructure(
      ministrySlug,
      termSlug,
      departmentSlug,
    );
    if (!data) {
      return resultError("NOT_FOUND", "Department was not found.");
    }
    return { success: true, data, message: "OK" };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to fetch department service structure.",
    );
  }
}

export async function assignDepartmentMembersAction(
  rawInput: unknown,
): Promise<ActionResult<{ assignedCount: number }>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = assignDepartmentMembersSchema.safeParse(rawInput);
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();

    const { data: dept } = await supabase
      .from("term_department")
      .select(
        "id, slug, ministry_term_id, ministry_term!inner(id, slug, ministry_id, ministry!inner(church_id, slug))",
      )
      .eq("id", parsed.data.termDepartmentId)
      .maybeSingle();

    const churchId = (
      dept?.ministry_term as unknown as {
        ministry: { church_id: string; slug: string };
      }
    )?.ministry?.church_id;

    if (!dept || churchId !== ctx.church.id) {
      return resultError("NOT_FOUND", "Department was not found.");
    }

    const { data: validMemberships, error: membershipError } = await supabase
      .from("ministry_membership")
      .select("id")
      .eq("ministry_term_id", dept.ministry_term_id)
      .in("id", parsed.data.membershipIds);

    if (membershipError) {
      return dbError(membershipError, "Failed to validate term memberships.");
    }

    const validIds = new Set((validMemberships ?? []).map((m) => m.id));
    const invalidFound = parsed.data.membershipIds.some(
      (mId) => !validIds.has(mId),
    );
    if (invalidFound) {
      return resultError(
        "VALIDATION_FAILED",
        "Only members already enrolled in this term can be assigned to the department.",
      );
    }

    const rowsToInsert = parsed.data.membershipIds.map((membershipId) => ({
      ministry_membership_id: membershipId,
      term_department_id: dept.id,
    }));

    const { error: insertError } = await supabase
      .from("ministry_assignment")
      .upsert(rowsToInsert, {
        onConflict: "ministry_membership_id,term_department_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      return dbError(insertError, "Failed to assign members to department.");
    }

    const ministryId = (
      dept.ministry_term as unknown as { ministry_id: string }
    ).ministry_id;
    await paths(ministryId, dept.ministry_term_id, dept.slug);

    const assignedCount = rowsToInsert.length;
    return {
      success: true,
      data: { assignedCount },
      message: `Assigned ${assignedCount} member${assignedCount === 1 ? "" : "s"} to department.`,
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to assign members to department.",
    );
  }
}

export async function unassignDepartmentMembersAction(
  rawInput: unknown,
): Promise<ActionResult<{ unassignedCount: number }>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = unassignDepartmentMembersSchema.safeParse(rawInput);
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createClient();

    const { data: dept } = await supabase
      .from("term_department")
      .select(
        "id, slug, ministry_term_id, ministry_term!inner(id, slug, ministry_id, ministry!inner(church_id, slug))",
      )
      .eq("id", parsed.data.termDepartmentId)
      .maybeSingle();

    const churchId = (
      dept?.ministry_term as unknown as {
        ministry: { church_id: string; slug: string };
      }
    )?.ministry?.church_id;

    if (!dept || churchId !== ctx.church.id) {
      return resultError("NOT_FOUND", "Department was not found.");
    }

    const { error: deleteError } = await supabase
      .from("ministry_assignment")
      .delete()
      .eq("term_department_id", dept.id)
      .in("ministry_membership_id", parsed.data.membershipIds);

    if (deleteError) {
      return dbError(deleteError, "Failed to remove department assignment.");
    }

    const ministryId = (
      dept.ministry_term as unknown as { ministry_id: string }
    ).ministry_id;
    await paths(ministryId, dept.ministry_term_id, dept.slug);

    const count = parsed.data.membershipIds.length;
    return {
      success: true,
      data: { unassignedCount: count },
      message: `Removed ${count} member${count === 1 ? "" : "s"} from department.`,
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to remove department assignment.",
    );
  }
}

type ImportSummary = { importedCount: number };

function importMessage(
  singularLabel: string,
  mode: "merge" | "replace",
  importedCount: number,
): string {
  const countLabel = `${importedCount} imported row${importedCount === 1 ? "" : "s"}`;
  if (mode === "replace")
    return `Replaced ${singularLabel.toLowerCase()}s with ${countLabel}.`;
  if (importedCount === 0)
    return "All imported rows already exist. Nothing was added.";
  return `Imported ${importedCount} new ${singularLabel.toLowerCase()}${importedCount === 1 ? "" : "s"}.`;
}

function filterNewRows<T extends { name: string; slug?: string }>(
  rows: T[],
  existingNames: Set<string>,
  existingSlugs: Set<string>,
): T[] {
  return rows.filter(
    (row) =>
      !existingNames.has(row.name.trim().toLowerCase()) &&
      !(row.slug && existingSlugs.has(row.slug)),
  );
}

export async function importMinistriesAction(
  raw: unknown,
): Promise<ActionResult<ImportSummary>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = importMinistriesSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const { mode, rows } = parsed.data;
    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("ministry")
      .select("name, slug")
      .eq("church_id", ctx.church.id);
    if (existingError)
      return dbError(existingError, "Unable to verify existing ministries.");
    const existingNames = new Set(
      (existing ?? []).map((row) => row.name.trim().toLowerCase()),
    );
    const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
    const newRows =
      mode === "replace"
        ? rows
        : filterNewRows(rows, existingNames, existingSlugs);
    if (mode === "replace") {
      const { error } = await supabase
        .from("ministry")
        .delete()
        .eq("church_id", ctx.church.id);
      if (error)
        return resultError(
          "DEPENDENCY_BLOCKED",
          "Existing ministries could not be cleared for replacement. Ministries with term history cannot be deleted.",
        );
    }
    let importedCount = 0;
    for (const row of newRows) {
      const slug = await uniqueSlug(
        "ministry",
        ctx.church.id,
        row.name,
        row.slug,
      );
      const { error } = await supabase.from("ministry").insert({
        church_id: ctx.church.id,
        name: row.name,
        slug,
        accent_color: row.accentColor ?? DEFAULT_MINISTRY_COLOR,
        icon_key: row.iconKey ?? DEFAULT_MINISTRY_ICON_KEY,
      });
      if (error) return dbError(error, "Unable to import this ministry.");
      importedCount += 1;
    }
    await paths();
    return {
      success: true,
      data: { importedCount },
      message: importMessage("Ministry", mode, importedCount),
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to import ministries. Please try again.",
    );
  }
}

export async function importTermsAction(
  raw: unknown,
): Promise<ActionResult<ImportSummary>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = importTermsSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const { mode, rows, ministryId } = parsed.data;
    const supabase = await createClient();
    const { data: ministry } = await supabase
      .from("ministry")
      .select("id")
      .eq("id", ministryId)
      .eq("church_id", ctx.church.id)
      .maybeSingle();
    if (!ministry)
      return resultError("NOT_FOUND", "The requested ministry was not found.");
    const { data: existing, error: existingError } = await supabase
      .from("ministry_term")
      .select("name, slug")
      .eq("ministry_id", ministry.id);
    if (existingError)
      return dbError(existingError, "Unable to verify existing terms.");
    const existingNames = new Set(
      (existing ?? []).map((row) => row.name.trim().toLowerCase()),
    );
    const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
    const newRows =
      mode === "replace"
        ? rows
        : filterNewRows(rows, existingNames, existingSlugs);
    if (mode === "replace") {
      const { error } = await supabase
        .from("ministry_term")
        .delete()
        .eq("ministry_id", ministry.id);
      if (error)
        return resultError(
          "DEPENDENCY_BLOCKED",
          "Existing terms could not be cleared for replacement. Terms with member or session history cannot be deleted.",
        );
    }
    let importedCount = 0;
    for (const row of newRows) {
      const slug = await uniqueSlug(
        "ministry_term",
        ministry.id,
        row.name,
        row.slug,
      );
      const { error } = await supabase.from("ministry_term").insert({
        ministry_id: ministry.id,
        name: row.name,
        slug,
        start_date: row.startDate ?? null,
        end_date: row.endDate ?? null,
        lifecycle: row.lifecycle ?? "draft",
      });
      if (error) return dbError(error, "Unable to import this term.");
      importedCount += 1;
    }
    await paths(ministry.id);
    return {
      success: true,
      data: { importedCount },
      message: importMessage("Term", mode, importedCount),
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to import terms. Please try again.",
    );
  }
}

export async function importStructuresAction(
  section: "groups" | "departments",
  raw: unknown,
): Promise<ActionResult<ImportSummary>> {
  await requireOperationalContext();
  try {
    const parsed = importStructuresSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const { mode, rows, ministryId, termId } = parsed.data;
    const supabase = await createClient();
    const table = section === "groups" ? "term_group" : "term_department";
    const singularLabel = section === "groups" ? "Group" : "Department";
    const { data: term } = await supabase
      .from("ministry_term")
      .select("id, ministry_id")
      .eq("id", termId)
      .eq("ministry_id", ministryId)
      .maybeSingle();
    if (!term)
      return resultError("NOT_FOUND", "The requested term was not found.");
    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select("name, slug")
      .eq("ministry_term_id", term.id);
    if (existingError)
      return dbError(existingError, `Unable to verify existing ${section}.`);
    const existingNames = new Set(
      (existing ?? []).map((row) => row.name.trim().toLowerCase()),
    );
    const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
    const newRows =
      mode === "replace"
        ? rows
        : filterNewRows(rows, existingNames, existingSlugs);
    if (mode === "replace") {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("ministry_term_id", term.id);
      if (error)
        return resultError(
          "DEPENDENCY_BLOCKED",
          `Existing ${section} could not be cleared for replacement. ${singularLabel}s with member or assignment history cannot be deleted.`,
        );
    }
    let importedCount = 0;
    for (const row of newRows) {
      const slug = await uniqueStructureSlug(
        table,
        term.id,
        row.name,
        row.slug,
      );
      const { error } = await supabase.from(table).insert({
        ministry_term_id: term.id,
        name: row.name,
        slug,
        accent_color: row.accentColor ?? DEFAULT_MINISTRY_COLOR,
        icon_key: row.iconKey ?? DEFAULT_MINISTRY_ICON_KEY,
      });
      if (error)
        return dbError(
          error,
          `Unable to import this ${singularLabel.toLowerCase()}.`,
        );
      importedCount += 1;
    }
    await paths(term.ministry_id, term.id);
    return {
      success: true,
      data: { importedCount },
      message: importMessage(singularLabel, mode, importedCount),
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to import structural records. Please try again.",
    );
  }
}

export async function exportCollectionAction(
  raw: unknown,
): Promise<ActionResult<{ rows: Record<string, string>[] }>> {
  const ctx = await requireOperationalContext();
  try {
    const parsed = exportCollectionSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    const { section, ministryId, termId } = parsed.data;
    const supabase = await createClient();
    if (section === "ministries") {
      const { data, error } = await supabase
        .from("ministry")
        .select("name, slug, accent_color, icon_key")
        .eq("church_id", ctx.church.id)
        .order("name")
        .order("id");
      if (error) return dbError(error, "Unable to export ministries.");
      return {
        success: true,
        message: "OK",
        data: {
          rows: (data ?? []).map((row) => ({
            name: row.name,
            slug: row.slug,
            accentColor: row.accent_color,
            iconKey: row.icon_key,
          })),
        },
      };
    }
    if (section === "terms") {
      if (!ministryId)
        return resultError(
          "VALIDATION_FAILED",
          "A parent ministry is required.",
        );
      const { data: ministry } = await supabase
        .from("ministry")
        .select("id")
        .eq("id", ministryId)
        .eq("church_id", ctx.church.id)
        .maybeSingle();
      if (!ministry)
        return resultError(
          "NOT_FOUND",
          "The requested ministry was not found.",
        );
      const { data, error } = await supabase
        .from("ministry_term")
        .select("name, slug, start_date, end_date, lifecycle")
        .eq("ministry_id", ministry.id)
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("id");
      if (error) return dbError(error, "Unable to export terms.");
      return {
        success: true,
        message: "OK",
        data: {
          rows: (data ?? []).map((row) => ({
            name: row.name,
            slug: row.slug,
            startDate: row.start_date ?? "",
            endDate: row.end_date ?? "",
            lifecycle: row.lifecycle,
          })),
        },
      };
    }
    if (!ministryId || !termId)
      return resultError(
        "VALIDATION_FAILED",
        "A parent ministry and term are required.",
      );
    const table = section === "groups" ? "term_group" : "term_department";
    const { data: term } = await supabase
      .from("ministry_term")
      .select("id")
      .eq("id", termId)
      .eq("ministry_id", ministryId)
      .maybeSingle();
    if (!term)
      return resultError("NOT_FOUND", "The requested term was not found.");
    const { data, error } = await supabase
      .from(table)
      .select("name, slug, accent_color, icon_key")
      .eq("ministry_term_id", term.id)
      .order("name")
      .order("id");
    if (error) return dbError(error, `Unable to export ${section}.`);
    return {
      success: true,
      message: "OK",
      data: {
        rows: (data ?? []).map((row) => ({
          name: row.name,
          slug: row.slug,
          accentColor: row.accent_color,
          iconKey: row.icon_key,
        })),
      },
    };
  } catch {
    return resultError(
      "DATABASE_ERROR",
      "Unable to export records. Please try again.",
    );
  }
}
