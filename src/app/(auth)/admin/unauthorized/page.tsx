import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, Home } from "lucide-react";
import { getAuthContext } from "@/features/auth/queries";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Access Denied",
  description: "Account is not authorized for administration",
};

export default async function UnauthorizedPage() {
  const auth = await getAuthContext();

  if (auth.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (auth.status === "authorized") {
    redirect("/admin");
  }

  return (
    <AuthShell>
      <div className="admin-panel-strong overflow-hidden text-center">
        <div className="p-6 sm:p-8 sm:pb-6">
          <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-xl">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-foreground mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            Access Denied
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Your account is not registered as an authorized leader for church
            administration.
          </p>
        </div>

        <div className="border-border/70 border-t p-6">
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Signed in as: </span>
              <span className="text-foreground font-mono font-medium break-all">
                {auth.email}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              If you are a designated church leader, please contact an
              operations administrator to grant leader permissions.
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:justify-center">
              <SignOutButton variant="page" />
              <Link
                href="/"
                className={buttonVariants({
                  variant: "outline",
                  className: "min-h-[44px] gap-2",
                })}
              >
                <Home className="size-4" aria-hidden="true" />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
