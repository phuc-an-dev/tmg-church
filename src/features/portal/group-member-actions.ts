"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/features/auth/queries";

const assignSchema = z.object({
  groupId: z.string().uuid(),
  membershipId: z.string().uuid(),
});
const removeSchema = z.object({ recordId: z.string().uuid() });

type Result = { success: boolean; error?: string };

export async function assignPortalGroupMemberAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid member assignment." };
  const s = await createClient();
  const { error } = await s.rpc("portal_assign_group_member", {
    p_group_id: parsed.data.groupId,
    p_membership_id: parsed.data.membershipId,
  });
  if (error)
    return {
      success: false,
      error:
        error.code === "23505"
          ? "Member already belongs to a group."
          : "Unable to assign member.",
    };
  revalidatePath("/portal");
  return { success: true };
}

export async function removePortalGroupMemberAction(
  raw: unknown,
): Promise<Result> {
  await requirePortalContext();
  const parsed = removeSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Invalid group membership." };
  const s = await createClient();
  const { error } = await s.rpc("portal_remove_group_member", {
    p_record_id: parsed.data.recordId,
  });
  if (error)
    return { success: false, error: "Unable to remove member from group." };
  revalidatePath("/portal");
  return { success: true };
}
