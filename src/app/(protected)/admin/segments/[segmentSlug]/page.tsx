import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
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
    <AdminPageContainer size="narrow">
      <AdminPageHeader
        title={segment.name}
        description="Add matching active members by condition."
        backLink={{ href: "/admin/segments", label: "Segments" }}
      />
      <SegmentDetailManagement segment={segment} />
    </AdminPageContainer>
  );
}
