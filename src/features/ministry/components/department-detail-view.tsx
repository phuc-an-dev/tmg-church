"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Ellipsis,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpandableCardPanel } from "@/components/shared/expandable-card-panel";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import {
  ListTable,
  ListTableHeader,
  ListTableBody,
} from "@/components/shared/list-table";
import { StatusToast } from "@/components/ui/status-toast";
import { SessionEditorDrawer } from "@/features/session/components/session-editor-drawer";
import { deleteSessionAction } from "@/features/session/actions";
import { setDepartmentLeaderAction } from "@/features/church/authorization-actions";
import {
  assignDepartmentMembersAction,
  deleteDepartmentServiceRoleAction,
  saveDepartmentServiceRoleAction,
  unassignDepartmentMembersAction,
} from "../actions";
import { TERM_BOARD_ROLE_OPTIONS } from "../board-roles";
import type {
  DepartmentDetailData,
  DepartmentDetailMember,
  DepartmentServiceRole,
  StructureItem,
} from "../types";

interface DepartmentDetailViewProps {
  section: "members" | "sessions" | "roles";
  department: StructureItem;
  leaderMemberId: DepartmentDetailData["leaderMemberId"];
  boardMembers: DepartmentDetailData["boardMembers"];
  closed: boolean;
  members: DepartmentDetailMember[];
  roles: DepartmentServiceRole[];
  sessions: Array<{
    id: string;
    slug: string;
    title: string;
    sessionDate: string;
    participantCount: number;
    canDelete: boolean;
  }>;
  ministryTermId: string;
  ministrySlug: string;
  termSlug: string;
}

export function DepartmentDetailView({
  section,
  department,
  leaderMemberId,
  boardMembers,
  closed,
  members,
  roles,
  sessions,
  ministryTermId,
  ministrySlug,
  termSlug,
}: DepartmentDetailViewProps) {
  const router = useRouter();

  // Toast feedback
  const [toast, setToast] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sessionDrawerOpen, setSessionDrawerOpen] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<
    DepartmentDetailViewProps["sessions"][number] | null
  >(null);
  const [deletingSession, setDeletingSession] = React.useState<
    DepartmentDetailViewProps["sessions"][number] | null
  >(null);
  const [sessionPending, setSessionPending] = React.useState(false);

  async function deleteSession() {
    if (!deletingSession) return;
    setSessionPending(true);
    const result = await deleteSessionAction({ id: deletingSession.id });
    setSessionPending(false);
    if (!result.success) {
      setToast({
        type: "error",
        message: result.error ?? "Unable to delete session.",
      });
      return;
    }
    setDeletingSession(null);
    setToast({ type: "success", message: "Session deleted." });
    router.refresh();
  }

  // ---------------------------------------------------------------------------
  // MEMBERS STATE
  // ---------------------------------------------------------------------------
  const [expandedSessionId, setExpandedSessionId] = React.useState<
    string | null
  >(null);
  const [assignDrawerOpen, setAssignDrawerOpen] = React.useState(false);
  const [leaderDrawerOpen, setLeaderDrawerOpen] = React.useState(false);
  const [leaderRemoveOpen, setLeaderRemoveOpen] = React.useState(false);
  const [leaderPending, setLeaderPending] = React.useState(false);
  const [leaderError, setLeaderError] = React.useState<string | null>(null);
  const [assignPending, setAssignPending] = React.useState(false);
  const [assignDrawerError, setAssignDrawerError] = React.useState<
    string | null
  >(null);

  // Single-member direct action state
  const [unassignConfirmMember, setUnassignConfirmMember] =
    React.useState<DepartmentDetailMember | null>(null);
  const [unassignPending, setUnassignPending] = React.useState(false);

  // ---------------------------------------------------------------------------
  // ROLES STATE
  // ---------------------------------------------------------------------------
  const [editingRole, setEditingRole] = React.useState<
    DepartmentServiceRole | "new" | null
  >(null);
  const [roleNameDraft, setRoleNameDraft] = React.useState("");
  const [rolePending, setRolePending] = React.useState(false);
  const [roleFormError, setRoleFormError] = React.useState<string | null>(null);
  const [deletingRole, setDeletingRole] =
    React.useState<DepartmentServiceRole | null>(null);
  const [deleteRolePending, setDeleteRolePending] = React.useState(false);

  // ---------------------------------------------------------------------------
  // COMPUTED COUNTS & LISTS
  // ---------------------------------------------------------------------------
  const assignedMembers = React.useMemo(
    () => members.filter((m) => m.isAssigned),
    [members],
  );
  const unassignedMembers = React.useMemo(
    () => members.filter((m) => !m.isAssigned),
    [members],
  );
  const leader = boardMembers.find((member) => member.id === leaderMemberId);
  const activeBoardMembers = boardMembers.filter((member) => !member.archived);
  const boardRoleNames = (roles: string[]) =>
    roles
      .map(
        (role) =>
          TERM_BOARD_ROLE_OPTIONS.find((option) => option.value === role)
            ?.label ?? role,
      )
      .join(", ");
  const leaderSubtitle = leader
    ? `${boardRoleNames(leader.roles)}${leader.archived ? " (archived)" : ""}`
    : closed
      ? "No leader assigned in this term"
      : activeBoardMembers.length === 0
        ? "Set up Executive Board"
        : "Select from Executive Board";

  async function updateLeader(memberProfileId: string | null) {
    setLeaderPending(true);
    setLeaderError(null);
    try {
      const result = await setDepartmentLeaderAction({
        departmentId: department.id,
        memberProfileId,
      });
      if (!result.success) {
        setLeaderError(result.error);
        return;
      }
      setLeaderDrawerOpen(false);
      setLeaderRemoveOpen(false);
      setToast({
        type: "success",
        message: result.message ?? "Department Leader updated.",
      });
      router.refresh();
    } catch {
      setLeaderError("Unable to update the Department Leader.");
    } finally {
      setLeaderPending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // MEMBER HANDLERS
  // ---------------------------------------------------------------------------
  async function handleConfirmUnassign() {
    if (!unassignConfirmMember) return;
    setUnassignPending(true);
    try {
      const res = await unassignDepartmentMembersAction({
        termDepartmentId: department.id,
        membershipIds: [unassignConfirmMember.membershipId],
      });
      if (res.success) {
        setToast({
          type: "success",
          message: `Removed ${unassignConfirmMember.memberName} from ${department.name}.`,
        });
        setUnassignConfirmMember(null);
        router.refresh();
      } else {
        setToast({ type: "error", message: res.error });
      }
    } catch {
      setToast({
        type: "error",
        message: "Failed to remove member from department.",
      });
    } finally {
      setUnassignPending(false);
    }
  }

  function openAssignDrawer() {
    setAssignDrawerError(null);
    setAssignDrawerOpen(true);
  }

  async function handleBatchAssign(selectedIds: string[]) {
    if (selectedIds.length === 0) return;
    setAssignPending(true);
    setAssignDrawerError(null);
    try {
      const res = await assignDepartmentMembersAction({
        termDepartmentId: department.id,
        membershipIds: selectedIds,
      });
      if (res.success) {
        setToast({
          type: "success",
          message: res.message,
        });
        setAssignDrawerOpen(false);
        router.refresh();
      } else {
        setAssignDrawerError(res.error);
      }
    } catch {
      setAssignDrawerError("Failed to assign members to department.");
    } finally {
      setAssignPending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // ROLE HANDLERS
  // ---------------------------------------------------------------------------
  function openRoleEditor(role: DepartmentServiceRole | "new") {
    setRoleFormError(null);
    setRoleNameDraft(role === "new" ? "" : role.name);
    setEditingRole(role);
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = roleNameDraft.trim();
    if (!trimmed) {
      setRoleFormError("Role name is required.");
      return;
    }
    setRolePending(true);
    setRoleFormError(null);
    try {
      const res = await saveDepartmentServiceRoleAction({
        id: editingRole !== "new" && editingRole ? editingRole.id : undefined,
        termDepartmentId: department.id,
        name: trimmed,
      });
      if (res.success) {
        setToast({
          type: "success",
          message: res.message,
        });
        setEditingRole(null);
        router.refresh();
      } else {
        setRoleFormError(res.error);
      }
    } catch {
      setRoleFormError("Failed to save service role.");
    } finally {
      setRolePending(false);
    }
  }

  async function handleConfirmDeleteRole() {
    if (!deletingRole) return;
    setDeleteRolePending(true);
    try {
      const res = await deleteDepartmentServiceRoleAction({
        id: deletingRole.id,
        termDepartmentId: department.id,
      });
      if (res.success) {
        setToast({
          type: "success",
          message: res.message,
        });
        setDeletingRole(null);
        router.refresh();
      } else {
        setToast({ type: "error", message: res.error });
      }
    } catch {
      setToast({
        type: "error",
        message: "Failed to delete service role.",
      });
    } finally {
      setDeleteRolePending(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <StatusToast message={toast.message} onDismiss={() => setToast(null)} />
      )}

      {/* =================================================================== */}
      {/* SECTION: MEMBERS                                                    */}
      {/* =================================================================== */}
      {section === "members" && (
        <div className="space-y-8 pb-24 md:pb-16">
          <section className="space-y-3" aria-label="Leadership">
            <h2 className="text-base font-semibold">Leadership</h2>
            <ExpandableCoordinatorProvider>
              <ExpandableActionItem
                id={`department-leader-${department.id}`}
                name="Department Leader"
                onEdit={
                  !closed &&
                  activeBoardMembers.some(
                    (member) => member.id !== leaderMemberId,
                  )
                    ? () => {
                        setLeaderError(null);
                        setLeaderDrawerOpen(true);
                      }
                    : undefined
                }
                editLabel={leader ? "Replace" : "Assign"}
                onDelete={
                  !closed && leader
                    ? () => {
                        setLeaderError(null);
                        setLeaderRemoveOpen(true);
                      }
                    : undefined
                }
                deleteLabel="Unassign"
                deleteIcon={UserMinus}
                className="p-4 md:rounded-2xl md:border"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Shield className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
                    {leader ? (
                      <Link
                        href={`/admin/members/${leader.slug}`}
                        className="truncate font-semibold"
                      >
                        {leader.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">Vacant</span>
                    )}
                    <span className="text-muted-foreground text-sm leading-5">
                      {leaderSubtitle}
                    </span>
                  </span>
                  {!closed && (leader || activeBoardMembers.length > 0) && (
                    <ExpandableActionItem.Trigger />
                  )}
                  {!closed && <ExpandableActionItem.DesktopActions />}
                </div>
                {!closed && <ExpandableActionItem.MobileActions />}
              </ExpandableActionItem>
            </ExpandableCoordinatorProvider>
            {!closed && activeBoardMembers.length === 0 && (
              <Link
                href={`/admin/ministries/${ministrySlug}/terms/${termSlug}?section=board`}
                className="text-primary inline-flex min-h-11 items-center text-sm font-medium"
              >
                Open Executive Board
              </Link>
            )}
          </section>
          <section className="space-y-3 border-t pt-6" aria-label="Members">
            <h2 className="text-base font-semibold">
              Members ({assignedMembers.length})
            </h2>
            {assignedMembers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={`No members assigned to ${department.name} yet`}
                description={
                  unassignedMembers.length > 0
                    ? "Use the floating 'Assign Members' button below to assign members enrolled in this term."
                    : "No members are enrolled in this ministry term yet."
                }
              />
            ) : (
              <ExpandableCoordinatorProvider>
                <ListTable label="Department assigned members">
                  <ListTableHeader gridClassName="md:grid-cols-[1fr_160px_80px]">
                    <div role="columnheader">Member</div>
                    <div role="columnheader">Slug</div>
                    <div role="columnheader" className="text-right">
                      Actions
                    </div>
                  </ListTableHeader>
                  <ListTableBody>
                    {assignedMembers.map((member) => (
                      <ExpandableActionItem
                        key={member.membershipId}
                        id={member.membershipId}
                        name={member.memberName}
                        onDelete={() => setUnassignConfirmMember(member)}
                        deleteLabel="Remove from department"
                        deleteIcon={UserMinus}
                        className="p-4 md:grid md:grid-cols-[1fr_160px_80px] md:items-center md:gap-4 md:p-3"
                      >
                        <div role="cell" className="min-w-0">
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <Link
                              href={`/admin/members/${member.memberSlug}`}
                              className="flex min-h-11 min-w-0 flex-1 items-center gap-3"
                            >
                              <MemberAvatar gender={member.gender} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">
                                  {member.memberName}
                                </span>
                                <span className="text-muted-foreground block truncate text-xs md:hidden">
                                  /{member.memberSlug}
                                </span>
                              </span>
                            </Link>
                            <ExpandableActionItem.Trigger className="md:hidden" />
                          </div>
                          <ExpandableActionItem.MobileActions />
                        </div>
                        <div
                          role="cell"
                          className="text-muted-foreground hidden truncate font-mono text-xs md:block"
                        >
                          /{member.memberSlug}
                        </div>
                        <div role="cell" className="hidden justify-end md:flex">
                          <ExpandableActionItem.DesktopActions />
                        </div>
                      </ExpandableActionItem>
                    ))}
                  </ListTableBody>
                </ListTable>
              </ExpandableCoordinatorProvider>
            )}
          </section>

          {/* Floating 'Assign Members' Button */}
          <FloatingCreateButton
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            onClick={openAssignDrawer}
            disabled={unassignedMembers.length === 0}
            aria-label="Assign members to department"
          >
            <span>Assign Members</span>
          </FloatingCreateButton>
        </div>
      )}

      {section === "sessions" && (
        <div className="space-y-4 pb-24 md:pb-16">
          {sessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No sessions yet"
              description="Create the first session for this department."
            />
          ) : (
            <div className="grid gap-3">
              {sessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className="border-border/60 bg-card rounded-xl border p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/admin/sessions/${session.slug}?returnUrl=${encodeURIComponent(`/admin/ministries/${ministrySlug}/terms/${termSlug}/departments/${department.slug}?section=sessions`)}`}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-3"
                      >
                        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                          <CalendarDays className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {session.title}
                          </span>
                          <span className="text-muted-foreground block text-sm">
                            {session.sessionDate} · {session.participantCount}{" "}
                            participants
                          </span>
                        </span>
                      </Link>

                      {/* 3-dot Toggle Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "min-h-11 min-w-11 rounded-xl p-0",
                          isExpanded && "bg-muted text-foreground",
                        )}
                        aria-label={`Actions for ${session.title}`}
                        aria-expanded={isExpanded}
                        aria-controls={`department-session-actions-${session.id}`}
                        onClick={() =>
                          setExpandedSessionId((prev) =>
                            prev === session.id ? null : session.id,
                          )
                        }
                      >
                        <Ellipsis className="size-5" aria-hidden="true" />
                      </Button>
                    </div>

                    {/* Action buttons displayed below card when expanded */}
                    <ExpandableCardPanel
                      open={isExpanded}
                      id={`department-session-actions-${session.id}`}
                      label={`Actions for ${session.title}`}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-border/80 bg-background hover:bg-muted/80 text-foreground min-h-11 w-full gap-2 text-sm font-semibold shadow-xs"
                          onClick={() => {
                            setExpandedSessionId(null);
                            setEditingSession(session);
                            setSessionDrawerOpen(true);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                          <span>Edit</span>
                        </Button>
                        <DestructiveActionButton
                          type="button"
                          className="min-h-11 w-full"
                          disabled={!session.canDelete}
                          onClick={() => {
                            setExpandedSessionId(null);
                            setDeletingSession(session);
                          }}
                          label="Delete"
                          icon={Trash2}
                        />
                      </div>
                    </ExpandableCardPanel>
                  </div>
                );
              })}
            </div>
          )}
          <FloatingCreateButton
            icon={<CalendarDays className="size-5" aria-hidden="true" />}
            onClick={() => {
              setEditingSession(null);
              setSessionDrawerOpen(true);
            }}
            aria-label="Create session for department"
          >
            Create session
          </FloatingCreateButton>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION: ROLES                                                      */}
      {/* =================================================================== */}
      {section === "roles" && (
        <div className="space-y-4 pb-24 md:pb-16">
          {/* Roles Collection */}
          {roles.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No service roles created yet"
              description={`Define service roles for ${department.name} to assign responsibilities during church sessions.`}
              action={
                <Button
                  type="button"
                  onClick={() => openRoleEditor("new")}
                  className="min-h-11 gap-2 text-sm font-semibold"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <span>Create first service role</span>
                </Button>
              }
            />
          ) : (
            <ExpandableCoordinatorProvider>
              <ListTable label="Department service roles">
                <ListTableHeader gridClassName="md:grid-cols-[1fr_80px]">
                  <div role="columnheader">Role Name</div>
                  <div role="columnheader" className="text-right">
                    Actions
                  </div>
                </ListTableHeader>
                <ListTableBody>
                  {roles.map((role) => (
                    <ExpandableActionItem
                      key={role.id}
                      id={role.id}
                      name={role.name}
                      onEdit={() => openRoleEditor(role)}
                      onDelete={() => setDeletingRole(role)}
                      deleteDisabled={role.assignmentCount > 0}
                      deleteDisabledReason="Roles with assignments cannot be deleted."
                      className="p-4 md:grid md:grid-cols-[1fr_80px] md:items-center md:gap-4 md:p-3"
                    >
                      <div role="cell" className="min-w-0">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            {role.name}
                          </span>
                          <ExpandableActionItem.Trigger className="md:hidden" />
                        </div>
                        <ExpandableActionItem.MobileActions />
                      </div>
                      <div role="cell" className="hidden justify-end md:flex">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </ExpandableActionItem>
                  ))}
                </ListTableBody>
              </ListTable>
            </ExpandableCoordinatorProvider>
          )}

          {/* Floating 'New Role' Button */}
          <FloatingCreateButton
            onClick={() => openRoleEditor("new")}
            aria-label="Create service role"
          >
            <span>New Role</span>
          </FloatingCreateButton>
        </div>
      )}
      <SessionEditorDrawer
        key={editingSession?.id ?? "new"}
        open={sessionDrawerOpen}
        onOpenChange={(open) => {
          setSessionDrawerOpen(open);
          if (!open) setEditingSession(null);
        }}
        scope={{ departmentId: department.id, ministryTermId }}
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

      {/* =================================================================== */}
      {/* DRAWER: ASSIGN ENROLLED MEMBERS                                     */}
      {/* =================================================================== */}
      <MemberAssignDrawer
        open={leaderDrawerOpen}
        onOpenChange={(open) => {
          if (!open) setLeaderError(null);
          setLeaderDrawerOpen(open);
        }}
        title={`${leader ? "Replace" : "Assign"} Department Leader`}
        description="Choose a current Executive Board member from this term."
        searchPlaceholder="Search Board members..."
        members={activeBoardMembers
          .filter((member) => member.id !== leaderMemberId)
          .map((member) => ({
            id: member.id,
            name: member.name,
            gender: member.gender,
            subtitle: boardRoleNames(member.roles),
          }))}
        onAssign={([id]) => updateLeader(id)}
        pending={leaderPending}
        error={leaderError}
        assignLabel={leader ? "Replace" : "Assign"}
        singleSelect
      />
      <ConfirmationSheet
        open={leaderRemoveOpen}
        onOpenChange={(open) => {
          if (!open) setLeaderError(null);
          setLeaderRemoveOpen(open);
        }}
        title="Unassign Department Leader"
        description={`Unassign ${leader?.name ?? "this member"} from ${department.name}?`}
        confirmLabel="Unassign"
        variant="destructive"
        pending={leaderPending}
        onConfirm={() => updateLeader(null)}
      >
        {leaderError && (
          <p className="text-destructive text-sm" role="alert">
            {leaderError}
          </p>
        )}
      </ConfirmationSheet>
      <MemberAssignDrawer
        open={assignDrawerOpen}
        onOpenChange={setAssignDrawerOpen}
        title={`Assign to ${department.name}`}
        description="Select members enrolled in this term to assign to this department."
        members={unassignedMembers.map((m) => ({
          id: m.membershipId,
          name: m.memberName,
          gender: m.gender,
        }))}
        onAssign={handleBatchAssign}
        pending={assignPending}
        error={assignDrawerError}
      />

      {/* =================================================================== */}
      {/* DRAWER / CONFIRMATION: UNASSIGN MEMBER                              */}
      {/* =================================================================== */}
      <ConfirmationSheet
        open={Boolean(unassignConfirmMember)}
        onOpenChange={(open) => !open && setUnassignConfirmMember(null)}
        title="Remove member from department?"
        description={
          unassignConfirmMember ? (
            <span>
              Are you sure you want to remove{" "}
              <strong>{unassignConfirmMember.memberName}</strong> from{" "}
              <strong>{department.name}</strong>? Their enrollment in this
              ministry term will remain unchanged.
            </span>
          ) : (
            ""
          )
        }
        confirmLabel="Remove Assignment"
        pending={unassignPending}
        pendingLabel="Removing..."
        variant="destructive"
        onConfirm={handleConfirmUnassign}
      />

      {/* =================================================================== */}
      {/* DRAWER: CREATE / EDIT ROLE                                          */}
      {/* =================================================================== */}
      <ResponsiveEditor
        open={Boolean(editingRole)}
        onOpenChange={(open) => !open && setEditingRole(null)}
        title={editingRole === "new" ? "New Service Role" : "Edit Service Role"}
        description={`Define a service role for ${department.name}.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingRole(null)}
              disabled={rolePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRole}
              disabled={rolePending || !roleNameDraft.trim()}
            >
              {rolePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Role</span>
              )}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          {roleFormError && (
            <div
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              role="alert"
            >
              {roleFormError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role-name-input" className="text-sm font-semibold">
              Role Name
            </Label>
            <Input
              id="role-name-input"
              value={roleNameDraft}
              onChange={(e) => setRoleNameDraft(e.target.value)}
              placeholder="e.g. Worship Leader, Usher, Media Tech"
              className="min-h-11 text-base md:text-sm"
              autoFocus
            />
          </div>
        </form>
      </ResponsiveEditor>

      {/* =================================================================== */}
      {/* DRAWER / CONFIRMATION: DELETE ROLE                                  */}
      {/* =================================================================== */}
      <ConfirmationSheet
        open={Boolean(deletingRole)}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        title="Delete service role?"
        description={
          deletingRole ? (
            <span>
              Are you sure you want to delete{" "}
              <strong>{deletingRole.name}</strong>? This action cannot be
              undone.
            </span>
          ) : (
            ""
          )
        }
        confirmLabel="Delete Role"
        pending={deleteRolePending}
        pendingLabel="Deleting..."
        variant="destructive"
        onConfirm={handleConfirmDeleteRole}
      />
    </div>
  );
}
