import type { Metadata } from "next";
import { requirePortalContext } from "@/features/auth/queries";
import { PortalHeader } from "@/components/portal/portal-header";

export const metadata: Metadata = {
  title: {
    default: "Portal | TMG Church",
    template: "%s | TMG Church Portal",
  },
  description: "Scoped ministry, department, and group operations",
};

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await requirePortalContext();
  return (
    <div className="admin-canvas flex min-h-screen flex-col">
      <PortalHeader email={context.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
