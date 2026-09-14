import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SegmentDetailManagement } from "@/features/segment/components/segment-management";
import { getSegmentDetail } from "@/features/segment/queries";
export const metadata: Metadata = { title: "Segment Details" };
export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ segmentSlug: string }>;
}) {
  const { segmentSlug } = await params;
  const segment = await getSegmentDetail(segmentSlug);
  if (!segment) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title={segment.name}
        description="Add matching active members by condition."
        backLink={{ href: "/admin/segments", label: "Segments" }}
      />
      <SegmentDetailManagement segment={segment} />
    </div>
  );
}
