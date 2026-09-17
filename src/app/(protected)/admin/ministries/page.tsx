import type { Metadata } from "next";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MinistryManagement } from "@/features/ministry/components/ministry-management";
import { getMinistries } from "@/features/ministry/queries";
import { getFrequentIcons } from "@/features/icon/queries";
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
  const [result, frequentIcons] = await Promise.all([
    getMinistries({
      ...params,
      page: Math.max(1, params.page),
      pageSize: safePageSize(params.pageSize),
    }),
    getFrequentIcons(),
  ]);
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Ministries"
        description="Create and organize ministry records for the active church."
      />
      <MinistryManagement
        mode="ministries"
        title="Ministries"
        description="Search, sort, and manage the ministry structure."
        result={result}
        frequentIcons={frequentIcons}
      />
    </AdminPageContainer>
  );
}
