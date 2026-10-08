import type { Metadata } from "next";
import {
  Check,
  Clock3,
  Mail,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { cn } from "cn";
import { redirect } from "next/navigation";
import { getAuthContext, getPortalContext } from "@/features/auth/queries";
import { getOwnAccessRequest } from "@/features/access/queries";
import { AuthShell } from "@/components/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";
export const metadata: Metadata = { title: "Access request | TMG Church" };
export default async function AccessPendingPage() {
  const auth = await getAuthContext();
  if (auth.status === "unauthenticated") redirect("/login");
  const portal = await getPortalContext();
  if (portal?.isSystemAdmin) redirect("/admin");
  if (portal?.memberProfileId) redirect("/portal");
  const request = await getOwnAccessRequest();
  const isPending = request?.status === "pending";
  const isRejected = request?.status === "rejected";
  const Icon = isPending ? Clock3 : isRejected ? XCircle : ShieldAlert;
  const title = isPending
    ? "Awaiting approval"
    : isRejected
      ? "Request declined"
      : "Access unavailable";
  const description = isPending
    ? "Your account is ready. We’re waiting for an admin to approve your access."
    : isRejected
      ? "Your access request was reviewed. See the reason below."
      : "Please contact your church administrator to check your member access.";
  return (
    <AuthShell contentPosition="center">
      <div className="admin-panel-strong overflow-hidden">
        <div className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3 text-center">
            <span
              className={cn(
                "mx-auto flex size-14 items-center justify-center rounded-2xl",
                isRejected
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </div>
          <div className="bg-muted/30 flex items-center gap-3 rounded-xl border p-3.5">
            <Mail
              className="text-muted-foreground size-5 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Signed in as</p>
              <p className="mt-1 text-sm break-all">{auth.email}</p>
            </div>
          </div>
          {isPending && (
            <ol aria-label="Account access progress" className="space-y-5">
              {[
                {
                  title: "Create account",
                  status: "Account created",
                  complete: true,
                },
                {
                  title: "Verify email",
                  status: "Email verified",
                  complete: true,
                },
                {
                  title: "Admin approval",
                  status: "Awaiting approval",
                  complete: false,
                },
              ].map((step, index) => (
                <li
                  key={step.title}
                  aria-current={step.complete ? undefined : "step"}
                  className="relative flex items-start gap-3"
                >
                  {index < 2 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-8 bottom-[-1.25rem] left-4 w-px",
                        index === 0 ? "bg-emerald-500/40" : "bg-border",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex size-8 shrink-0 items-center justify-center rounded-full",
                      step.complete
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {step.complete ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Clock3 className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {step.status}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {isRejected && request?.rejection_reason && (
            <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-4">
              <p className="text-sm font-medium">Reason for rejection</p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {request.rejection_reason}
              </p>
            </div>
          )}
        </div>
        <div className="bg-muted/20 space-y-2 border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
          <a
            href="/access-pending"
            className={buttonVariants({ className: "min-h-11 w-full gap-2" })}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh status
          </a>
        </div>
      </div>
    </AuthShell>
  );
}
