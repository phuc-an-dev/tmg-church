"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requirePortalContext } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import {
  addCareNoteSchema,
  assignCareFollowUpSchema,
  createCareFollowUpSchema,
  loadCareDetailSchema,
  loadCareGroupOptionsSchema,
  updateCareFollowUpSchema,
} from "./schemas";
import {
  CareQueryError,
  getCareDetail,
  getCareGroupOptions,
  getCareMutationContext,
  getCareScopes,
} from "./queries";
import type {
  CareActionFailure,
  CareActionResult,
  CareDetail,
  CareGroup,
  CareGroupOptions,
  CareReadResult,
  CareScope,
} from "./types";

function failure(error: unknown): CareActionFailure {
  let code: CareActionFailure["code"] = "unknown";
  if (error instanceof CareQueryError) {
    if (["forbidden", "duplicate", "stale", "closed"].includes(error.code))
      code = error.code as typeof code;
    if (error.code === "invalid") code = "validation";
    if (error.code === "resolved") code = "closed";
  } else if (error && typeof error === "object" && "code" in error) {
    const dbError = error as { code: string; message?: string };
    if (dbError.code === "23505") code = "duplicate";
    if (dbError.code === "P0001")
      return failure(new CareQueryError(dbError.message ?? "unknown"));
  }
  const messages = {
    validation: "Please correct the follow-up details.",
    forbidden: "You do not have access to this follow-up.",
    duplicate: "An open follow-up already exists.",
    stale: "Attendance has changed. Refresh the suggestions.",
    closed: "This term is read-only.",
    unknown: "Unable to save changes. Please try again.",
  };
  return { success: false, code, error: messages[code] };
}

function validation(error: z.ZodError): CareActionFailure {
  return {
    ...failure(new CareQueryError("invalid")),
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

function revalidateCare(
  scope: CareScope,
  group: CareGroup | null,
  caseSlug?: string,
) {
  const base = `/portal/ministries/${scope.ministrySlug}/terms/${scope.termSlug}`;
  revalidatePath("/portal/care");
  revalidatePath(`${base}/care`);
  if (group) revalidatePath(`${base}/groups/${group.slug}/care`);
  if (caseSlug) revalidatePath(`${base}/care/${caseSlug}`);
}

export async function loadCareDetailAction(
  raw: unknown,
): Promise<CareReadResult<CareDetail>> {
  await requirePortalContext();
  const input = loadCareDetailSchema.safeParse(raw);
  if (!input.success) return validation(input.error);
  try {
    const data = await getCareDetail(
      input.data.ministrySlug,
      input.data.termSlug,
      input.data.careSlug,
    );
    return data
      ? { success: true, data }
      : failure(new CareQueryError("forbidden"));
  } catch (error) {
    return failure(error);
  }
}

export async function loadCareGroupOptionsAction(
  raw: unknown,
): Promise<CareReadResult<CareGroupOptions>> {
  await requirePortalContext();
  const input = loadCareGroupOptionsSchema.safeParse(raw);
  if (!input.success) return validation(input.error);
  try {
    return {
      success: true,
      data: await getCareGroupOptions(input.data.groupId),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createCareFollowUpAction(
  raw: unknown,
): Promise<CareActionResult> {
  await requirePortalContext();
  const input = createCareFollowUpSchema.safeParse(raw);
  if (!input.success) return validation(input.error);
  try {
    const scopes = await getCareScopes();
    const scope = scopes.find((item) =>
      item.groups.some((group) => group.id === input.data.groupId),
    );
    const group = scope?.groups.find((item) => item.id === input.data.groupId);
    if (!scope || !group) return failure(new CareQueryError("forbidden"));
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      input.data.source === "attendance"
        ? "create_care_follow_up_from_absence"
        : "create_care_follow_up",
      {
        p_group_id: input.data.groupId,
        p_member_id: input.data.memberId,
        p_assignee_id: input.data.assigneeId,
        p_next_contact_date: input.data.nextContactDate as unknown as string,
      },
    );
    if (error) return failure(error);
    if (!data) return failure(null);
    revalidateCare(scope, group);
    return { success: true, caseId: data };
  } catch (error) {
    return failure(error);
  }
}

async function mutateCase(
  caseId: string,
  run: (
    client: Awaited<ReturnType<typeof createClient>>,
  ) => PromiseLike<{ error: unknown }>,
): Promise<CareActionResult> {
  try {
    const context = await getCareMutationContext(caseId);
    if (!context) return failure(new CareQueryError("forbidden"));
    const supabase = await createClient();
    const { error } = await run(supabase);
    if (error) return failure(error);
    revalidateCare(context.scope, context.group, context.caseSlug);
    return { success: true, caseId };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCareFollowUpAction(
  raw: unknown,
): Promise<CareActionResult> {
  await requirePortalContext();
  const input = updateCareFollowUpSchema.safeParse(raw);
  if (!input.success) return validation(input.error);
  return mutateCase(input.data.caseId, (supabase) =>
    supabase.rpc("update_care_follow_up", {
      p_case_id: input.data.caseId,
      p_status: input.data.status,
      p_next_contact_date: input.data.nextContactDate as unknown as string,
    }),
  );
}

export async function assignCareFollowUpAction(
  raw: unknown,
): Promise<CareActionResult> {
  await requirePortalContext();
  const input = assignCareFollowUpSchema.safeParse(raw);
  if (!input.success) return validation(input.error);
  return mutateCase(input.data.caseId, (supabase) =>
    supabase.rpc("assign_care_follow_up", {
      p_case_id: input.data.caseId,
      p_assignee_id: input.data.assigneeId,
    }),
  );
}

export async function addCareNoteAction(
  raw: unknown,
): Promise<CareActionResult> {
  await requirePortalContext();
  const input = addCareNoteSchema.safeParse(raw);
  if (!input.success) return validation(input.error);
  return mutateCase(input.data.caseId, (supabase) =>
    supabase.rpc("add_care_note", {
      p_case_id: input.data.caseId,
      p_note: input.data.note,
    }),
  );
}
