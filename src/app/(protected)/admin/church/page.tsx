import type { Metadata } from "next";
import { requireLeader } from "@/features/auth/queries";
import { getAdminChurchState } from "@/features/church/queries";
import { ChurchManagement } from "@/features/church/components/church-management";

export const metadata: Metadata = {
  title: "Church Settings",
  description: "Manage church configuration and operational details",
};

export default async function AdminChurchPage() {
  await requireLeader();
  const churchState = await getAdminChurchState();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ChurchManagement initialState={churchState} />
    </div>
  );
}
