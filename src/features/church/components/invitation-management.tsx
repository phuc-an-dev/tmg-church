"use client";

import * as React from "react";
import { MailPlus, ShieldCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import {
  createMemberInvitationAction,
  revokeMemberInvitationAction,
} from "@/features/auth/invitation-actions";
import type {
  InvitationCandidate,
  InvitationStatus,
} from "../authorization-queries";

interface InvitationManagementProps {
  churchId: string;
  candidates: InvitationCandidate[];
  statuses: InvitationStatus[];
  actorRole: string;
}

function getStatus(invitation: InvitationStatus | undefined): string {
  if (!invitation) return "Not invited";
  if (invitation.consumedAt) return "Activated";
  if (invitation.revokedAt) return "Revoked";
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) return "Expired";
  return "Pending";
}

function getLatestStatus(
  statuses: InvitationStatus[],
  memberProfileId: string,
): InvitationStatus | undefined {
  return statuses.find((status) => status.memberProfileId === memberProfileId);
}

export function InvitationManagement({
  churchId,
  candidates,
  statuses,
  actorRole,
}: InvitationManagementProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const canManage = actorRole === "master_admin" || actorRole === "admin";

  const runAction = async (
    memberProfileId: string,
    action: "send" | "revoke",
    invitationId?: string,
  ) => {
    setPendingId(memberProfileId);
    setMessage(null);
    const result =
      action === "send"
        ? await createMemberInvitationAction({ churchId, memberProfileId })
        : await revokeMemberInvitationAction({
            churchId,
            invitationId: invitationId ?? "",
          });
    setPendingId(null);
    setMessage(
      result.success ? (result.message ?? "Invitation updated.") : result.error,
    );
    if (result.success) window.location.reload();
  };

  return (
    <Card className="admin-panel">
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xl">Member invitations</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Send a one-time account activation link to an existing member
              email.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
        <div className="space-y-2">
          {candidates.map((candidate) => {
            const latest = getLatestStatus(statuses, candidate.memberProfileId);
            const status = getStatus(latest);
            const pending = pendingId === candidate.memberProfileId;
            const canRevoke = latest && status === "Pending";
            return (
              <div
                key={candidate.memberProfileId}
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
                    {status}
                  </p>
                </div>
                {candidate.email && canManage ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {canRevoke && latest ? (
                      <DestructiveActionButton
                        className="w-full sm:w-auto"
                        label="Revoke invitation"
                        icon={UserMinus}
                        disabled={pending}
                        onClick={() =>
                          runAction(
                            candidate.memberProfileId,
                            "revoke",
                            latest.id,
                          )
                        }
                      />
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full gap-2 sm:w-auto"
                      disabled={pending}
                      onClick={() =>
                        runAction(candidate.memberProfileId, "send")
                      }
                    >
                      <MailPlus className="size-4" aria-hidden="true" />
                      <span>
                        {status === "Pending" ? "Resend" : "Send invitation"}
                      </span>
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
