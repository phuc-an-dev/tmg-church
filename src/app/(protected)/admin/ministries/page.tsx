import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { getMinistries } from "@/features/ministry/queries";
import {
  ministrySearchParamsCache,
  safePageSize,
} from "@/features/ministry/search-params";

export const metadata: Metadata = {
  title: "Ministries",
  description: "Manage ministry structure",
};
export default async function MinistriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await ministrySearchParamsCache.parse(searchParams);
  const result = await getMinistries({
    ...params,
    page: Math.max(1, params.page),
    pageSize: safePageSize(params.pageSize),
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Ministries"
        description="Create and organize ministry records for the active church."
      />
      <MinistryManagement
        mode="ministries"
        title="Ministries"
        description="Search, sort, and manage the ministry structure."
        result={result}
      />
    </div>
  );
}
