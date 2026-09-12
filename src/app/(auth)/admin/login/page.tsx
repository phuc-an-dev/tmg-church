import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLockup } from "@/components/brand/brand-lockup";

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
    <div className="from-primary/10 via-background to-background flex min-h-screen flex-col items-center justify-center bg-gradient-to-b px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <BrandLockup className="mx-auto w-fit" compact />
          <h1 className="text-foreground mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Admin Sign In
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Internal administration system for authorized church leaders.
          </p>
        </div>

        <div className="border-primary/10 bg-card/95 shadow-primary/5 rounded-3xl border p-6 shadow-lg sm:p-8">
          <LoginForm initialErrorMessage={initialErrorMessage} />
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Only authorized leader accounts can access the administration area.
        </p>
      </div>
    </div>
  );
}
