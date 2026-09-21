import type { Metadata } from "next";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSeedStepCards } from "@/components/admin/admin-seed-step-cards";

export const metadata: Metadata = {
  title: "Overview",
  description: "TMG Church administration overview",
};

export default function AdminOverviewPage() {
  return (
    <AdminPageContainer>
      <div className="space-y-6 pb-24">
        <AdminPageHeader
          title="Administration overview"
          description="Use this order to seed your Church data before testing each operational role."
        />

        <AdminSeedStepCards />
      </div>
    </AdminPageContainer>
  );
}
