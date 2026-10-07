import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getPortalTermSessions } from "@/features/portal/term-session-queries";
import { PortalTermSessionView } from "@/features/portal/term-session-view";
import { isUuid } from "@/lib/slug";

export const metadata: Metadata = { title: "Ministry Sessions" };

export default async function PortalTermPage({
  params,
  searchParams,
}: {
  params: Promise<{ ministrySlug: string; termSlug: string }>;
  searchParams: Promise<{
    date?: string | string[];
    createSession?: string | string[];
    fromDepartment?: string | string[];
  }>;
}) {
  const { ministrySlug, termSlug } = await params;
  const query = await searchParams;
  if (isUuid(ministrySlug) || isUuid(termSlug)) notFound();

  const term = await getPortalTermSessions(ministrySlug, termSlug);
  if (!term) notFound();
  const requestedDateString =
    typeof query.date === "string" ? query.date : null;
  const requestedDate = requestedDateString
    ? parseISO(requestedDateString)
    : null;
  const initialDate =
    requestedDate &&
    isValid(requestedDate) &&
    format(requestedDate, "yyyy-MM-dd") === requestedDateString
      ? requestedDateString
      : undefined;
  const fromDepartment =
    typeof query.fromDepartment === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.fromDepartment)
      ? query.fromDepartment
      : null;
  const initialCreate = query.createSession === "true" && Boolean(initialDate);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          title="Ministry sessions"
          description="Sessions for the whole ministry — create the weekly gatherings here."
          backLink={
            fromDepartment
              ? {
                  href: `/portal/ministries/${ministrySlug}/terms/${termSlug}/departments/${fromDepartment}`,
                  label: "Department",
                }
              : { href: "/portal", label: "Portal" }
          }
        />
        <PortalTermSessionView
          ministryTermId={term.id}
          ministrySlug={ministrySlug}
          termSlug={termSlug}
          fromDepartment={fromDepartment ?? undefined}
          sessions={term.sessions}
          initialDate={initialDate}
          initialCreate={initialCreate}
        />
      </div>
    </div>
  );
}
