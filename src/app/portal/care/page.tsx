import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getCareScopes } from "@/features/care/queries";

export default async function CarePage() {
  const scopes = await getCareScopes();
  if (scopes.length === 1)
    redirect(
      `/portal/ministries/${scopes[0].ministrySlug}/terms/${scopes[0].termSlug}/care`,
    );
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Care"
        description="Choose a term to view and follow up on group absences."
        backLink={{ href: "/portal", label: "Portal" }}
      />
      {scopes.length === 0 ? (
        <div className="border-border rounded-2xl border p-6">
          <p className="font-medium">No Care access</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Care is available to group leaders and term Care commissioners.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {scopes.map((scope) => (
            <Link
              key={scope.termId}
              href={`/portal/ministries/${scope.ministrySlug}/terms/${scope.termSlug}/care`}
              className="border-border bg-card hover:bg-muted/40 flex min-h-14 items-center justify-between gap-3 rounded-2xl border p-5"
            >
              <div className="min-w-0 space-y-1">
                <h2 className="font-semibold break-words">{scope.termName}</h2>
                <p className="text-muted-foreground text-sm break-words">
                  {scope.ministryName}
                </p>
                {scope.readOnly && (
                  <p className="text-muted-foreground text-sm">Read-only</p>
                )}
              </div>
              <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
