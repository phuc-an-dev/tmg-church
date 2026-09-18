"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Loader2,
  Search,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "cn";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { PaginationCard } from "@/components/shared/pagination-card";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusToast } from "@/components/ui/status-toast";
import { deleteSessionAction } from "@/features/session/actions";
import { SessionEditorDrawer } from "@/features/session/components/session-editor-drawer";
import {
  enrollMemberWithAssignmentsAction,
  removeMinistryMembershipAction,
} from "@/features/member/actions";
import { TermRoleManagement } from "./term-role-management";
import type {
  EligibleTermMember,
  TermDetailData,
  TermDetailMember,
  TermDetailSession,
} from "../types";

type Section = "members" | "sessions";

export function TermDetailView({
  section,
  termId,
  data,
}: {
  section: Section;
  termId: string;
  data: TermDetailData;
}) {
  const router = useRouter();
  const [toast, setToast] = React.useState<string | null>(null);
  const [memberDrawerOpen, setMemberDrawerOpen] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState("");
  const [memberPage, setMemberPage] = React.useState(1);
  const memberPageSize = 20;
  const [drawerPage, setDrawerPage] = React.useState(1);
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>(
    [],
  );
  const [memberPending, setMemberPending] = React.useState(false);
  const [removingMember, setRemovingMember] =
    React.useState<TermDetailMember | null>(null);
  const [sessionDrawerOpen, setSessionDrawerOpen] = React.useState(false);
  const [editingSession, setEditingSession] =
    React.useState<TermDetailSession | null>(null);
  const [deletingSession, setDeletingSession] =
    React.useState<TermDetailSession | null>(null);
  const [sessionPending, setSessionPending] = React.useState(false);

  const eligibleMembers = React.useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return query
      ? data.eligibleMembers.filter((member) =>
          member.name.toLowerCase().includes(query),
        )
      : data.eligibleMembers;
  }, [data.eligibleMembers, memberSearch]);
  const visibleMembers = data.members.slice(
    (memberPage - 1) * memberPageSize,
    memberPage * memberPageSize,
  );
  const visibleEligibleMembers = eligibleMembers.slice(
    (drawerPage - 1) * memberPageSize,
    drawerPage * memberPageSize,
  );

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  function selectAllEligibleMembers() {
    setSelectedMemberIds(eligibleMembers.map((member) => member.id));
  }

  async function addMembers() {
    setMemberPending(true);
    for (const memberId of selectedMemberIds) {
      const result = await enrollMemberWithAssignmentsAction({
        memberId,
        ministryTermId: termId,
        termGroupId: null,
        departmentIds: [],
      });
      if (!result.success) {
        setMemberPending(false);
        setToast(result.error ?? "Unable to add member to this term.");
        return;
      }
    }
    setMemberPending(false);
    setMemberDrawerOpen(false);
    setSelectedMemberIds([]);
    setMemberSearch("");
    setToast("Members added to this ministry term.");
    router.refresh();
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
          <TermRoleManagement
            termId={termId}
            members={data.members}
            assignments={data.termRoles}
          />
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Members</h2>
              <p className="text-muted-foreground text-sm">
                Active members enrolled in this term.
              </p>
            </div>
            <span className="text-muted-foreground text-sm">
              {data.members.length}
            </span>
          </div>
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
                      <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <Users className="size-5" />
                      </span>
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
          <FloatingCreateButton onClick={() => setMemberDrawerOpen(true)}>
            Add member
          </FloatingCreateButton>
        </section>
      ) : (
        <section className="pb-24">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Sessions</h2>
              <p className="text-muted-foreground text-sm">
                Term-wide sessions for active term members.
              </p>
            </div>
            <span className="text-muted-foreground text-sm">
              {data.sessions.length}
            </span>
          </div>
          <ExpandableCoordinatorProvider>
            <div className="space-y-3 md:space-y-0 md:overflow-hidden md:rounded-xl md:border">
              {data.sessions.map((session) => (
                <ExpandableActionItem
                  key={session.id}
                  id={session.id}
                  name={session.title}
                  onEdit={() => {
                    setEditingSession(session);
                    setSessionDrawerOpen(true);
                  }}
                  onDelete={
                    session.canDelete
                      ? () => setDeletingSession(session)
                      : undefined
                  }
                  className="p-4 md:grid md:grid-cols-[1fr_180px_120px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <Link
                      href={`/admin/sessions/${session.slug}`}
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
                          {format(parseISO(session.sessionDate), "MMM d, yyyy")}{" "}
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
          <FloatingCreateButton
            onClick={() => {
              setEditingSession(null);
              setSessionDrawerOpen(true);
            }}
          >
            Create session
          </FloatingCreateButton>
        </section>
      )}

      <ResponsiveEditor
        open={memberDrawerOpen}
        onOpenChange={setMemberDrawerOpen}
        title="Add members"
        description="Select active church members who are not enrolled in this term."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMemberDrawerOpen(false)}
              disabled={memberPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addMembers}
              disabled={memberPending || selectedMemberIds.length === 0}
            >
              {memberPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedMemberIds.length || ""} member${selectedMemberIds.length === 1 ? "" : "s"}`
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="term-member-search"
              type="search"
              className="min-h-11 pr-9 pl-9 text-base"
              value={memberSearch}
              onChange={(event) => {
                setMemberSearch(event.target.value);
                setDrawerPage(1);
              }}
              placeholder="Search unassigned members..."
              aria-label="Search unassigned members"
            />
            {memberSearch && (
              <button
                type="button"
                onClick={() => {
                  setMemberSearch("");
                  setDrawerPage(1);
                }}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center"
                aria-label="Clear member search"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {eligibleMembers.length}{" "}
              {eligibleMembers.length === 1 ? "member" : "members"} available
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAllEligibleMembers}
                disabled={eligibleMembers.length === 0}
                className="min-h-9 px-2 text-xs font-semibold"
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMemberIds([])}
                disabled={selectedMemberIds.length === 0}
                className="min-h-9 px-2 text-xs font-semibold"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto py-1 pr-1">
            {visibleEligibleMembers.map((member: EligibleTermMember) => {
              const selected = selectedMemberIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  className={cn(
                    "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-primary/20 font-semibold ring-1"
                      : "border-border/70 bg-card",
                  )}
                >
                  <span className="text-foreground min-w-0 flex-1 text-sm font-semibold sm:text-base">
                    {member.name}
                  </span>
                  <span
                    className={cn(
                      "ml-3 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-transparent",
                    )}
                    aria-hidden="true"
                  >
                    {selected && <Check className="size-3.5 stroke-3" />}
                  </span>
                </button>
              );
            })}
            {eligibleMembers.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No matching members available.
              </p>
            )}
          </div>
          <PaginationCard
            page={drawerPage}
            pageSize={memberPageSize}
            count={eligibleMembers.length}
            itemLabel="members"
            variant="bar"
            onPageChange={setDrawerPage}
          />
        </div>
      </ResponsiveEditor>
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
