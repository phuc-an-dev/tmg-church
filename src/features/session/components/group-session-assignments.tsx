"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Ellipsis,
  Music,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "cn";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import { ExpandableCardPanel } from "@/components/shared/expandable-card-panel";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import {
  OptionPickerSheet,
  type OptionPickerItem,
} from "@/components/shared/option-picker-sheet";
import { StatusToast } from "@/components/ui/status-toast";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  ListTable,
  ListTableHeader,
  ListTableBody,
} from "@/components/shared/list-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  removeGroupSessionAssignmentAction,
  saveGroupSessionAssignmentAction,
} from "../actions";
import type {
  SessionGroupAssignment,
  SessionGroupAssignmentRole,
  SessionServiceAssignmentData,
} from "../types";

const GROUP_ROLES: Array<{
  role: SessionGroupAssignmentRole;
  label: string;
  icon: typeof Music;
}> = [
  { role: "worship_guide", label: "Worship guide", icon: Music },
  { role: "lesson_guide", label: "Lesson guide", icon: BookOpen },
];

export function GroupSessionAssignments({
  assignmentData,
  returnUrl,
}: {
  assignmentData: SessionServiceAssignmentData;
  returnUrl?: string;
}) {
  const router = useRouter();
  const { session, groupMembers = [], groupAssignments = [] } = assignmentData;

  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [pickerRole, setPickerRole] =
    React.useState<SessionGroupAssignmentRole | null>(null);
  const [removing, setRemoving] = React.useState<SessionGroupAssignment | null>(
    null,
  );
  const [expandedRole, setExpandedRole] =
    React.useState<SessionGroupAssignmentRole | null>(null);

  const assignmentByRole = new Map(groupAssignments.map((a) => [a.role, a]));

  const memberOptions: OptionPickerItem<string | null>[] = React.useMemo(
    () => [
      { value: null, label: "No one" },
      ...groupMembers.map((m) => ({
        value: m.membershipId,
        label: (
          <div className="flex items-center gap-3">
            <MemberAvatar gender={m.gender} size="sm" />
            <span>{m.memberName}</span>
          </div>
        ),
      })),
    ],
    [groupMembers],
  );

  async function handlePick(value: string | null) {
    if (!pickerRole) return;
    const current = assignmentByRole.get(pickerRole);

    if (!value) {
      if (current) setRemoving(current);
      return;
    }
    if (current?.ministryMembershipId === value) return;

    setPending(true);
    const result = await saveGroupSessionAssignmentAction({
      sessionId: session.id,
      role: pickerRole,
      membershipId: value,
    });
    setPending(false);

    if (!result.success) {
      setFeedback(result.error ?? "Unable to save assignment.");
      return;
    }
    setFeedback(result.message ?? "Assignment saved.");
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) return;
    setPending(true);
    const result = await removeGroupSessionAssignmentAction({
      sessionId: session.id,
      assignmentId: removing.id,
    });
    setPending(false);

    if (!result.success) {
      setFeedback(result.error ?? "Unable to remove assignment.");
      setRemoving(null);
      return;
    }
    setFeedback(result.message ?? "Assignment removed.");
    setRemoving(null);
    router.refresh();
  }

  const isSafeReturnUrl = Boolean(
    returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//"),
  );
  const backHref = isSafeReturnUrl && returnUrl ? returnUrl : "/admin/sessions";
  const backLabel = isSafeReturnUrl ? "Back" : "Sessions";

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader
        title={session.title}
        description={`${session.ministryName} · ${session.termName} · ${session.scopeLabel} · ${session.sessionDate}`}
        backLink={{
          href: backHref,
          label: backLabel,
        }}
      />

      <NavigationTabs aria-label="Session views">
        <NavigationTabLink
          href={`/admin/sessions/${session.slug}${isSafeReturnUrl && returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
          active={false}
        >
          Attendance
        </NavigationTabLink>
        <NavigationTabLink
          href={`/admin/sessions/${session.slug}?tab=assignments${isSafeReturnUrl && returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
          active={true}
        >
          Service Assignments
        </NavigationTabLink>
      </NavigationTabs>

      {groupMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members in this group"
          description="Assign members to this group in the Term Structure to start assigning guides for this session."
          action={
            assignmentData.ministrySlug && assignmentData.termSlug ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link
                  href={`/admin/ministries/${assignmentData.ministrySlug}/terms/${assignmentData.termSlug}?section=groups`}
                >
                  Open Term Structure
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListTable label="Group session guides">
          <ListTableHeader gridClassName="md:grid-cols-[1fr_200px_100px]">
            <div role="columnheader">Guide</div>
            <div role="columnheader">Role</div>
            <div role="columnheader" className="text-right">
              Actions
            </div>
          </ListTableHeader>
          <ListTableBody>
            {GROUP_ROLES.map(({ role, label, icon: Icon }) => {
              const assigned = assignmentByRole.get(role);
              const isExpanded = expandedRole === role;
              return (
                <div
                  key={role}
                  role="row"
                  className="border-border/80 bg-muted/40 overflow-hidden rounded-2xl border shadow-xs md:grid md:grid-cols-[1fr_200px_100px] md:items-center md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-3 md:shadow-none"
                >
                  <div
                    role="cell"
                    className="bg-card border-border/80 min-w-0 rounded-b-xl border-b p-4 md:rounded-none md:border-0 md:bg-transparent md:p-0"
                  >
                    <div className="flex items-center justify-between gap-3 md:justify-start">
                      <button
                        type="button"
                        onClick={() => setPickerRole(role)}
                        className="group/item flex min-w-0 flex-1 items-center gap-3 text-left outline-hidden"
                      >
                        <MemberAvatar
                          gender={assigned?.gender}
                          className={!assigned ? "opacity-40" : undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-base font-semibold md:text-sm",
                              assigned
                                ? "text-foreground group-hover/item:text-primary transition-colors"
                                : "text-muted-foreground font-normal italic",
                            )}
                          >
                            {assigned
                              ? assigned.memberName
                              : "Not assigned yet"}
                          </span>
                          <p className="text-muted-foreground mt-0.5 text-xs md:hidden">
                            {assigned
                              ? "Assigned for this session"
                              : "Position vacant"}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center md:hidden">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "min-h-11 min-w-11 rounded-xl p-0",
                            isExpanded && "bg-muted text-foreground",
                          )}
                          aria-label={`Actions for ${label}`}
                          aria-expanded={isExpanded}
                          aria-controls={`group-session-role-actions-${role}`}
                          onClick={() =>
                            setExpandedRole((prev) =>
                              prev === role ? null : role,
                            )
                          }
                        >
                          <Ellipsis className="size-5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <ExpandableCardPanel
                      open={isExpanded}
                      id={`group-session-role-actions-${role}`}
                      label={`Actions for ${label}`}
                      className="md:hidden"
                    >
                      <div
                        className={cn(
                          "grid gap-2",
                          assigned ? "grid-cols-2" : "grid-cols-1",
                        )}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="border-border/80 bg-background hover:bg-muted/80 text-foreground min-h-11 w-full gap-2 text-sm font-semibold shadow-xs"
                          onClick={() => {
                            setExpandedRole(null);
                            setPickerRole(role);
                          }}
                        >
                          {assigned ? (
                            <>
                              <Pencil className="size-4" aria-hidden="true" />
                              <span>Change Guide</span>
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" aria-hidden="true" />
                              <span>Assign {label}</span>
                            </>
                          )}
                        </Button>
                        {assigned && (
                          <DestructiveActionButton
                            type="button"
                            className="min-h-11 w-full"
                            onClick={() => {
                              setExpandedRole(null);
                              setRemoving(assigned);
                            }}
                            label="Remove"
                            icon={Trash2}
                          />
                        )}
                      </div>
                    </ExpandableCardPanel>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-center gap-1.5 px-4 py-1.5 text-center text-xs font-medium md:hidden">
                    <Icon className="size-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </div>
                  <div
                    role="cell"
                    className="hidden text-sm md:flex md:items-center md:gap-2"
                  >
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-foreground font-medium">{label}</span>
                  </div>
                  <div role="cell" className="hidden justify-end md:flex">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 min-h-9 min-w-9"
                          aria-label={`Actions for ${label}`}
                        >
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPickerRole(role)}>
                          {assigned ? (
                            <>
                              <Pencil className="mr-2 size-4" />
                              <span>Change Guide</span>
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 size-4" />
                              <span>Assign {label}</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        {assigned && (
                          <DropdownMenuItem
                            onClick={() => setRemoving(assigned)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            <span>Remove Assignment</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </ListTableBody>
        </ListTable>
      )}

      <OptionPickerSheet
        open={Boolean(pickerRole)}
        onOpenChange={(open) => !open && setPickerRole(null)}
        title={
          pickerRole
            ? (GROUP_ROLES.find((r) => r.role === pickerRole)?.label ??
              "Assign guide")
            : "Assign guide"
        }
        description="Select one member for this session."
        options={memberOptions}
        value={
          pickerRole
            ? (assignmentByRole.get(pickerRole)?.ministryMembershipId ?? null)
            : null
        }
        onChange={handlePick}
      />

      <ConfirmationSheet
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.memberName}?`}
        description={`Remove ${removing?.memberName} from ${
          GROUP_ROLES.find((r) => r.role === removing?.role)?.label ??
          "this role"
        } for this session?`}
        confirmLabel="Remove assignment"
        pending={pending}
        pendingLabel="Removing..."
        variant="destructive"
        onConfirm={handleRemove}
      />

      {feedback && (
        <StatusToast message={feedback} onDismiss={() => setFeedback(null)} />
      )}
    </div>
  );
}
