"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { requireSystemAdmin } from "@/features/auth/queries";
import { generateVietnameseSlug } from "@/lib/slug";
import {
  registrationSchema,
  type RegistrationErrors,
} from "./registration-schema";

export type RegistrationState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: RegistrationErrors;
};
export async function registerAccount(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  const s = await createClient();
  const { data, error } = await s.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        date_of_birth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        request_access: true,
      },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/access-pending`,
    },
  });
  if (error)
    return {
      status: "error",
      message:
        "Unable to register. Try again later, or sign in if you already have an account.",
    };
  if (data.session) redirect("/access-pending");
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

const reviewSchema = z.discriminatedUnion("decision", [
  z
    .object({
      requestId: z.uuid(),
      decision: z.literal("approved"),
      memberId: z.uuid().optional(),
      createMember: z.boolean(),
      registrationFields: z
        .array(
          z.enum(["full_name", "date_of_birth", "gender", "email", "phone"]),
        )
        .max(5)
        .default([]),
    })
    .refine((value) => value.createMember !== Boolean(value.memberId)),
  z.object({
    requestId: z.uuid(),
    decision: z.literal("rejected"),
    reason: z.string().trim().min(1).max(500),
  }),
]);
export async function reviewAccessRequest(raw: unknown) {
  const auth = await requireSystemAdmin();
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success)
    return {
      success: false,
      error:
        "Select a member, choose to create one, or enter a rejection reason.",
    };
  const s = await createClient();
  const { data: request } = await s
    .from("member_access_request")
    .select("id,full_name")
    .eq("id", parsed.data.requestId)
    .eq("church_id", auth.systemRole.church_id)
    .maybeSingle();
  if (!request)
    return { success: false, error: "Access request was not found." };
  const input = parsed.data;
  const { error } = await s.rpc("review_member_access_request", {
    p_request_id: input.requestId,
    p_decision: input.decision,
    p_member_id: input.decision === "approved" ? input.memberId : undefined,
    p_new_member_slug:
      input.decision === "approved" && input.createMember
        ? `${generateVietnameseSlug(request.full_name) || "member"}-${crypto.randomUUID().slice(0, 8)}`
        : undefined,
    p_registration_fields:
      input.decision === "approved" && !input.createMember
        ? input.registrationFields
        : [],
    p_reason: input.decision === "rejected" ? input.reason : undefined,
  });
  if (error)
    return {
      success: false,
      error:
        "Unable to review this request. It may already be reviewed, or the member/email may already be linked. Refresh and select the existing member if needed.",
    };
  revalidatePath("/admin", "layout");
  revalidatePath("/access-pending");
  revalidatePath("/portal", "layout");
  return { success: true };
}

const verificationSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});
export async function verifyRegistrationEmail(raw: unknown) {
  const parsed = verificationSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Enter the 6-digit code from your email." };
  const s = await createClient();
  const { error } = await s.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });
  if (error)
    return {
      success: false,
      error:
        "This code is incorrect or has expired. Try again or request a new code.",
    };
  redirect("/access-pending");
}

export async function resendRegistrationCode(raw: unknown) {
  const parsed = z
    .object({ email: z.string().trim().email().toLowerCase() })
    .safeParse(raw);
  if (!parsed.success)
    return { success: false, error: "Enter a valid email address." };
  const s = await createClient();
  const { error } = await s.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/access-pending`,
    },
  });
  if (error)
    return {
      success: false,
      error: "Unable to resend the code. Wait a minute and try again.",
    };
  return { success: true };
}
