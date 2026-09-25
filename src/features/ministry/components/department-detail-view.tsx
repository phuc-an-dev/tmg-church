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
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import {
  ListTable,
  ListTableHeader,
  ListTableBody,
} from "@/components/shared/list-table";
import { StatusToast } from "@/components/ui/status-toast";
import { SessionEditorDrawer } from "@/features/session/components/session-editor-drawer";
import { deleteSessionAction } from "@/features/session/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  assignDepartmentMembersAction,
  deleteDepartmentServiceRoleAction,
  saveDepartmentServiceRoleAction,
  unassignDepartmentMembersAction,
} from "../actions";
import type {
  DepartmentDetailMember,
  DepartmentServiceRole,
  StructureItem,
} from "../types";

interface DepartmentDetailViewProps {
  section: "members" | "sessions" | "roles";
  department: StructureItem;
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
  const [expandedMemberId, setExpandedMemberId] = React.useState<string | null>(
    null,
  );
  const [expandedSessionId, setExpandedSessionId] = React.useState<
    string | null
  >(null);
  const [assignDrawerOpen, setAssignDrawerOpen] = React.useState(false);
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
      {/* =================================================================== */}
      {/* SECTION: MEMBERS                                                    */}
      {/* =================================================================== */}
      {section === "members" && (
        <div className="space-y-4 pb-24 md:pb-16">
          {/* Members Collection */}
          {assignedMembers.length === 0 ? (
            <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-center rounded-xl border p-8 text-center sm:p-12">
              <span className="bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-2xl">
                <Users className="size-6" aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold">
                No members assigned to {department.name} yet
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                {unassignedMembers.length > 0
                  ? "Use the floating 'Assign Members' button below to assign members enrolled in this term."
                  : "No members are enrolled in this ministry term yet."}
              </p>
            </div>
          ) : (
            <ListTable label="Department assigned members">
              {/* Desktop table header */}
              <ListTableHeader gridClassName="md:grid-cols-[1fr_80px]">
                <div role="columnheader">Member</div>
                <div role="columnheader" className="text-right">
                  Actions
                </div>
              </ListTableHeader>

              {/* Rows / Cards */}
              <ListTableBody>
                {assignedMembers.map((m) => {
                  const isExpanded = expandedMemberId === m.membershipId;

                  return (
                    <div
                      key={m.membershipId}
                      role="row"
                      className="border-border/60 bg-card rounded-xl border p-4 shadow-xs md:grid md:grid-cols-[1fr_80px] md:items-center md:gap-4 md:rounded-none md:border-none md:p-3 md:shadow-none"
                    >
                      {/* Name */}
                      <div role="cell" className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-base font-semibold md:text-sm">
                              {m.memberName}
                            </span>
                          </div>

                          {/* Mobile three-dot toggle */}
                          <div className="flex items-center md:hidden">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "min-h-11 min-w-11 rounded-xl p-0",
                                isExpanded && "bg-muted text-foreground",
                              )}
                              aria-label={`Actions for ${m.memberName}`}
                              aria-expanded={isExpanded}
                              onClick={() =>
                                setExpandedMemberId((prev) =>
                                  prev === m.membershipId
                                    ? null
                                    : m.membershipId,
                                )
                              }
                            >
                              <Ellipsis className="size-5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        {/* Mobile action button revealed when 3-dot is clicked */}
                        {isExpanded && (
                          <div className="border-border/70 animate-in fade-in-0 mt-3 border-t pt-3 duration-150 md:hidden">
                            <DestructiveActionButton
                              type="button"
                              onClick={() => setUnassignConfirmMember(m)}
                              className="min-h-11 w-full"
                              aria-label={`Remove ${m.memberName} from ${department.name}`}
                              label="Remove from department"
                              icon={UserMinus}
                            />
                          </div>
                        )}
                      </div>

                      {/* Desktop Action: three-dot DropdownMenu */}
                      <div
                        role="cell"
                        className="hidden justify-end md:flex md:items-center"
                      >
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="min-h-9 min-w-9 p-0"
                              aria-label={`Actions for ${m.memberName}`}
                            >
                              <Ellipsis className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-48">
                            <DropdownMenuItem
                              onClick={() => setUnassignConfirmMember(m)}
                              className="text-destructive focus:text-destructive cursor-pointer gap-2"
                            >
                              <UserMinus
                                className="size-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span>Remove from department</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </ListTableBody>
            </ListTable>
          )}

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
            <div className="border-border/60 bg-muted/20 rounded-xl border p-8 text-center">
              <CalendarDays
                className="text-muted-foreground mx-auto size-10"
                aria-hidden="true"
              />
              <h3 className="mt-3 text-base font-semibold">No sessions yet</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Create the first session for this department.
              </p>
            </div>
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
                        className="min-w-0 flex-1"
                      >
                        <p className="font-semibold">{session.title}</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {session.sessionDate} · {session.participantCount}{" "}
                          participants
                        </p>
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
                    {isExpanded && (
                      <div
                        role="region"
                        aria-label={`Actions for ${session.title}`}
                        className="border-border/70 animate-in fade-in-0 mt-3 border-t pt-3 duration-150 motion-reduce:animate-none"
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
                      </div>
                    )}
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
            <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-center rounded-xl border p-8 text-center sm:p-12">
              <span className="bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-2xl">
                <Shield className="size-6" aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold">
                No service roles created yet
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Define service roles for {department.name} to assign
                responsibilities during church sessions.
              </p>
              <Button
                type="button"
                onClick={() => openRoleEditor("new")}
                className="mt-4 min-h-11 gap-2 text-sm font-semibold"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Create first service role</span>
              </Button>
            </div>
          ) : (
            <ListTable label="Department service roles">
              {/* Desktop table header */}
              <ListTableHeader gridClassName="md:grid-cols-[1fr_80px]">
                <div role="columnheader">Role Name</div>
                <div role="columnheader" className="text-right">
                  Actions
                </div>
              </ListTableHeader>

              {/* Rows / Cards */}
              <ListTableBody>
                {roles.map((role) => {
                  const isDeleteBlocked = role.assignmentCount > 0;

                  return (
                    <div
                      key={role.id}
                      role="row"
                      className="border-border/60 bg-card rounded-xl border p-4 shadow-xs md:grid md:grid-cols-[1fr_80px] md:items-center md:gap-4 md:rounded-none md:border-none md:p-3 md:shadow-none"
                    >
                      {/* Name */}
                      <div role="cell" className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-base font-semibold md:text-sm">
                              {role.name}
                            </span>
                          </div>

                          {/* Mobile Action Dropdown */}
                          <div className="md:hidden">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-11 min-w-11 p-0"
                                  aria-label={`Actions for ${role.name}`}
                                >
                                  <Ellipsis
                                    className="size-5"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="min-w-44"
                              >
                                <DropdownMenuItem
                                  onClick={() => openRoleEditor(role)}
                                  className="gap-2"
                                >
                                  <Pencil
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={isDeleteBlocked}
                                  onClick={() => setDeletingRole(role)}
                                  className="text-destructive focus:text-destructive gap-2"
                                >
                                  <Trash2
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Actions */}
                      <div
                        role="cell"
                        className="hidden justify-end md:flex md:items-center"
                      >
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="min-h-9 min-w-9 p-0"
                              aria-label={`Actions for ${role.name}`}
                            >
                              <Ellipsis className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem
                              onClick={() => openRoleEditor(role)}
                              className="gap-2"
                            >
                              <Pencil
                                className="size-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isDeleteBlocked}
                              onClick={() => setDeletingRole(role)}
                              className="text-destructive focus:text-destructive gap-2"
                            >
                              <Trash2
                                className="size-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </ListTableBody>
            </ListTable>
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
