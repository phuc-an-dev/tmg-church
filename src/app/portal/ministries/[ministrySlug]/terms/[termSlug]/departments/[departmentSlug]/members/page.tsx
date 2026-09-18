import { notFound } from "next/navigation";
import { getPortalDepartmentMembers } from "@/features/portal/department-member-queries";
import { PortalDepartmentMemberView } from "@/features/portal/department-member-view";

export default async function PortalDepartmentMembersPage({
  params,
}: {
  params: Promise<{
    ministrySlug: string;
    termSlug: string;
    departmentSlug: string;
  }>;
}) {
  const { ministrySlug, termSlug, departmentSlug } = await params;
  const data = await getPortalDepartmentMembers(
    ministrySlug,
    termSlug,
    departmentSlug,
  );
  if (!data) notFound();
  return (
    <PortalDepartmentMemberView
      department={data.department}
      members={data.members}
    />
  );
}
