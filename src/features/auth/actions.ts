"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  passwordLoginSchema,
  type LoginActionState,
} from "@/features/auth/schemas";
import { getPortalContext } from "./queries";

export async function signInWithPassword(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parseResult = passwordLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parseResult.success) {
    return {
      status: "error",
      message: "Enter a valid email and password.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parseResult.data);
  if (error) {
    return {
      status: "error",
      message: "Email or password is incorrect.",
    };
  }

  // Route by granted scope: system admins to the admin area, members with a
  // linked profile (ministry heads, department/group leaders, members) to the
  // operational portal, and orphaned accounts to the unauthorized page.
  const portal = await getPortalContext();
  if (portal?.isSystemAdmin) {
    redirect("/admin");
  }
  if (portal?.memberProfileId) {
    redirect("/portal");
  }
  redirect("/admin/unauthorized");
}

/**
 * Signs out the current user and redirects to the login page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
