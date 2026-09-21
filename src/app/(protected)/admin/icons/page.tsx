import type { Metadata } from "next";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { IconManagement } from "@/features/icon/components/icon-management";
import { getFrequentIcons } from "@/features/icon/queries";

export const metadata: Metadata = {
  title: "Icons",
  description:
    "Frequently used icon management and catalog search for TMG Church administration.",
};

export default async function AdminIconsPage() {
  const frequentIcons = await getFrequentIcons();

  return (
    <AdminPageContainer>
      <AdminPageHeader title="Icon Management" />
      <IconManagement frequentIcons={frequentIcons} />
    </AdminPageContainer>
  );
}
