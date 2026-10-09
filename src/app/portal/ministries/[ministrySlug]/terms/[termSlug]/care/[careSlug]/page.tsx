import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getCareDetail } from "@/features/care/queries";
import { CareDetail } from "@/features/care/components/care-detail";

export default async function CareDetailPage({
  params,
}: {
  params: Promise<{ ministrySlug: string; termSlug: string; careSlug: string }>;
}) {
  const { ministrySlug, termSlug, careSlug } = await params;
  const detail = await getCareDetail(ministrySlug, termSlug, careSlug);
  if (!detail) notFound();
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Follow-up"
        backLink={{
          href: `/portal/ministries/${ministrySlug}/terms/${termSlug}/care`,
          label: "Care",
        }}
      />
      <CareDetail key={detail.case.id} initialDetail={detail} />
    </div>
  );
}
