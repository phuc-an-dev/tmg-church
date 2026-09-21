import type { Metadata } from "next";
import { requireSystemAdmin } from "@/features/auth/queries";
import { getAdminChurchState } from "@/features/church/queries";
import { AdminHeader } from "@/components/admin/admin-header";

export const metadata: Metadata = {
  title: {
    default: "Overview | TMG Church",
    template: "%s | TMG Church",
  },
  description: "TMG Church internal administration dashboard",
};

interface ProtectedAdminLayoutProps {
  children: React.ReactNode;
}

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const auth = await requireSystemAdmin();
  const churchState = await getAdminChurchState();

  const activeChurch =
    churchState.status === "one"
      ? { name: churchState.church.name, slug: churchState.church.slug }
      : null;

  const isMasterAdmin = auth.systemRole.role === "master_admin";

  return (
    <div className="admin-canvas flex min-h-screen flex-col">
      <AdminHeader
        activeChurch={activeChurch}
        userEmail={auth.email}
        isMasterAdmin={isMasterAdmin}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
