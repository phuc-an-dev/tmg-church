"use client";

import * as React from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import {
  assignTermRoleAction,
  removeTermRoleAction,
} from "@/features/church/authorization-actions";
import type { TermDetailMember, TermRoleAssignment } from "../types";

const ROLE_LABELS: Record<string, string> = {
  ministry_head: "Ministry Head",
  secretary: "Secretary",
  treasurer: "Treasurer",
  social_support_commissioner: "Social Support Commissioner",
  small_groups_commissioner: "Small Groups Commissioner",
  pastoral_commissioner: "Pastoral Commissioner",
  music_commissioner: "Music Commissioner",
  worship_commissioner: "Worship Commissioner",
  visitation_care_commissioner: "Visitation Care Commissioner",
  evangelism_commissioner: "Evangelism Commissioner",
};

const ROLE_CODES = Object.keys(ROLE_LABELS);

export function TermRoleManagement({
  termId,
  members,
  assignments,
}: {
  termId: string;
  members: TermDetailMember[];
  assignments: TermRoleAssignment[];
}) {
  const [activeRole, setActiveRole] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const assignmentByRole = new Map(
    assignments.map((assignment) => [assignment.role, assignment]),
  );

  async function assign(role: string, memberId: string) {
    setPending(true);
    setMessage(null);
    const result = await assignTermRoleAction({
      termId,
      memberProfileId: memberId,
      role,
    });
    setPending(false);
    setMessage(result.success ? "Ministry role assigned." : result.error);
    if (result.success) window.location.reload();
  }

  async function remove(role: string) {
    setPending(true);
    setMessage(null);
    const result = await removeTermRoleAction({ termId, role });
    setPending(false);
    setMessage(result.success ? "Ministry role removed." : result.error);
    if (result.success) window.location.reload();
  }

  return (
    <section className="admin-panel mb-5 space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">Ministry roles</h2>
        <p className="text-muted-foreground text-sm leading-6">
          Master Admin and Admin users can manage one seat per role while the
          term is open.
        </p>
      </div>
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
      <div className="space-y-2">
        {ROLE_CODES.map((role) => {
          const assignment = assignmentByRole.get(role);
          const isActive = activeRole === role;
          return (
            <div key={role} className="bg-background rounded-xl border p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{ROLE_LABELS[role]}</p>
                  <p className="text-muted-foreground text-xs">
                    {assignment?.memberName ?? "Unassigned"}
                  </p>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 gap-2"
                    disabled={pending}
                    onClick={() => setActiveRole(isActive ? null : role)}
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    {assignment ? "Reassign" : "Assign"}
                  </Button>
                  {assignment && (
                    <DestructiveActionButton
                      className="min-h-11 w-auto"
                      label="Remove"
                      icon={UserMinus}
                      disabled={pending}
                      onClick={() => void remove(role)}
                    />
                  )}
                </div>
              </div>
              {isActive && (
                <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2">
                  {members.map((member) => (
                    <Button
                      key={member.memberId}
                      type="button"
                      variant="ghost"
                      className="min-h-11 justify-start border text-left"
                      disabled={
                        pending || assignment?.memberId === member.memberId
                      }
                      onClick={() => void assign(role, member.memberId)}
                    >
                      {member.memberName}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
