import type { Metadata } from "next";
import { Church } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <Church className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Admin Sign In
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Internal administration system for authorized church leaders.
          </p>
        </div>

        <div className="border-border bg-card rounded-xl border p-6 shadow-xs sm:p-8">
          <LoginForm initialErrorMessage={initialErrorMessage} />
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Only authorized leader accounts can access the administration area.
        </p>
      </div>
    </div>
  );
}
