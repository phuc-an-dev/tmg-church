import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SessionManagement } from "@/features/session/components/session-management";
import { getSessions, getSessionTerms } from "@/features/session/queries";
import { sessionSearchParamsCache } from "@/features/session/search-params";
export const metadata: Metadata = {
  title: "Sessions",
  description: "Manage ministry term sessions and attendance",
};
export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const p = await sessionSearchParamsCache.parse(searchParams);
  const [result, terms] = await Promise.all([
    getSessions({ ...p, page: Math.max(1, p.page) }),
    getSessionTerms(),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Sessions"
        description="Create one-off ministry term sessions and record attendance."
      />
      <SessionManagement result={result} terms={terms} />
    </div>
  );
}
