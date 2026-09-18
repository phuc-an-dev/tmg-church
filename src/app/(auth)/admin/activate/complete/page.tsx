import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CompleteActivationPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function CompleteActivationPage({
  searchParams,
}: CompleteActivationPageProps) {
  const { token } = await searchParams;
  if (!token) {
    redirect("/admin/login?status=link-invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect("/admin/login?status=link-invalid");
  }

  const { error } = await supabase.rpc("consume_member_access_invitation", {
    p_token: token,
    p_email: user.email,
  });
  if (error) {
    await supabase.auth.signOut();
    redirect("/admin/login?status=link-invalid");
  }

  await supabase.auth.signOut();
  redirect("/admin/login?status=activated");
}
