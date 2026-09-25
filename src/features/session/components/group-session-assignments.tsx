"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Music, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
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
}: {
  assignmentData: SessionServiceAssignmentData;
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

  const assignmentByRole = new Map(groupAssignments.map((a) => [a.role, a]));

  const memberOptions: OptionPickerItem<string | null>[] = React.useMemo(
    () => [
      { value: null, label: "No one" },
      ...groupMembers.map((m) => ({
        value: m.membershipId,
        label: m.memberName,
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

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="size-11 shrink-0 p-0"
            aria-label="Back to sessions list"
          >
            <Link href="/admin/sessions">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="text-foreground truncate text-xl font-bold tracking-tight sm:text-2xl">
              {session.title}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {session.ministryName} · {session.termName} ·{" "}
              {session.sessionDate}
            </p>
          </div>
        </div>
      </header>

      <NavigationTabs aria-label="Session views">
        <NavigationTabLink
          href={`/admin/sessions/${session.slug}`}
          active={false}
        >
          Attendance
        </NavigationTabLink>
        <NavigationTabLink
          href={`/admin/sessions/${session.slug}?tab=assignments`}
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
        <section
          aria-label="Group session guides"
          className="grid gap-3 sm:grid-cols-2"
        >
          {GROUP_ROLES.map(({ role, label, icon: Icon }) => {
            const assigned = assignmentByRole.get(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => setPickerRole(role)}
                className="border-border/80 bg-card hover:bg-muted/30 flex min-h-14 w-full items-center gap-3 rounded-2xl border p-4 text-left shadow-2xs transition-colors"
              >
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-semibold sm:text-base">
                    {label}
                  </p>
                  <p
                    className={
                      assigned
                        ? "text-muted-foreground truncate text-xs"
                        : "text-muted-foreground/70 truncate text-xs italic"
                    }
                  >
                    {assigned ? assigned.memberName : "Not assigned yet"}
                  </p>
                </div>
              </button>
            );
          })}
        </section>
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
