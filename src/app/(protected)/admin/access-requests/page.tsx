import type { Metadata } from "next";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAccessRequests } from "@/features/access/queries";
import { AccessRequestList } from "@/features/access/access-request-list";
export const metadata: Metadata = { title: "Access requests" };
export default async function AccessRequestsPage() {
  const data = await getAccessRequests();
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Access requests"
        description="Review verified registrations and link member profiles."
      />
      <AccessRequestList {...data} />
    </AdminPageContainer>
  );
}
