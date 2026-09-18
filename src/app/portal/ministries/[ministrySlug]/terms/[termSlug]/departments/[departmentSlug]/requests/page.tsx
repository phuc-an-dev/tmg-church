import { notFound } from "next/navigation";
import { getPortalDepartmentRequests } from "@/features/portal/department-request-queries";
import { PortalDepartmentRequestView } from "@/features/portal/department-request-view";

export default async function PortalDepartmentRequestsPage({
  params,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    departmentSlug: string;
  }>;
}) {
  const { ministrySlug, termSlug, departmentSlug } = await params;
  const data = await getPortalDepartmentRequests(
    ministrySlug,
    termSlug,
    departmentSlug,
  );
  if (!data) notFound();
  return (
    <PortalDepartmentRequestView
      department={data.department}
      requests={data.requests}
      canManage={data.canManage}
      memberProfileId={data.memberProfileId}
    />
  );
}
