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

  // Route system admins to administration, department leaders to their
  // department, other linked members to the operational portal, and orphaned
  // accounts to the unauthorized page.
  const portal = await getPortalContext();
  if (portal?.isSystemAdmin) {
    redirect("/admin");
  }
  if (portal?.memberProfileId) {
    const { data: leaderDepartment } = await supabase
      .from("term_department")
      .select("id")
      .eq("leader_member_profile_id", portal.memberProfileId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (leaderDepartment) {
      const { data: department } = await supabase
        .from("portal_department_directory")
        .select("slug,ministry_slug,term_slug")
        .eq("id", leaderDepartment.id)
        .maybeSingle();

      if (department) {
        redirect(
          `/portal/ministries/${department.ministry_slug}/terms/${department.term_slug}/departments/${department.slug}`,
        );
      }
    }

    redirect("/portal");
  }
  redirect("/access-pending");
}

/**
 * Signs out the current user and redirects to the login page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
