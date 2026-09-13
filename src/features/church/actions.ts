"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { generateVietnameseSlug } from "@/lib/slug";
import {
  createChurchSchema,
  updateChurchSchema,
  deleteChurchSchema,
} from "./schemas";
import type { ActionResult, ChurchViewModel } from "./types";

/**
 * Resolves a unique slug within the church table by appending -2, -3, etc. if needed.
 */
async function resolveUniqueChurchSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let candidate = baseSlug || "church";
  let counter = 1;

  while (counter <= 50) {
    let query = supabase.from("church").select("id").eq("slug", candidate);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug || "church"}-${counter}`;
  }

  return `${candidate}-${Date.now()}`;
}

/**
 * Server Action to create the single active Church atomically.
 */
export async function createChurchAction(
  rawInput: unknown,
): Promise<ActionResult<ChurchViewModel>> {
  try {
    await requireLeader();
    const supabase = await createClient();

    const parsed = createChurchSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const [key, issues] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        if (issues && issues.length > 0) {
          fieldErrors[key] = issues;
        }
      }
      return {
        success: false,
        error: "Validation failed. Please check the entered data.",
        fieldErrors,
        code: "VALIDATION_FAILED",
      };
    }

    const { name, slug: customSlug } = parsed.data;

    const baseSlug = customSlug
      ? customSlug.trim()
      : generateVietnameseSlug(name);
    const finalSlug = await resolveUniqueChurchSlug(supabase, baseSlug);

    // Call atomic Postgres function with exclusive table lock
    const { data: createdRows, error: rpcError } = await supabase.rpc(
      "create_initial_church",
      {
        church_name: name,
        church_slug: finalSlug,
      },
    );

    if (rpcError) {
      if (
        rpcError.code === "23505" ||
        rpcError.message.includes("already exists")
      ) {
        // Distinguish slug collision from single-church rule violation
        if (
          rpcError.message.includes("slug") ||
          rpcError.details?.includes("slug")
        ) {
          return {
            success: false,
            error:
              "The chosen slug is already in use. Please select a different slug.",
            fieldErrors: {
              slug: ["This slug is already in use."],
            },
            code: "SLUG_CONFLICT",
          };
        }
        return {
          success: false,
          error:
            "A church is already configured in the system. Cannot create another.",
          code: "CHURCH_ALREADY_EXISTS",
        };
      }
      return {
        success: false,
        error: "Failed to initialize church record. Please try again.",
        code: "INSERT_FAILED",
      };
    }

    const created = Array.isArray(createdRows) ? createdRows[0] : createdRows;
    if (!created) {
      return {
        success: false,
        error: "Failed to verify church creation. Please refresh.",
        code: "INSERT_FAILED",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/church");
    revalidatePath("/admin/church/advanced");

    return {
      success: true,
      data: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
        ministryCount: 0,
        memberCount: 0,
        segmentCount: 0,
        isDeletable: true,
      },
      message: "Church initialized successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while creating the church.",
      code: "UNKNOWN_ERROR",
    };
  }
}

/**
 * Server Action to update the existing Church.
 * Rejects updates if system is in an invalid multiple-Church state.
 */
export async function updateChurchAction(
  rawInput: unknown,
): Promise<ActionResult<ChurchViewModel>> {
  try {
    await requireLeader();
    const supabase = await createClient();

    const parsed = updateChurchSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const [key, issues] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        if (issues && issues.length > 0) {
          fieldErrors[key] = issues;
        }
      }
      return {
        success: false,
        error: "Validation failed. Please check the entered data.",
        fieldErrors,
        code: "VALIDATION_FAILED",
      };
    }

    const { id, name, slug } = parsed.data;

    // Check system church count: reject mutations if in invalid multiple-church state
    const { count: totalChurches, error: countError } = await supabase
      .from("church")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return {
        success: false,
        error: "Failed to verify system configuration status.",
        code: "DATABASE_ERROR",
      };
    }

    if ((totalChurches ?? 0) > 1) {
      return {
        success: false,
        error:
          "Direct updates are disabled while multiple churches exist in the configuration.",
        code: "MULTIPLE_CHURCHES_ERROR",
      };
    }

    // Check if target church exists
    const { data: currentChurch, error: findError } = await supabase
      .from("church")
      .select("id, name, slug")
      .eq("id", id)
      .maybeSingle();

    if (findError || !currentChurch) {
      return {
        success: false,
        error: "The requested church record was not found.",
        code: "NOT_FOUND",
      };
    }

    // Check for slug conflict with another church
    const { data: conflict } = await supabase
      .from("church")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .maybeSingle();

    if (conflict) {
      return {
        success: false,
        error: "This slug is already used by another church record.",
        fieldErrors: {
          slug: ["This slug is already in use."],
        },
        code: "SLUG_CONFLICT",
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from("church")
      .update({
        name,
        slug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, slug, created_at, updated_at")
      .single();

    if (updateError || !updated) {
      if (updateError?.code === "23505") {
        return {
          success: false,
          error: "This slug is already in use. Please select a different slug.",
          fieldErrors: {
            slug: ["This slug is already in use."],
          },
          code: "SLUG_CONFLICT",
        };
      }
      return {
        success: false,
        error: "Failed to update church settings. Please try again.",
        code: "UPDATE_FAILED",
      };
    }

    // Fetch counts
    const [
      { count: ministryCount },
      { count: memberCount },
      { count: segmentCount },
    ] = await Promise.all([
      supabase
        .from("ministry")
        .select("*", { count: "exact", head: true })
        .eq("church_id", id),
      supabase
        .from("member_profile")
        .select("*", { count: "exact", head: true })
        .eq("church_id", id),
      supabase
        .from("member_segment")
        .select("*", { count: "exact", head: true })
        .eq("church_id", id),
    ]);

    const minCount = ministryCount ?? 0;
    const memCount = memberCount ?? 0;
    const segCount = segmentCount ?? 0;

    revalidatePath("/admin");
    revalidatePath("/admin/church");
    revalidatePath("/admin/church/advanced");

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        ministryCount: minCount,
        memberCount: memCount,
        segmentCount: segCount,
        isDeletable: minCount === 0 && memCount === 0 && segCount === 0,
      },
      message: "Church settings updated successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while updating the church.",
      code: "UNKNOWN_ERROR",
    };
  }
}

/**
 * Server Action to delete an empty Church with genuinely exact name confirmation.
 * Rejects deletion if system is in an invalid multiple-Church state.
 */
export async function deleteChurchAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireLeader();
    const supabase = await createClient();

    const parsed = deleteChurchSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const [key, issues] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        if (issues && issues.length > 0) {
          fieldErrors[key] = issues;
        }
      }
      return {
        success: false,
        error: "Validation failed. Please enter the exact church name.",
        fieldErrors,
        code: "VALIDATION_FAILED",
      };
    }

    const { id, confirmationName } = parsed.data;

    // Check system church count: reject mutations if in invalid multiple-church state
    const { count: totalChurches, error: countError } = await supabase
      .from("church")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return {
        success: false,
        error: "Failed to verify system configuration status.",
        code: "DATABASE_ERROR",
      };
    }

    if ((totalChurches ?? 0) > 1) {
      return {
        success: false,
        error:
          "Direct deletion is disabled while multiple churches exist in the configuration.",
        code: "MULTIPLE_CHURCHES_ERROR",
      };
    }

    const { data: church, error: fetchError } = await supabase
      .from("church")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !church) {
      return {
        success: false,
        error: "The requested church record was not found.",
        code: "NOT_FOUND",
      };
    }

    // Genuinely exact string match without loose trimming
    if (confirmationName !== church.name) {
      return {
        success: false,
        error: "Confirmation name does not match the exact church name.",
        fieldErrors: {
          confirmationName: ["The entered name does not match exactly."],
        },
        code: "NAME_MISMATCH",
      };
    }

    // Check dependent records
    const [
      { count: ministryCount },
      { count: memberCount },
      { count: segmentCount },
    ] = await Promise.all([
      supabase
        .from("ministry")
        .select("*", { count: "exact", head: true })
        .eq("church_id", id),
      supabase
        .from("member_profile")
        .select("*", { count: "exact", head: true })
        .eq("church_id", id),
      supabase
        .from("member_segment")
        .select("*", { count: "exact", head: true })
        .eq("church_id", id),
    ]);

    const minCount = ministryCount ?? 0;
    const memCount = memberCount ?? 0;
    const segCount = segmentCount ?? 0;

    if (minCount > 0 || memCount > 0 || segCount > 0) {
      const blockingItems: string[] = [];
      if (minCount > 0)
        blockingItems.push(
          `${minCount} ${minCount === 1 ? "ministry" : "ministries"}`,
        );
      if (memCount > 0)
        blockingItems.push(
          `${memCount} ${memCount === 1 ? "member" : "members"}`,
        );
      if (segCount > 0)
        blockingItems.push(
          `${segCount} ${segCount === 1 ? "member group" : "member groups"}`,
        );

      return {
        success: false,
        error: `Cannot delete church because linked records still exist (${blockingItems.join(", ")}). Please remove linked records first.`,
        code: "DEPENDENCY_PROTECTED",
      };
    }

    const { error: deleteError } = await supabase
      .from("church")
      .delete()
      .eq("id", id);

    if (deleteError) {
      if (deleteError.code === "23503") {
        return {
          success: false,
          error:
            "Cannot delete church because the database reported active foreign-key dependencies.",
          code: "FOREIGN_KEY_RESTRICTED",
        };
      }
      return {
        success: false,
        error: "System error occurred while deleting church. Please try again.",
        code: "DELETE_FAILED",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/church");
    revalidatePath("/admin/church/advanced");

    return {
      success: true,
      data: { id },
      message: "Church deleted successfully.",
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while deleting the church.",
      code: "UNKNOWN_ERROR",
    };
  }
}
