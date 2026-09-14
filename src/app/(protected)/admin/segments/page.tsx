import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SegmentManagement } from "@/features/segment/components/segment-management";
import { getSegments } from "@/features/segment/queries";
export const metadata: Metadata = { title: "Member Segments" };
export default async function SegmentsPage() {
  const segments = await getSegments();
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Segments"
        description="Organize TMG Church members into flexible groups."
      />
      <SegmentManagement segments={segments} />
    </div>
  );
}
