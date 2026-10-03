import type { Metadata } from "next";
import { Info } from "lucide-react";
import { requireSystemAdmin } from "@/features/auth/queries";
import { getAdminChurchState } from "@/features/church/queries";
import { getSystemRoleCandidates } from "@/features/church/authorization-queries";
import { SystemRoleManagement } from "@/features/church/components/system-role-management";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata: Metadata = {
  title: "System Roles",
  description: "Manage Church Admin access",
};

export default async function SystemRolesPage() {
  const auth = await requireSystemAdmin();
  const churchState = await getAdminChurchState();
  const isMasterAdmin = auth.systemRole.role === "master_admin";

  if (!isMasterAdmin || churchState.status !== "one") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="System Roles"
          description="Only the Master Admin can manage system roles."
          backLink={{ href: "/admin", label: "Overview" }}
        />
        <div className="admin-panel mt-6 flex items-start gap-3 p-4 sm:p-6">
          <Info
            className="text-primary mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-sm leading-6">
            {!isMasterAdmin
              ? "System role changes require the Master Admin."
              : churchState.status === "zero"
                ? "Create a church profile before managing system roles."
                : "Resolve the multiple-church configuration before managing system roles."}
          </p>
        </div>
      </div>
    );
  }

  const systemRoleCandidates = await getSystemRoleCandidates(
    churchState.church.id,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="System Roles"
        description="Grant or remove Church Admin access."
        backLink={{ href: "/admin", label: "Overview" }}
      />
      <div className="mt-6">
        <SystemRoleManagement
          churchId={churchState.church.id}
          candidates={systemRoleCandidates}
          actorRole={auth.systemRole.role}
        />
      </div>
    </div>
  );
}
