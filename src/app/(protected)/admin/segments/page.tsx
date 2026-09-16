import type { Metadata } from "next";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SegmentManagement } from "@/features/segment/components/segment-management";
import { getSegments } from "@/features/segment/queries";
export const metadata: Metadata = { title: "Member Segments" };
export default async function SegmentsPage() {
  const segments = await getSegments();
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Segments"
        description="Organize TMG Church members into flexible groups."
      />
      <SegmentManagement segments={segments} />
    </AdminPageContainer>
  );
}
