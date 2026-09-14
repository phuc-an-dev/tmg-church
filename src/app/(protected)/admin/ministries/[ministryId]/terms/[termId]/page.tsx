import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { getStructure, getTermContext } from "@/features/ministry/queries";
import {
  safePageSize,
  structureSearchParamsCache,
} from "@/features/ministry/search-params";

export const metadata: Metadata = { title: "Term Structure" };
export default async function TermDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ministryId: string; termId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ministryId, termId } = await params;
  const [context, query] = await Promise.all([
    getTermContext(ministryId, termId),
    structureSearchParamsCache.parse(searchParams),
  ]);
  if (!context) notFound();
  const section = query.section;
  const result = await getStructure(ministryId, termId, section, {
    q: query.q,
    page: Math.max(1, query.page),
    pageSize: safePageSize(query.pageSize),
  });
  const sectionLabel = section === "groups" ? "Groups" : "Departments";
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Term Structure"
        description="Manage groups and departments within this term."
      />
      <div className="flex gap-2">
        <Button asChild variant={section === "groups" ? "default" : "outline"}>
          <Link href={`?section=groups`}>Groups</Link>
        </Button>
        <Button
          asChild
          variant={section === "departments" ? "default" : "outline"}
        >
          <Link href={`?section=departments`}>Departments</Link>
        </Button>
      </div>
      <MinistryManagement
        mode={section === "groups" ? "groups" : "departments"}
        title={sectionLabel}
        description={`Only ${sectionLabel.toLowerCase()} are loaded for the active section.`}
        result={result}
        ministryId={ministryId}
        termId={termId}
      />
    </div>
  );
}
