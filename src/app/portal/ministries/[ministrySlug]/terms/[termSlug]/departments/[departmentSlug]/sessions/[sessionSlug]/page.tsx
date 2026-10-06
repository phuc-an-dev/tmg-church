import { notFound } from "next/navigation";
import { isUuid } from "@/lib/slug";
import { getPortalDepartmentSessionDetail } from "@/features/portal/department-session-queries";
import { PortalDepartmentSessionDetailView } from "@/features/portal/department-session-detail-view";

export const metadata = { title: "Department Session" };

export default async function PortalDepartmentSessionDetailPage({
  params,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    departmentSlug: string;
    sessionSlug: string;
  }>;
}) {
  const { ministrySlug, termSlug, departmentSlug, sessionSlug } = await params;
  if (
    isUuid(ministrySlug) ||
    isUuid(termSlug) ||
    isUuid(departmentSlug) ||
    isUuid(sessionSlug)
  ) {
    notFound();
  }
  const session = await getPortalDepartmentSessionDetail(
    ministrySlug,
    termSlug,
    departmentSlug,
    sessionSlug,
  );
  if (!session) notFound();
  return (
    <PortalDepartmentSessionDetailView
      session={session}
      canManage
      backPath={`/portal/ministries/${ministrySlug}/terms/${termSlug}/departments/${departmentSlug}?section=sessions`}
    />
  );
}
