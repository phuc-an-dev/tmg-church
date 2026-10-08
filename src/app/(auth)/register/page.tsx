import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegistrationForm } from "@/features/access/registration-form";
export const metadata: Metadata = { title: "Create account | TMG Church" };
export default async function RegisterPage() {
  return (
    <AuthShell contentPosition="top">
      <div className="admin-panel-strong overflow-hidden">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Create your account to stay connected with TMG Church.
          </p>
          <div className="mt-6">
            <RegistrationForm />
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
