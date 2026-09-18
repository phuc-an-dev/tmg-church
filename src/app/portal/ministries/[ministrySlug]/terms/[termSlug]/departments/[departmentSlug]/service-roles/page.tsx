import { notFound } from "next/navigation";
import { getPortalDepartmentServices } from "@/features/portal/department-service-queries";
import { PortalDepartmentServiceView } from "@/features/portal/department-service-view";

export default async function PortalDepartmentServiceRolesPage({
  params,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    departmentSlug: string;
  }>;
}) {
  const { ministrySlug, termSlug, departmentSlug } = await params;
  const data = await getPortalDepartmentServices(
    ministrySlug,
    termSlug,
    departmentSlug,
  );
  if (!data) notFound();
  return <PortalDepartmentServiceView data={data} />;
}
