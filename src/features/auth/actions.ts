"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  passwordLoginSchema,
  type LoginActionState,
} from "@/features/auth/schemas";

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

  redirect("/admin");
}

/**
 * Signs out the current user and redirects to the login page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
