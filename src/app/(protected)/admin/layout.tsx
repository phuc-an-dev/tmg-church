import type { Metadata } from "next";
import { requireLeader } from "@/features/auth/queries";
import { getAdminChurchState } from "@/features/church/queries";
import { AdminHeader } from "@/components/admin/admin-header";
import { MobileAdminDock } from "@/components/admin/mobile-admin-dock";

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
  const auth = await requireLeader();
  const churchState = await getAdminChurchState();

  const activeChurch =
    churchState.status === "one"
      ? { name: churchState.church.name, slug: churchState.church.slug }
      : null;

  return (
    <div className="admin-canvas flex min-h-screen flex-col">
      <AdminHeader activeChurch={activeChurch} userEmail={auth.email} />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <MobileAdminDock />
    </div>
  );
}
