import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Admin Sign In",
  description: "Sign-in portal for authorized church leaders",
};

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;

  let initialErrorMessage: string | undefined;
  if (status === "link-invalid") {
    initialErrorMessage =
      "This sign-in link is invalid or has expired. Please request a new link.";
  }

  return (
    <AuthShell contentPosition="upper">
      <div className="admin-panel-strong overflow-hidden">
        <div className="p-6 sm:p-8">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Admin Sign In
          </h1>
          <div className="mt-6">
            <LoginForm initialErrorMessage={initialErrorMessage} />
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
