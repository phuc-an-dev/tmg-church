"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import { ManageCollectionDrawer } from "@/components/shared/manage-collection-drawer";
import { PaginationCard } from "@/components/shared/pagination-card";
import { Button } from "@/components/ui/button";
import { StatusToast } from "@/components/ui/status-toast";
import { TermDepartmentAccessTab } from "./term-department-access-tab";
import { deleteSessionAction } from "@/features/session/actions";
import { SessionEditorDrawer } from "@/features/session/components/session-editor-drawer";
import { removeMinistryMembershipAction } from "@/features/member/actions";
import { enrollTermMembersAction } from "../actions";
import type {
  TermDetailData,
  TermDetailMember,
  TermDetailSession,
} from "../types";

type Section = "members" | "sessions";

export function TermDetailView({
  section,
  termId,
  ministrySlug,
  termSlug,
  data,
}: {
  section: Section;
  termId: string;
  ministrySlug?: string;
  termSlug?: string;
  data: TermDetailData;
}) {
  const router = useRouter();
  const [toast, setToast] = React.useState<string | null>(null);
  const [memberDrawerOpen, setMemberDrawerOpen] = React.useState(false);
  const [memberAssignError, setMemberAssignError] = React.useState<
    string | null
  >(null);
  const [memberPage, setMemberPage] = React.useState(1);
  const memberPageSize = 20;
  const [memberPending, setMemberPending] = React.useState(false);
  const [removingMember, setRemovingMember] =
    React.useState<TermDetailMember | null>(null);
  const [sessionDrawerOpen, setSessionDrawerOpen] = React.useState(false);
  const [manageSessionOpen, setManageSessionOpen] = React.useState(false);
  const [manageSessionTab, setManageSessionTab] = React.useState<
    "session" | "access"
  >("session");
  const [editingSession, setEditingSession] =
    React.useState<TermDetailSession | null>(null);
  const [deletingSession, setDeletingSession] =
    React.useState<TermDetailSession | null>(null);
  const [sessionPending, setSessionPending] = React.useState(false);

  const visibleMembers = data.members.slice(
    (memberPage - 1) * memberPageSize,
    memberPage * memberPageSize,
  );

  function openSessionEditor(session: TermDetailSession | null) {
    setEditingSession(session);
    setManageSessionOpen(false);
    setSessionDrawerOpen(true);
  }

  async function addMembers(selectedIds: string[]) {
    if (selectedIds.length === 0) return;
    setMemberPending(true);
    setMemberAssignError(null);
    try {
      const result = await enrollTermMembersAction({
        ministryTermId: termId,
        memberIds: selectedIds,
      });
      if (!result.success) {
        setMemberAssignError(
          result.error ?? "Unable to add members to this term.",
        );
        return;
      }
      setMemberDrawerOpen(false);
      setToast(result.message ?? "Members added to this ministry term.");
      router.refresh();
    } catch {
      setMemberAssignError(
        "An unexpected error occurred while adding members.",
      );
    } finally {
      setMemberPending(false);
    }
  }

  async function removeMember() {
    if (!removingMember) return;
    setMemberPending(true);
    const result = await removeMinistryMembershipAction({
      membershipId: removingMember.membershipId,
      memberId: removingMember.memberId,
    });
    setMemberPending(false);
    if (!result.success) {
      setToast(result.error ?? "Unable to remove this member.");
      return;
    }
    setRemovingMember(null);
    setToast("Member removed from this ministry term.");
    router.refresh();
  }

  async function deleteSession() {
    if (!deletingSession) return;
    setSessionPending(true);
    const result = await deleteSessionAction({ id: deletingSession.id });
    setSessionPending(false);
    if (!result.success) {
      setToast(result.error ?? "Unable to delete this session.");
      return;
    }
    setDeletingSession(null);
    setToast("Session deleted.");
    router.refresh();
  }

  return (
    <>
      {section === "members" ? (
        <section className="pb-24">
          {data.members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="No members are enrolled in this ministry term yet."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMemberDrawerOpen(true)}
                  className="bg-card hover:bg-card min-h-11 gap-2 px-4"
                >
                  Add member
                </Button>
              }
            />
          ) : (
            <>
              <ExpandableCoordinatorProvider>
                <div className="space-y-3 md:space-y-0 md:overflow-hidden md:rounded-xl md:border">
                  {visibleMembers.map((member) => (
                    <ExpandableActionItem
                      key={member.membershipId}
                      id={member.membershipId}
                      name={member.memberName}
                      onDelete={() => setRemovingMember(member)}
                      deleteLabel="Remove from term"
                      deleteIcon={UserMinus}
                      className="p-4 md:grid md:grid-cols-[1fr_160px_120px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <Link
                          href={`/admin/members/${member.memberSlug}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <MemberAvatar gender={member.gender} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {member.memberName}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              /{member.memberSlug}
                            </span>
                          </span>
                        </Link>
                        <ExpandableActionItem.Trigger className="md:hidden" />
                      </div>
                      <ExpandableActionItem.MobileActions />
                      <div className="text-muted-foreground hidden font-mono text-xs md:block">
                        /{member.memberSlug}
                      </div>
                      <div className="hidden justify-end md:flex">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </ExpandableActionItem>
                  ))}
                </div>
              </ExpandableCoordinatorProvider>
              <PaginationCard
                page={memberPage}
                pageSize={memberPageSize}
                count={data.members.length}
                itemLabel="members"
                onPageChange={setMemberPage}
                className="mt-4"
              />
            </>
          )}
          <FloatingCreateButton onClick={() => setMemberDrawerOpen(true)}>
            Add member
          </FloatingCreateButton>
        </section>
      ) : (
        <section className="pb-24">
          <FloatingCreateButton
            onClick={() => {
              setManageSessionTab("session");
              setManageSessionOpen(true);
            }}
          >
            Manage Session
          </FloatingCreateButton>
        </section>
      )}

      <ManageCollectionDrawer
        open={manageSessionOpen}
        onOpenChange={(open) => {
          setManageSessionOpen(open);
          if (open) setManageSessionTab("session");
        }}
        title="Manage Session"
        description="Manage term sessions and Department Leader access."
        mobileMinHeightClass="min-h-[85dvh]"
        maxWidthClass="sm:max-w-2xl"
        tabs={[
          { key: "session", label: "Session", icon: CalendarDays },
          { key: "access", label: "Access", icon: Users },
        ]}
        activeTab={manageSessionTab}
        onTabChange={setManageSessionTab}
        footer={
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setManageSessionOpen(false)}
          >
            Done
          </Button>
        }
      >
        {manageSessionTab === "session" ? (
          <div className="space-y-4">
            <Button
              type="button"
              className="min-h-11 gap-2"
              onClick={() => openSessionEditor(null)}
            >
              <Plus aria-hidden="true" className="size-4" />
              Create session
            </Button>
            {data.sessions.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No sessions yet"
                description="No term-wide sessions have been created for this term yet."
              />
            ) : (
              <ExpandableCoordinatorProvider>
                <div className="space-y-3 md:space-y-0 md:overflow-hidden md:rounded-xl md:border">
                  {data.sessions.map((session) => (
                    <ExpandableActionItem
                      key={session.id}
                      id={session.id}
                      name={session.title}
                      onEdit={() => openSessionEditor(session)}
                      onDelete={
                        session.canDelete
                          ? () => {
                              setManageSessionOpen(false);
                              setDeletingSession(session);
                            }
                          : undefined
                      }
                      className="p-4 md:grid md:grid-cols-[1fr_180px_120px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <Link
                          href={`/admin/sessions/${session.slug}${ministrySlug && termSlug ? `?returnUrl=${encodeURIComponent(`/admin/ministries/${ministrySlug}/terms/${termSlug}?section=sessions`)}` : ""}`}
                          onClick={() => setManageSessionOpen(false)}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                            <CalendarDays className="size-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {session.title}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {format(
                                parseISO(session.sessionDate),
                                "MMM d, yyyy",
                              )}{" "}
                              · {session.participantCount} participants
                            </span>
                          </span>
                        </Link>
                        <ExpandableActionItem.Trigger className="md:hidden" />
                      </div>
                      <ExpandableActionItem.MobileActions />
                      <div className="text-muted-foreground hidden text-sm md:block">
                        {format(parseISO(session.sessionDate), "MMM d, yyyy")}
                      </div>
                      <div className="hidden justify-end md:flex">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </ExpandableActionItem>
                  ))}
                </div>
              </ExpandableCoordinatorProvider>
            )}
          </div>
        ) : (
          <TermDepartmentAccessTab ministryTermId={termId} />
        )}
      </ManageCollectionDrawer>

      <MemberAssignDrawer
        open={memberDrawerOpen}
        onOpenChange={(open) => {
          setMemberDrawerOpen(open);
          if (!open) setMemberAssignError(null);
        }}
        title="Add members"
        description="Select active church members who are not enrolled in this term."
        searchPlaceholder="Search unassigned members..."
        assignLabel="Add"
        members={data.eligibleMembers.map((m) => ({
          id: m.id,
          name: m.name,
          gender: m.gender,
          subtitle: `/${m.slug}`,
        }))}
        onAssign={addMembers}
        pending={memberPending}
        error={memberAssignError}
      />
      <ConfirmationSheet
        open={Boolean(removingMember)}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        title="Remove member from term"
        description="Removal is only available when this member has no Group, Department, or Session history in this term."
        confirmLabel="Remove member"
        pending={memberPending}
        onConfirm={removeMember}
        confirmIcon={<UserMinus className="size-4" />}
      />
      <SessionEditorDrawer
        key={editingSession?.id ?? "new"}
        open={sessionDrawerOpen}
        onOpenChange={(open) => {
          setSessionDrawerOpen(open);
          if (!open) setEditingSession(null);
        }}
        scope={{ ministryTermId: termId }}
        session={editingSession}
        onSaved={() => router.refresh()}
      />
      <ConfirmationSheet
        open={Boolean(deletingSession)}
        onOpenChange={(open) => !open && setDeletingSession(null)}
        title="Delete session"
        description="This is allowed only while the session has no participants or historical attendance."
        confirmLabel="Delete session"
        pending={sessionPending}
        onConfirm={deleteSession}
        confirmIcon={<Trash2 className="size-4" />}
      />
      {toast && (
        <StatusToast message={toast} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
