"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { requireSystemAdmin } from "./queries";
import { sendMemberInvitationEmail } from "./resend";
import type { ActionResult } from "@/features/church/types";

const invitationSchema = z.object({
  churchId: z.string().uuid(),
  memberProfileId: z.string().uuid(),
});

const revokeInvitationSchema = z.object({
  churchId: z.string().uuid(),
  invitationId: z.string().uuid(),
});

const activationSchema = z
  .object({
    token: z.string().min(32),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8),
    passwordConfirmation: z.string().min(8),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Passwords do not match.",
  });

export type ActivationActionState = {
  status: "idle" | "error" | "check-email";
  message?: string;
};

type InvitationPayload = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
};

function parseInvitationPayload(value: unknown): InvitationPayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.email !== "string" ||
    typeof record.token !== "string" ||
    typeof record.expires_at !== "string"
  ) {
    return null;
  }
  return {
    id: record.id,
    email: record.email,
    token: record.token,
    expires_at: record.expires_at,
  };
}

export async function createMemberInvitationAction(
  rawInput: unknown,
): Promise<ActionResult<{ invitationId: string }>> {
  await requireSystemAdmin();
  const parsed = invitationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid invitation request.",
      code: "VALIDATION_FAILED",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_member_access_invitation",
    {
      p_church_id: parsed.data.churchId,
      p_member_profile_id: parsed.data.memberProfileId,
    },
  );
  if (error) {
    return {
      success: false,
      error:
        error.code === "42501"
          ? "Only a Master Admin or Admin can send invitations."
          : "Failed to create invitation.",
      code: error.code,
    };
  }

  const invitation = parseInvitationPayload(data);
  if (!invitation) {
    return {
      success: false,
      error: "Failed to create invitation.",
      code: "INVALID_INVITATION_RESPONSE",
    };
  }

  try {
    await sendMemberInvitationEmail({
      email: invitation.email,
      token: invitation.token,
    });
  } catch {
    await supabase.rpc("revoke_member_access_invitation", {
      p_church_id: parsed.data.churchId,
      p_invitation_id: invitation.id,
    });
    return {
      success: false,
      error: "Invitation email could not be sent.",
      code: "INVITATION_DELIVERY_FAILED",
    };
  }

  revalidatePath("/admin/church/advanced");
  return {
    success: true,
    data: { invitationId: invitation.id },
    message: "Invitation sent.",
  };
}

export async function revokeMemberInvitationAction(
  rawInput: unknown,
): Promise<ActionResult<{ revoked: boolean }>> {
  await requireSystemAdmin();
  const parsed = revokeInvitationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid invitation request.",
      code: "VALIDATION_FAILED",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "revoke_member_access_invitation",
    {
      p_church_id: parsed.data.churchId,
      p_invitation_id: parsed.data.invitationId,
    },
  );
  if (error) {
    return {
      success: false,
      error: "Failed to revoke invitation.",
      code: error.code,
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Invitation is already inactive or outside this Church.",
      code: "INVITATION_NOT_ACTIVE",
    };
  }

  revalidatePath("/admin/church/advanced");
  return {
    success: true,
    data: { revoked: Boolean(data) },
    message: "Invitation revoked.",
  };
}

export async function activateMemberAccountAction(
  _previousState: ActivationActionState,
  formData: FormData,
): Promise<ActivationActionState> {
  const parsed = activationSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        "Enter a valid email and matching password of at least 8 characters.",
    };
  }

  const { token, email, password } = parsed.data;
  const supabase = await createClient();
  const preview = await supabase.rpc("preview_member_access_invitation", {
    p_token: token,
  });
  const previewData = preview.data;
  if (
    preview.error ||
    !previewData ||
    typeof previewData !== "object" ||
    Array.isArray(previewData) ||
    (previewData as Record<string, unknown>).email !== email
  ) {
    return {
      status: "error",
      message:
        "This invitation is invalid, expired, or does not match the invited email.",
    };
  }

  const callbackPath = `/admin/activate/complete?token=${encodeURIComponent(token)}`;
  let { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/admin/auth/callback?next=${encodeURIComponent(callbackPath)}`,
    },
  });
  if (error) {
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (!retry.error) {
      data = retry.data;
      error = null;
    }
  }
  if (error || !data.user) {
    return {
      status: "error",
      message:
        "This account could not be activated. The invitation may already be used.",
    };
  }

  if (data.session) {
    const consumed = await supabase.rpc("consume_member_access_invitation", {
      p_token: token,
      p_email: email,
    });
    if (consumed.error) {
      await supabase.auth.signOut();
      return {
        status: "error",
        message: "This invitation could not be completed.",
      };
    }
    redirect("/admin/login?status=activated");
  }

  return {
    status: "check-email",
    message:
      "Check your inbox to confirm your email and finish activating your account.",
  };
}
