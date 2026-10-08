import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailVerificationForm } from "@/features/access/email-verification-form";
export const metadata: Metadata = { title: "Verify email | TMG Church" };
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = z
    .string()
    .trim()
    .email()
    .toLowerCase()
    .safeParse(params.email);
  if (!parsed.success) redirect("/register");
  return (
    <AuthShell contentPosition="center">
      <div className="admin-panel-strong overflow-hidden">
        <div className="p-6 sm:p-8">
          <EmailVerificationForm email={parsed.data} />
        </div>
      </div>
    </AuthShell>
  );
}
