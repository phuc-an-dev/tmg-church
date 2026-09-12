"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { loginSchema, type LoginActionState } from "@/features/auth/schemas";

const GENERIC_CONFIRMATION_MESSAGE =
  "Nếu địa chỉ email hợp lệ, một liên kết đăng nhập đã được gửi tới hộp thư của bạn. Vui lòng kiểm tra hộp thư (bao gồm cả thư rác).";

/**
 * Sends a Magic Link OTP to the provided email address.
 * Always returns the exact same Vietnamese confirmation message for any syntactically
 * valid email address to prevent account enumeration, regardless of account existence,
 * leader status, or identity-sensitive provider errors.
 */
export async function sendMagicLink(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const rawEmail = formData.get("email");

  const parseResult = loginSchema.safeParse({ email: rawEmail });
  if (!parseResult.success) {
    const issues = parseResult.error.flatten().fieldErrors;
    return {
      status: "error",
      fieldErrors: {
        email: issues.email,
      },
    };
  }

  const { email } = parseResult.data;
  const siteUrl = getSiteUrl();
  const emailRedirectTo = `${siteUrl}/admin/auth/callback?next=/admin`;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      // Log operational failure without echoing email, token, or private values
      console.error(
        "Supabase signInWithOtp non-fatal operation log:",
        error.name || "AuthError",
      );
    }
  } catch (error) {
    // Log unexpected failure without private values
    console.error(
      "Unexpected error during Magic Link dispatch:",
      error instanceof Error ? error.name : "UnknownError",
    );
  }

  // Always return the exact same generic confirmation state
  return {
    status: "success",
    message: GENERIC_CONFIRMATION_MESSAGE,
  };
}

/**
 * Signs out the current user and redirects to the login page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
