import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { requireTermContext } from "@/features/context/queries";
import { getStructure } from "@/features/ministry/queries";
import { structureSearchParamsCache } from "@/features/ministry/search-params";

export const metadata: Metadata = { title: "Term Structure" };
export default async function TermDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ministrySlug: string; termSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ministrySlug, termSlug } = await params;
  const [context, query] = await Promise.all([
    requireTermContext(ministrySlug, termSlug),
    structureSearchParamsCache.parse(searchParams),
  ]);
  if (!context) notFound();

  const section = query.section;
  const result = await getStructure(
    context.ministry.slug,
    context.term.slug,
    section,
  );
  const sectionLabel = section === "groups" ? "Groups" : "Departments";
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Term Structure"
        description={`Manage groups and departments for ${context.ministry.name} (${context.term.name}).`}
        backLink={{
          href: "/admin/ministries",
          label: "Ministries",
        }}
      />
      <div
        className="bg-muted/60 border-border/50 inline-flex items-center gap-1 rounded-xl border p-1"
        role="tablist"
        aria-label="Term structure sections"
      >
        <Link
          href="?section=groups"
          role="tab"
          aria-selected={section === "groups"}
          className={cn(
            "inline-flex min-h-8 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all select-none",
            section === "groups"
              ? "bg-card text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Groups
        </Link>
        <Link
          href="?section=departments"
          role="tab"
          aria-selected={section === "departments"}
          className={cn(
            "inline-flex min-h-8 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all select-none",
            section === "departments"
              ? "bg-card text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Departments
        </Link>
      </div>
      <MinistryManagement
        mode={section === "groups" ? "groups" : "departments"}
        title={sectionLabel}
        description={`Only ${sectionLabel.toLowerCase()} are loaded for the selected section.`}
        result={result}
        ministryId={context.ministry.id}
        ministrySlug={context.ministry.slug}
        termId={context.term.id}
        termSlug={context.term.slug}
      />
    </AdminPageContainer>
  );
}
