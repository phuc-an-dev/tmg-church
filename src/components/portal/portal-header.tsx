import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { PortalSidebar } from "./portal-sidebar";
import { getPortalDashboardData } from "@/features/portal/portal-dashboard-queries";

import { getCareScopes } from "@/features/care/queries";

interface PortalHeaderProps {
  email: string;
}

export async function PortalHeader({ email }: PortalHeaderProps) {
  const [data, careScopes] = await Promise.all([
    getPortalDashboardData(),
    getCareScopes(),
  ]);
  return (
    <header className="border-border/80 bg-card sticky top-0 z-40 border-b">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/portal"
          className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <BrandLockup name="TMG Church" subtitle="Portal" />
        </Link>
        <PortalSidebar
          email={email}
          canAccessCare={careScopes.length > 0}
          workspaces={data.workspaces}
          memberMode={data.memberMode}
          todoCount={
            data.memberMode
              ? data.sessions.filter(
                  (session) => (session.myRoles?.length ?? 0) > 0,
                ).length
              : data.readiness.departments.reduce(
                  (count, department) => count + department.issues.length,
                  0,
                )
          }
        />
      </div>
    </header>
  );
}
