import type { Metadata } from "next";
import { requireLeader } from "@/features/auth/queries";
import { getAdminChurchState } from "@/features/church/queries";
import { ChurchManagement } from "@/features/church/components/church-management";

export const metadata: Metadata = {
  title: "Church Settings",
  description: "Manage church configuration and operational details",
};

interface AdminChurchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminChurchPage({
  searchParams,
}: AdminChurchPageProps) {
  await requireLeader();
  const [churchState, params] = await Promise.all([
    getAdminChurchState(),
    searchParams,
  ]);
  const initialSuccessMessage =
    params.status === "deleted" ? "Church deleted successfully." : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ChurchManagement
        initialState={churchState}
        initialSuccessMessage={initialSuccessMessage}
      />
    </div>
  );
}
