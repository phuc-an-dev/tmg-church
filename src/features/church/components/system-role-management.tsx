"use client";

import * as React from "react";
import { ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import { setSystemAdminAction } from "../authorization-actions";
import type { SystemRoleCandidate } from "../authorization-queries";

interface SystemRoleManagementProps {
  churchId: string;
  candidates: SystemRoleCandidate[];
  actorRole: string;
}

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

  return (
    <Card className="admin-panel">
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xl">System roles</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Only the Master Admin can add or remove Church Admin access.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        {!canManage && (
          <p className="text-muted-foreground text-sm leading-6">
            You can administer Church data, but system role changes require the
            Master Admin.
          </p>
        )}
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
        <div className="space-y-2">
          {candidates.map((candidate) => {
            const isPending = pendingUserId === candidate.userId;
            const isMaster = candidate.role === "master_admin";
            return (
              <div
                key={candidate.userId}
                className="bg-background flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {candidate.fullName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {candidate.email ?? "No email recorded"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs font-medium tracking-wide uppercase">
                    {candidate.role?.replace("_", " ") ?? "No system role"}
                  </p>
                </div>
                {isMaster ? (
                  <span className="text-muted-foreground text-xs">
                    Protected Master Admin
                  </span>
                ) : candidate.role === "admin" ? (
                  <DestructiveActionButton
                    className="w-full sm:w-auto"
                    label="Remove Admin"
                    icon={UserMinus}
                    disabled={!canManage || isPending}
                    onClick={() => updateRole(candidate, false)}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full gap-2 sm:w-auto"
                    disabled={!canManage || isPending}
                    onClick={() => updateRole(candidate, true)}
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    Add Admin
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
