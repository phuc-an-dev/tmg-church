import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to TMG Church",
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
            Sign In
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Access your church community, sessions, and assignments.
          </p>
          <div className="mt-6">
            <LoginForm initialErrorMessage={initialErrorMessage} />
            <p className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-x-1 text-sm">
              <span>New to TMG Church?</span>
              <Link
                href="/register"
                className="text-primary inline-flex min-h-11 items-center"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
