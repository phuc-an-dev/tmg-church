import { ArrowRight, Building2, Layers3, UsersRound } from "lucide-react";
import Link from "next/link";
import { requirePortalContext } from "@/features/auth/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getPortalRequestDepartments } from "@/features/portal/department-request-queries";

export default async function PortalPage() {
  const context = await requirePortalContext();
  const supabase = await createClient();
  const groupIds = context.groupRoles.map((role) => role.groupId);
  const { data: groups } = groupIds.length
    ? await supabase
        .from("portal_group_directory")
        .select("id,name,slug,term_slug,ministry_slug")
        .in("id", groupIds)
    : { data: [] };
  const { data: departments } = await supabase
    .from("portal_department_directory")
    .select("id,name,slug,term_slug,ministry_slug")
    .order("name");
  const requestDepartments = await getPortalRequestDepartments();
  const roleLabels = [
    ...context.termRoles.map((role) => role.role.replaceAll("_", " ")),
    ...context.groupRoles.map((role) => role.role.replaceAll("_", " ")),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">
          Operational portal
        </p>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">
          Welcome to TMG Church
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-7">
          Your navigation and actions will be limited to the Ministry,
          Department, and Group scopes assigned to your account.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="admin-panel">
          <CardHeader className="flex-row items-center gap-3 p-4 pb-2">
            <Building2 className="text-primary size-5" aria-hidden="true" />
            <CardTitle className="text-base">Ministry roles</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-2xl font-bold">
            {context.termRoles.length}
          </CardContent>
        </Card>
        <Card className="admin-panel">
          <CardHeader className="flex-row items-center gap-3 p-4 pb-2">
            <Layers3 className="text-primary size-5" aria-hidden="true" />
            <CardTitle className="text-base">Group scopes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-2xl font-bold">
            {context.groupRoles.length}
          </CardContent>
        </Card>
        <Card className="admin-panel">
          <CardHeader className="flex-row items-center gap-3 p-4 pb-2">
            <UsersRound className="text-primary size-5" aria-hidden="true" />
            <CardTitle className="text-base">Access model</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-sm">
            Capability scoped
          </CardContent>
        </Card>
      </div>

      <Card className="admin-panel">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg">Your assigned roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {roleLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roleLabels.map((role) => (
                <span
                  key={role}
                  className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm font-medium capitalize"
                >
                  {role}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm leading-6">
              No operational role has been assigned yet.
            </p>
          )}
          {context.isSystemAdmin && (
            <Link
              href="/admin"
              className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
            >
              Open administration{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </CardContent>
      </Card>

      {groups && groups.length > 0 && (
        <Card className="admin-panel">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg">Your groups</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
            {groups.map((group) => {
              const basePath = `/portal/ministries/${group.ministry_slug}/terms/${group.term_slug}/groups/${group.slug}`;
              return (
                <div
                  key={group.id}
                  className="border-border rounded-xl border p-4"
                >
                  <p className="font-semibold">{group.name}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                    <Link
                      href={`${basePath}/sessions`}
                      className="text-primary inline-flex min-h-11 items-center gap-2"
                    >
                      Sessions{" "}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href={`${basePath}/members`}
                      className="text-primary inline-flex min-h-11 items-center gap-2"
                    >
                      Members{" "}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href={`${basePath}/requests`}
                      className="text-primary inline-flex min-h-11 items-center gap-2"
                    >
                      Requests{" "}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href={`${basePath}/service-roles`}
                      className="text-primary inline-flex min-h-11 items-center gap-2"
                    >
                      Service roles{" "}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {departments && departments.length > 0 && (
        <Card className="admin-panel">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg">Your departments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
            {departments.map((department) => (
              <Link
                key={department.id}
                href={`/portal/ministries/${department.ministry_slug}/terms/${department.term_slug}/departments/${department.slug}/members`}
                className="border-border hover:bg-muted/50 flex min-h-11 items-center justify-between rounded-xl border p-4"
              >
                <span className="font-semibold">{department.name}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {requestDepartments.length > 0 && (
        <Card className="admin-panel">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg">Department requests</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0">
            {requestDepartments.map((department) => (
              <Link
                key={department.department_id}
                href={`/portal/ministries/${department.ministry_slug}/terms/${department.term_slug}/departments/${department.department_slug}/requests`}
                className="border-border hover:bg-muted/50 flex min-h-11 items-center justify-between rounded-xl border p-4"
              >
                <span className="font-semibold">
                  {department.department_name}
                </span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
