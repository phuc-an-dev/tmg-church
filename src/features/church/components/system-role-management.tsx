"use client";

import * as React from "react";
import { ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { setSystemAdminAction } from "../authorization-actions";
import type { SystemRoleCandidate } from "../authorization-queries";

interface SystemRoleManagementProps {
  churchId: string;
  candidates: SystemRoleCandidate[];
  actorRole: string;
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  master_admin: "border-primary/20 bg-primary/10 text-primary",
  admin:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const ROLE_LABELS: Record<string, string> = {
  master_admin: "Master Admin",
  admin: "Admin",
};

export function SystemRoleManagement({
  churchId,
  candidates,
  actorRole,
}: SystemRoleManagementProps) {
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const canManage = actorRole === "master_admin";

  const updateRole = (candidate: SystemRoleCandidate, enabled: boolean) => {
    setPendingUserId(candidate.userId);
    setMessage(null);
    void setSystemAdminAction({
      churchId,
      userId: candidate.userId,
      enabled,
    }).then((result) => {
      setPendingUserId(null);
      setMessage(result.success ? "System role updated." : result.error);
      if (result.success) window.location.reload();
    });
  };

  if (!candidates.length) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No portal users yet"
        description="Members appear here once they accept a portal access invitation."
      />
    );
  }

  const disabledReason = canManage
    ? undefined
    : "Only the Master Admin can change system roles.";

  return (
    <div className="space-y-3">
      {!canManage && (
        <p className="text-muted-foreground text-sm leading-6">
          You can administer Church data, but system role changes require the
          Master Admin.
        </p>
      )}
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
      <ExpandableCoordinatorProvider resetKey={String(pendingUserId)}>
        <div className="space-y-3 md:space-y-0 md:overflow-hidden md:rounded-xl md:border">
          {candidates.map((candidate) => {
            const isMaster = candidate.role === "master_admin";
            const isAdmin = candidate.role === "admin";
            const pending = pendingUserId === candidate.userId;
            const roleLabel = candidate.role
              ? (ROLE_LABELS[candidate.role] ?? candidate.role)
              : "No system role";
            const badgeStyle = candidate.role
              ? ROLE_BADGE_STYLES[candidate.role]
              : undefined;

            const identityCell = (
              <div className="flex min-w-0 items-center gap-3">
                <MemberAvatar gender={candidate.gender} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {candidate.fullName}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {candidate.email ?? "No email recorded"}
                  </span>
                </span>
              </div>
            );

            const roleCell = (
              <div className="hidden md:block">
                {badgeStyle ? (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyle}`}
                  >
                    {roleLabel}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {roleLabel}
                  </span>
                )}
              </div>
            );

            if (isMaster || !canManage) {
              return (
                <div
                  key={candidate.userId}
                  role="row"
                  className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] md:grid md:grid-cols-[1fr_140px_44px] md:items-center md:gap-4 md:rounded-none md:border-0 md:border-b md:p-3 md:shadow-none md:last:border-b-0"
                >
                  {identityCell}
                  {roleCell}
                  <div className="text-muted-foreground hidden text-right text-xs md:block">
                    {isMaster ? "Protected" : undefined}
                  </div>
                </div>
              );
            }

            return (
              <ExpandableActionItem
                key={candidate.userId}
                id={`system-role-${candidate.userId}`}
                name={candidate.fullName}
                onAdditionalAction={
                  isAdmin ? undefined : () => updateRole(candidate, true)
                }
                additionalActionLabel="Add Admin"
                additionalActionSectionLabel="System role"
                additionalActionIcon={UserPlus}
                onDelete={
                  isAdmin ? () => updateRole(candidate, false) : undefined
                }
                deleteLabel="Remove Admin"
                deleteIcon={UserMinus}
                deleteDisabled={Boolean(disabledReason) || pending}
                deleteDisabledReason={disabledReason}
                className="p-4 md:grid md:grid-cols-[1fr_140px_44px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {identityCell}
                  <ExpandableActionItem.Trigger className="md:hidden" />
                </div>
                <ExpandableActionItem.MobileActions />
                {roleCell}
                <div className="hidden justify-end md:flex">
                  <ExpandableActionItem.DesktopActions />
                </div>
              </ExpandableActionItem>
            );
          })}
        </div>
      </ExpandableCoordinatorProvider>
    </div>
  );
}
