import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  FolderTree,
  Layers,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { requireLeader } from "@/features/auth/queries";
import { getAdminChurchState } from "@/features/church/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata: Metadata = {
  title: "Overview",
  description: "Overview of church operations and administration",
};

export default async function AdminPage() {
  const auth = await requireLeader();
  const churchState = await getAdminChurchState();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Church administration"
        title="Overview"
        description="Administration dashboard and operational summary."
      />

      {/* Church Status Section */}
      <section aria-labelledby="church-status-heading">
        <h2 id="church-status-heading" className="sr-only">
          Church Status
        </h2>

        {churchState.status === "zero" && (
          <Card className="admin-panel-strong">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Building2 className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-xl font-bold">
                    No Church Configured
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-0.5 text-sm">
                    The system requires one church profile to organize
                    ministries, terms, and members.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="border-border/70 flex flex-col justify-start border-t bg-transparent p-4 sm:flex-row sm:p-6">
              <Button asChild className="min-h-[44px] w-full gap-2 sm:w-auto">
                <Link href="/admin/church">
                  <Building2 className="size-4" aria-hidden="true" />
                  <span>Set up Church</span>
                  <ChevronRight className="ml-1 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {churchState.status === "multiple" && (
          <Card className="admin-panel border-destructive/30 bg-destructive/5">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <ShieldAlert className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-destructive text-xl font-bold">
                    Configuration Error: {churchState.count} Churches Detected
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-0.5 text-sm">
                    The database contains multiple church records. The
                    application enforces a single active church model.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="border-destructive/20 flex flex-col justify-start border-t bg-transparent p-4 sm:flex-row sm:p-6">
              <Button
                asChild
                variant="outline"
                className="min-h-[44px] w-full gap-2 sm:w-auto"
              >
                <Link href="/admin/church">
                  <span>View configuration issue</span>
                  <ChevronRight className="ml-1 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {churchState.status === "one" && (
          <Card className="admin-panel-strong">
            <CardHeader className="p-4 pb-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Building2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* User-entered database value displayed verbatim */}
                    <CardTitle className="text-foreground truncate text-xl font-bold sm:text-2xl">
                      {churchState.church.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-0.5 font-mono text-xs">
                      /{churchState.church.slug}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-[44px] w-full gap-2 sm:w-auto"
                >
                  <Link href="/admin/church">
                    <Building2 className="size-4" aria-hidden="true" />
                    <span>Church Settings</span>
                    <ChevronRight
                      className="ml-0.5 size-4"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6">
              {/* Compact Statistics Row inside Primary Card */}
              <div className="admin-surface grid grid-cols-1 overflow-hidden sm:grid-cols-3">
                <div className="border-border/70 flex items-center gap-3 border-b p-4 sm:border-r sm:border-b-0">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Layers className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-foreground text-base font-bold">
                      {churchState.church.ministryCount}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Ministries
                    </div>
                  </div>
                </div>

                <div className="border-border/70 flex items-center gap-3 border-b p-4 sm:border-r sm:border-b-0">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Users className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-foreground text-base font-bold">
                      {churchState.church.memberCount}
                    </div>
                    <div className="text-muted-foreground text-xs">Members</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <FolderTree className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-foreground text-base font-bold">
                      {churchState.church.segmentCount}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Member groups
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Operator Account Verification Card */}
      <section aria-labelledby="auth-status-heading">
        <Card className="admin-panel">
          <CardHeader className="p-4 pb-3 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle
                  id="auth-status-heading"
                  className="text-foreground text-base font-bold"
                >
                  Authorized Administrator
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-0.5 text-xs">
                  You are signed in as an authorized leader with administrative
                  privileges.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6">
            <div className="admin-surface text-muted-foreground flex items-center gap-2 p-3 text-xs">
              <UserCheck
                className="text-primary size-4 shrink-0"
                aria-hidden="true"
              />
              <span>Authenticated account:</span>
              <span className="text-foreground font-mono font-medium break-all">
                {auth.email}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
