import { Suspense } from "react";
import type { Metadata } from "next";
import { requirePortalContext } from "@/features/auth/queries";
import { PortalHeader } from "@/components/portal/portal-header";
import { PortalHeaderSkeleton } from "@/components/portal/portal-header-skeleton";

export const metadata: Metadata = {
  title: {
    default: "Portal | TMG Church",
    template: "%s | TMG Church Portal",
  },
  description: "Scoped ministry, department, and group operations",
};

async function AuthorizedPortalHeader() {
  const context = await requirePortalContext();
  return <PortalHeader email={context.email} />;
}

export default function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-canvas flex min-h-screen flex-col">
      <Suspense fallback={<PortalHeaderSkeleton />}>
        <AuthorizedPortalHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
    </div>
  );
}
