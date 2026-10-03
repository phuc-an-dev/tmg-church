"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserMinus, UsersRound } from "lucide-react";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import { StatusToast } from "@/components/ui/status-toast";
import {
  assignTermRoleAction,
  removeTermRoleAction,
} from "@/features/church/authorization-actions";
import { TERM_BOARD_ROLE_OPTIONS } from "../board-roles";
import type { TermDetailData } from "../types";
import {
  BOARD_ROLE_ICONS,
  TermBoardConfigButton,
} from "./term-board-config-button";

export function TermBoardView({
  termId,
  roles,
  members,
  assignments,
  closed,
}: {
  termId: string;
  roles: string[] | null;
  members: TermDetailData["members"];
  assignments: TermDetailData["termRoles"];
  closed: boolean;
}) {
  const router = useRouter();
  const [assigningRole, setAssigningRole] = React.useState<string | null>(null);
  const [removingRole, setRemovingRole] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const roleName = (role: string) =>
    TERM_BOARD_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    role;

  async function assign(selectedIds: string[]) {
    if (!assigningRole || selectedIds.length !== 1) return;
    setPending(true);
    setError(null);
    try {
      const result = await assignTermRoleAction({
        termId,
        role: assigningRole,
        memberProfileId: selectedIds[0],
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAssigningRole(null);
      setToast("Executive Board role assigned.");
      router.refresh();
    } catch {
      setError("Unable to assign this role.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!removingRole) return;
    setPending(true);
    setError(null);
    try {
      const result = await removeTermRoleAction({ termId, role: removingRole });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRemovingRole(null);
      setToast("Executive Board role unassigned.");
      router.refresh();
    } catch {
      setError("Unable to unassign this role.");
    } finally {
      setPending(false);
    }
  }

  const currentAssignee = assignments.find(
    (item) => item.role === assigningRole,
  );
  const assignableMembers = members
    .filter((member) => member.memberId !== currentAssignee?.memberId)
    .map((member) => ({
      id: member.memberId,
      name: member.memberName,
      gender: member.gender,
      subtitle: `/${member.memberSlug}`,
    }));

  return (
    <section className="space-y-4 pb-24">
      <TermBoardConfigButton
        termId={termId}
        roles={roles}
        closed={closed}
        occupied={assignments.length > 0}
      />
      {roles ? (
        <div className="space-y-3 md:space-y-0 md:overflow-hidden md:rounded-xl md:border">
          <ExpandableCoordinatorProvider>
            {TERM_BOARD_ROLE_OPTIONS.filter((option) =>
              roles?.includes(option.value),
            ).map((option) => {
              const assignment = assignments.find(
                (item) => item.role === option.value,
              );
              const Icon = BOARD_ROLE_ICONS[option.value];
              return (
                <ExpandableActionItem
                  key={option.value}
                  id={`board-${option.value}`}
                  name={option.label}
                  onEdit={
                    closed ? undefined : () => setAssigningRole(option.value)
                  }
                  editLabel={assignment ? "Replace" : "Assign"}
                  onDelete={
                    !closed && assignment
                      ? () => setRemovingRole(option.value)
                      : undefined
                  }
                  deleteLabel="Unassign"
                  deleteIcon={UserMinus}
                  className="p-4 md:border-b md:last:border-b-0"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      {assignment ? (
                        <Link
                          href={`/admin/members/${assignment.memberSlug}`}
                          className="flex min-h-11 min-w-0 flex-1 flex-col justify-center"
                        >
                          <span className="block font-semibold">
                            {option.label}
                          </span>
                          <span className="text-muted-foreground block truncate text-sm">
                            {assignment.memberName}
                          </span>
                        </Link>
                      ) : (
                        <span className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
                          <span className="block font-semibold">
                            {option.label}
                          </span>
                          <span className="text-muted-foreground block text-sm">
                            Vacant
                          </span>
                        </span>
                      )}
                    </div>
                    {!closed && <ExpandableActionItem.Trigger />}
                    {!closed && <ExpandableActionItem.DesktopActions />}
                  </div>
                  {!closed && <ExpandableActionItem.MobileActions />}
                </ExpandableActionItem>
              );
            })}
          </ExpandableCoordinatorProvider>
        </div>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="Executive Board is off"
          description={
            closed
              ? "No Executive Board was configured for this closed term."
              : "Turn on the Executive Board to choose roles and assign term members."
          }
        />
      )}

      <MemberAssignDrawer
        open={assigningRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAssigningRole(null);
            setError(null);
          }
        }}
        title={`${currentAssignee ? "Replace" : "Assign"} ${assigningRole ? roleName(assigningRole) : "role"}`}
        description="Choose a member enrolled in this ministry term."
        searchPlaceholder="Search term members..."
        members={assignableMembers}
        onAssign={assign}
        pending={pending}
        error={error}
        assignLabel={currentAssignee ? "Replace" : "Assign"}
        singleSelect
      />
      <ConfirmationSheet
        open={removingRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemovingRole(null);
            setError(null);
          }
        }}
        title="Unassign board role"
        description={`Remove the member from ${removingRole ? roleName(removingRole) : "this role"}?`}
        confirmLabel="Unassign"
        pending={pending}
        onConfirm={remove}
      >
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
      </ConfirmationSheet>
      {toast && (
        <StatusToast message={toast} onDismiss={() => setToast(null)} />
      )}
    </section>
  );
}
