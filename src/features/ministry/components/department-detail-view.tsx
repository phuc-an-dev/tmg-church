"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Ellipsis,
  Loader2,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { StatusToast } from "@/components/ui/status-toast";
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
  section: "members" | "roles";
  department: StructureItem;
  members: DepartmentDetailMember[];
  roles: DepartmentServiceRole[];
  ministrySlug: string;
  termSlug: string;
}

export function DepartmentDetailView({
  section,
  department,
  members,
  roles,
}: DepartmentDetailViewProps) {
  const router = useRouter();

  // Toast feedback
  const [toast, setToast] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // MEMBERS STATE
  // ---------------------------------------------------------------------------
  const [expandedMemberId, setExpandedMemberId] = React.useState<string | null>(
    null,
  );
  const [assignDrawerOpen, setAssignDrawerOpen] = React.useState(false);
  const [assignDrawerSearch, setAssignDrawerSearch] = React.useState("");
  const [selectedMembershipIds, setSelectedMembershipIds] = React.useState<
    string[]
  >([]);
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

  const drawerAssignableMembers = React.useMemo(() => {
    const q = assignDrawerSearch.trim().toLowerCase();
    if (!q) return unassignedMembers;
    return unassignedMembers.filter(
      (m) =>
        m.memberName.toLowerCase().includes(q) ||
        m.memberSlug.toLowerCase().includes(q),
    );
  }, [unassignedMembers, assignDrawerSearch]);

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
    setAssignDrawerSearch("");
    setSelectedMembershipIds([]);
    setAssignDrawerError(null);
    setAssignDrawerOpen(true);
  }

  function toggleSelectMembership(id: string) {
    setSelectedMembershipIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleSelectAllDrawer() {
    const allIds = drawerAssignableMembers.map((m) => m.membershipId);
    setSelectedMembershipIds(allIds);
  }

  function handleDeselectAllDrawer() {
    setSelectedMembershipIds([]);
  }

  async function handleBatchAssign(e: React.FormEvent) {
    e.preventDefault();
    if (selectedMembershipIds.length === 0) return;
    setAssignPending(true);
    setAssignDrawerError(null);
    try {
      const res = await assignDepartmentMembersAction({
        termDepartmentId: department.id,
        membershipIds: selectedMembershipIds,
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
            <div
              role="table"
              aria-label="Department assigned members"
              className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
            >
              {/* Desktop table header */}
              <div role="rowgroup">
                <div
                  role="row"
                  className="bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:grid-cols-[1fr_80px] md:items-center md:border-b md:px-4 md:py-3"
                >
                  <div role="columnheader">Member</div>
                  <div role="columnheader" className="text-right">
                    Actions
                  </div>
                </div>
              </div>

              {/* Rows / Cards */}
              <div
                role="rowgroup"
                className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
              >
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setUnassignConfirmMember(m)}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 min-h-11 w-full gap-2 text-sm font-semibold"
                              aria-label={`Remove ${m.memberName} from ${department.name}`}
                            >
                              <UserMinus
                                className="size-4"
                                aria-hidden="true"
                              />
                              <span>Remove from department</span>
                            </Button>
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
              </div>
            </div>
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

      {/* =================================================================== */}
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
            <div
              role="table"
              aria-label="Department service roles"
              className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
            >
              {/* Desktop table header */}
              <div role="rowgroup">
                <div
                  role="row"
                  className="bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:grid-cols-[1fr_80px] md:items-center md:border-b md:px-4 md:py-3"
                >
                  <div role="columnheader">Role Name</div>
                  <div role="columnheader" className="text-right">
                    Actions
                  </div>
                </div>
              </div>

              {/* Rows / Cards */}
              <div
                role="rowgroup"
                className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
              >
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
              </div>
            </div>
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

      {/* =================================================================== */}
      {/* DRAWER: ASSIGN ENROLLED MEMBERS                                     */}
      {/* =================================================================== */}
      <ResponsiveEditor
        open={assignDrawerOpen}
        onOpenChange={setAssignDrawerOpen}
        title={`Assign to ${department.name}`}
        description="Select members enrolled in this term to assign to this department."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignDrawerOpen(false)}
              disabled={assignPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBatchAssign}
              disabled={assignPending || selectedMembershipIds.length === 0}
            >
              {assignPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>
                  {selectedMembershipIds.length > 0
                    ? `Assign (${selectedMembershipIds.length})`
                    : "Assign"}
                </span>
              )}
            </Button>
          </>
        }
      >
        <form onSubmit={handleBatchAssign} className="space-y-4">
          {assignDrawerError && (
            <div
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              role="alert"
            >
              {assignDrawerError}
            </div>
          )}

          {/* Search inside assign drawer */}
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={assignDrawerSearch}
              onChange={(e) => setAssignDrawerSearch(e.target.value)}
              placeholder="Search unassigned members..."
              className="min-h-11 pr-9 pl-9 text-base md:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
              aria-label="Filter unassigned members"
            />
            {assignDrawerSearch && (
              <button
                type="button"
                onClick={() => setAssignDrawerSearch("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 p-1"
                aria-label="Clear unassigned search"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Select all / Deselect all actions */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {drawerAssignableMembers.length}{" "}
              {drawerAssignableMembers.length === 1 ? "member" : "members"}{" "}
              available
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllDrawer}
                disabled={drawerAssignableMembers.length === 0}
                className="min-h-9 px-2 text-xs font-semibold"
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllDrawer}
                disabled={selectedMembershipIds.length === 0}
                className="min-h-9 px-2 text-xs font-semibold"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Member Picker List: Separate individual cards */}
          <div className="max-h-72 space-y-2 overflow-y-auto py-1 pr-1">
            {drawerAssignableMembers.length === 0 ? (
              <div className="border-border/60 bg-muted/20 rounded-xl border p-6 text-center">
                <p className="text-muted-foreground text-sm">
                  No unassigned members match your search.
                </p>
              </div>
            ) : (
              drawerAssignableMembers.map((m) => {
                const isSelected = selectedMembershipIds.includes(
                  m.membershipId,
                );
                return (
                  <button
                    key={m.membershipId}
                    type="button"
                    onClick={() => toggleSelectMembership(m.membershipId)}
                    className={cn(
                      "hover:bg-muted/60 flex min-h-14 w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 ring-primary/20 font-semibold ring-1"
                        : "border-border/70 bg-card",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-foreground block text-sm font-semibold sm:text-base">
                        {m.memberName}
                      </span>
                    </div>

                    {/* Checkbox box */}
                    <div
                      className={cn(
                        "ml-3 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-transparent",
                      )}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="size-3.5 stroke-3" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </form>
      </ResponsiveEditor>

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
