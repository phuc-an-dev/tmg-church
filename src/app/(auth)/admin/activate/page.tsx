import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ActivationForm } from "@/components/auth/activation-form";
import { getMemberInvitationPreview } from "@/features/auth/invitation-queries";

export const metadata: Metadata = {
  title: "Activate TMG Church account",
  description: "Activate an invited TMG Church account",
};

interface ActivationPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ActivationPage({
  searchParams,
}: ActivationPageProps) {
  const { token } = await searchParams;
  const preview = token ? await getMemberInvitationPreview(token) : null;

  return (
    <AuthShell contentPosition="upper">
      <div className="admin-panel-strong overflow-hidden">
        <div className="p-6 sm:p-8">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Activate your account
          </h1>
          {preview && token ? (
            <div className="mt-6">
              <p className="text-muted-foreground mb-5 text-sm leading-6">
                Set a password for the invited TMG Church account below.
              </p>
              <ActivationForm email={preview.email} token={token} />
            </div>
          ) : (
            <p
              className="text-muted-foreground mt-6 text-sm leading-6"
              role="alert"
            >
              This invitation is invalid, expired, or has already been used.
            </p>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
