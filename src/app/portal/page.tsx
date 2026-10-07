import { ArrowRight, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalDashboardData } from "@/features/portal/portal-dashboard-queries";
import { PortalDashboardTabs } from "@/features/portal/portal-dashboard-tabs";
import { portalDashboardSearchParamsCache } from "@/features/portal/search-params";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [
    { requests, requestCount, sessions, workspaces, readiness, memberMode },
    query,
  ] = await Promise.all([
    getPortalDashboardData(),
    portalDashboardSearchParamsCache.parse(searchParams),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-24 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
        Portal
      </h1>

      {requestCount > 0 && (
        <Card className="admin-panel">
          <CardHeader className="flex-row items-center justify-between gap-3 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <ClipboardList
                className="text-primary size-5 shrink-0"
                aria-hidden="true"
              />
              <CardTitle className="text-lg">Pending requests</CardTitle>
            </div>
            <span className="text-muted-foreground text-sm">
              {requestCount} to review
            </span>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 sm:p-6 sm:pt-0">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={request.href}
                className="border-border hover:bg-muted/50 flex min-h-14 items-center justify-between gap-4 rounded-xl border px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {request.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-sm">
                    {request.scope}
                    {request.date ? ` · ${request.date}` : ""}
                  </span>
                </span>
                <ArrowRight
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <PortalDashboardTabs
        sessions={sessions}
        workspaces={workspaces}
        readiness={readiness}
        section={
          memberMode && query.section === "readiness"
            ? "assignments"
            : query.section
        }
        memberMode={memberMode}
      />
    </main>
  );
}
