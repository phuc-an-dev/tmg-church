"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Check,
  Crown,
  Ellipsis,
  LogOut,
  Loader2,
  Plus,
  Pencil,
  Search,
  Shield,
  UserPlus,
  Users,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { StatusToast } from "@/components/ui/status-toast";
import { SessionEditorDrawer } from "@/features/session/components/session-editor-drawer";
import { deleteSessionAction } from "@/features/session/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  assignGroupMembersAction,
  leaveGroupAction,
  updateGroupMemberRoleAction,
  updateGroupMemberStatusAction,
} from "../group-actions";
import {
  GROUP_ROLE_LABELS,
  GROUP_ROLES,
  GROUP_STATUS_LABELS,
  type GroupRole,
} from "../group-schemas";
import type {
  EligibleTermMemberItem,
  GroupDetailData,
  GroupMemberItem,
} from "../group-queries";

interface GroupDetailViewProps {
  section: "members" | "sessions" | "history";
  ministrySlug: string;
  termSlug: string;
  groupSlug: string;
  data: GroupDetailData;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return iso;
  }
}

export function GroupDetailView({
  section,
  ministrySlug,
  termSlug,
  groupSlug,
  data,
}: GroupDetailViewProps) {
  const [toast, setToast] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [groupSessionOpen, setGroupSessionOpen] = React.useState(false);
  const router = useRouter();
  const [editingSession, setEditingSession] = React.useState<
    GroupDetailData["sessions"][number] | null
  >(null);
  const [deletingSession, setDeletingSession] = React.useState<
    GroupDetailData["sessions"][number] | null
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

  const pathContext = React.useMemo(
    () => ({ ministrySlug, termSlug, groupSlug }),
    [ministrySlug, termSlug, groupSlug],
  );

  // ---------------------------------------------------------------------------
  // ASSIGN MEMBERS DRAWER (BATCH ASSIGN MATCHING DEPARTMENT)
  // ---------------------------------------------------------------------------
  const [addDrawerOpen, setAddDrawerOpen] = React.useState(false);
  const [addSearch, setAddSearch] = React.useState("");
  const [selectedMembershipIds, setSelectedMembershipIds] = React.useState<
    string[]
  >([]);
  const [assignDrawerError, setAssignDrawerError] = React.useState<
    string | null
  >(null);
  const [addPending, setAddPending] = React.useState(false);

  // Moving members confirmation state (when any selected member is in another group)
  const [transferringMembers, setTransferringMembers] = React.useState<
    EligibleTermMemberItem[]
  >([]);
  const [transferConfirmOpen, setTransferConfirmOpen] = React.useState(false);
  const [transferPending, setTransferPending] = React.useState(false);

  // ---------------------------------------------------------------------------
  // ROLE EDITING STATE
  // ---------------------------------------------------------------------------
  const [editingRoleMember, setEditingRoleMember] =
    React.useState<GroupMemberItem | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<GroupRole>("member");
  const [rolePending, setRolePending] = React.useState(false);
  const [roleError, setRoleError] = React.useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // LEAVE GROUP STATE
  // ---------------------------------------------------------------------------
  const [leavingMember, setLeavingMember] =
    React.useState<GroupMemberItem | null>(null);
  const [leavePending, setLeavePending] = React.useState(false);

  // ---------------------------------------------------------------------------
  // STATUS TOGGLE & EXPANDED CARD STATE
  // ---------------------------------------------------------------------------
  const [statusPendingId, setStatusPendingId] = React.useState<string | null>(
    null,
  );
  const [expandedMemberId, setExpandedMemberId] = React.useState<string | null>(
    null,
  );
  const [expandedLeadershipRole, setExpandedLeadershipRole] =
    React.useState<GroupRole | null>(null);

  // Compute other members (members who are not in the leadership trio)
  const otherMembers = React.useMemo(() => {
    const leaderIds = new Set(
      [
        data.leadership.groupLeader?.id,
        data.leadership.deputyLeader?.id,
        data.leadership.bibleStudyLeader?.id,
      ].filter(Boolean),
    );
    return data.members.filter((m) => !leaderIds.has(m.id));
  }, [data.members, data.leadership]);

  // Filter eligible members for Assign Member drawer
  const filteredEligibleMembers = React.useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return data.eligibleMembers;
    return data.eligibleMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [data.eligibleMembers, addSearch]);

  function openAssignDrawer() {
    setAddSearch("");
    setSelectedMembershipIds([]);
    setAssignDrawerError(null);
    setAddDrawerOpen(true);
  }

  function toggleSelectMembership(id: string) {
    setSelectedMembershipIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleSelectAllDrawer() {
    const allIds = filteredEligibleMembers.map((m) => m.membershipId);
    setSelectedMembershipIds(allIds);
  }

  function handleDeselectAllDrawer() {
    setSelectedMembershipIds([]);
  }

  async function executeBatchAssign() {
    if (selectedMembershipIds.length === 0) return;

    setAddPending(true);
    setAssignDrawerError(null);
    try {
      const res = await assignGroupMembersAction(
        {
          groupId: data.group.id,
          membershipIds: selectedMembershipIds,
        },
        pathContext,
      );

      if (!res.success) {
        setAssignDrawerError(res.error ?? "Failed to assign members to group.");
      } else {
        setToast({
          type: "success",
          message: res.message ?? "Members assigned to group.",
        });
        setAddDrawerOpen(false);
        setSelectedMembershipIds([]);
      }
    } catch {
      setAssignDrawerError("Unexpected error assigning members to group.");
    } finally {
      setAddPending(false);
    }
  }

  async function handleAssignClick(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (selectedMembershipIds.length === 0) return;

    const selectedMembers = data.eligibleMembers.filter((m) =>
      selectedMembershipIds.includes(m.membershipId),
    );
    const inOtherGroup = selectedMembers.filter(
      (m) => m.currentGroupName !== null,
    );

    if (inOtherGroup.length > 0) {
      setTransferringMembers(inOtherGroup);
      setTransferConfirmOpen(true);
    } else {
      await executeBatchAssign();
    }
  }

  async function handleConfirmTransfer() {
    setTransferPending(true);
    try {
      await executeBatchAssign();
      setTransferConfirmOpen(false);
      setTransferringMembers([]);
    } finally {
      setTransferPending(false);
    }
  }

  // Handler: Save Role Change
  async function handleSaveRole() {
    if (!editingRoleMember) return;
    setRolePending(true);
    setRoleError(null);
    try {
      const res = await updateGroupMemberRoleAction(
        {
          recordId: editingRoleMember.id,
          role: selectedRole,
        },
        pathContext,
      );

      if (!res.success) {
        setRoleError(res.error ?? "Failed to update role");
      } else {
        setToast({
          type: "success",
          message: res.message ?? "Role updated successfully",
        });
        setEditingRoleMember(null);
      }
    } catch {
      setRoleError("Unexpected error updating role");
    } finally {
      setRolePending(false);
    }
  }

  // Handler: Toggle Member Status (active <-> inactive)
  async function handleToggleStatus(member: GroupMemberItem) {
    const nextStatus: "active" | "inactive" =
      member.status === "active" ? "inactive" : "active";

    setStatusPendingId(member.id);
    try {
      const res = await updateGroupMemberStatusAction(
        {
          recordId: member.id,
          status: nextStatus,
        },
        pathContext,
      );

      if (!res.success) {
        setToast({
          type: "error",
          message: res.error ?? "Failed to update status",
        });
      } else {
        setToast({
          type: "success",
          message: res.message ?? "Status updated",
        });
      }
    } catch {
      setToast({ type: "error", message: "Unexpected error updating status" });
    } finally {
      setStatusPendingId(null);
    }
  }

  // Handler: Confirm Leave Group
  async function handleConfirmLeave() {
    if (!leavingMember) return;
    setLeavePending(true);
    try {
      const res = await leaveGroupAction(
        { recordId: leavingMember.id },
        pathContext,
      );

      if (!res.success) {
        setToast({
          type: "error",
          message: res.error ?? "Failed to remove member",
        });
      } else {
        setToast({
          type: "success",
          message: `${leavingMember.name} has left the group.`,
        });
        setLeavingMember(null);
      }
    } catch {
      setToast({ type: "error", message: "Unexpected error leaving group" });
    } finally {
      setLeavePending(false);
    }
  }

  function openRoleEditor(member: GroupMemberItem, initialRole?: GroupRole) {
    setEditingRoleMember(member);
    setSelectedRole(initialRole ?? member.role);
    setRoleError(null);
  }

  // ---------------------------------------------------------------------------
  // ASSIGN LEADER DRAWER (LEADERSHIP CARDS FLOW)
  // ---------------------------------------------------------------------------
  const [assignLeaderTargetRole, setAssignLeaderTargetRole] =
    React.useState<GroupRole | null>(null);
  const [selectedLeaderRecordId, setSelectedLeaderRecordId] =
    React.useState<string>("");
  const [leaderSearch, setLeaderSearch] = React.useState("");
  const [leaderPending, setLeaderPending] = React.useState(false);
  const [leaderError, setLeaderError] = React.useState<string | null>(null);

  function openAssignLeaderDrawer(role: GroupRole) {
    const currentHolder = data.members.find(
      (m) => m.role === role && m.status === "active",
    );
    setSelectedLeaderRecordId(currentHolder?.id ?? "");
    setAssignLeaderTargetRole(role);
    setLeaderSearch("");
    setLeaderError(null);
  }

  const activeGroupMembers = React.useMemo(
    () => data.members.filter((m) => m.status === "active"),
    [data.members],
  );

  const filteredLeaderCandidates = React.useMemo(() => {
    const q = leaderSearch.trim().toLowerCase();
    if (!q) return activeGroupMembers;
    return activeGroupMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [activeGroupMembers, leaderSearch]);

  const currentLeaderHolder = React.useMemo(() => {
    if (!assignLeaderTargetRole) return null;
    return (
      data.members.find(
        (m) => m.role === assignLeaderTargetRole && m.status === "active",
      ) ?? null
    );
  }, [data.members, assignLeaderTargetRole]);

  async function handleSaveLeader() {
    if (!assignLeaderTargetRole) return;
    setLeaderPending(true);
    setLeaderError(null);

    try {
      if (selectedLeaderRecordId === "__none__") {
        if (currentLeaderHolder) {
          const res = await updateGroupMemberRoleAction(
            { recordId: currentLeaderHolder.id, role: "member" },
            pathContext,
          );
          if (!res.success) {
            setLeaderError(res.error ?? "Failed to vacate leadership role");
            return;
          }
          setToast({
            type: "success",
            message: `${GROUP_ROLE_LABELS[assignLeaderTargetRole]} is now unassigned.`,
          });
        }
        setAssignLeaderTargetRole(null);
        return;
      }

      if (!selectedLeaderRecordId) return;

      const res = await updateGroupMemberRoleAction(
        {
          recordId: selectedLeaderRecordId,
          role: assignLeaderTargetRole,
        },
        pathContext,
      );

      if (!res.success) {
        setLeaderError(res.error ?? "Failed to assign leader");
      } else {
        const assignedMember = data.members.find(
          (m) => m.id === selectedLeaderRecordId,
        );
        setToast({
          type: "success",
          message: assignedMember
            ? `Assigned ${assignedMember.name} as ${GROUP_ROLE_LABELS[assignLeaderTargetRole]}.`
            : "Leader updated successfully.",
        });
        setAssignLeaderTargetRole(null);
      }
    } catch {
      setLeaderError("Unexpected error updating leader role");
    } finally {
      setLeaderPending(false);
    }
  }

  function renderLeadershipCard(
    role: GroupRole,
    title: string,
    icon: React.ReactNode,
    iconBgClass: string,
    leader: GroupMemberItem | null,
  ) {
    const isExpanded = expandedLeadershipRole === role;

    return (
      <div className="bg-card border-border/80 flex flex-col justify-between rounded-xl border p-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          {/* Icon on the left */}
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              iconBgClass,
            )}
          >
            {icon}
          </div>

          {/* Leadership details */}
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {title}
            </span>

            {leader ? (
              <p className="text-foreground mt-0.5 text-base font-semibold md:text-sm">
                {leader.name}
              </p>
            ) : (
              <p className="text-muted-foreground mt-0.5 text-sm font-medium">
                Not assigned
              </p>
            )}
          </div>

          {/* Mobile 3-dot Toggle Button (no dropdown) */}
          <div className="flex shrink-0 items-center md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "-my-2 -mr-2 min-h-11 min-w-11 rounded-xl p-0",
                isExpanded && "bg-muted text-foreground",
              )}
              aria-label={`Actions for ${title}`}
              aria-expanded={isExpanded}
              onClick={() =>
                setExpandedLeadershipRole((prev) =>
                  prev === role ? null : role,
                )
              }
            >
              <Ellipsis className="size-5" aria-hidden="true" />
            </Button>
          </div>

          {/* Desktop 3-dot Dropdown */}
          <div className="hidden shrink-0 items-center md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-my-1 -mr-1 size-8"
                  aria-label={`Actions for ${title}`}
                >
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => openAssignLeaderDrawer(role)}>
                  {leader ? "Change Leader" : `Assign ${title}`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile action buttons displayed below card when expanded */}
        {isExpanded && (
          <div
            role="region"
            aria-label={`Actions for ${title}`}
            className="border-border/70 animate-in fade-in-0 mt-3 border-t pt-3 duration-150 motion-reduce:animate-none md:hidden"
          >
            <Button
              type="button"
              variant="outline"
              className="border-border/80 bg-background hover:bg-muted/80 text-foreground min-h-11 w-full gap-2 text-sm font-semibold shadow-xs"
              onClick={() => {
                setExpandedLeadershipRole(null);
                openAssignLeaderDrawer(role);
              }}
            >
              {leader ? (
                <span>Change Leader</span>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden="true" />
                  <span>Assign {title}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {toast && (
        <StatusToast message={toast.message} onDismiss={() => setToast(null)} />
      )}

      {/* =================================================================== */}
      {/* MEMBERS TAB                                                         */}
      {/* =================================================================== */}
      {section === "members" && (
        <div className="space-y-6">
          {/* LEADERSHIP SECTION */}
          <div className="space-y-3">
            <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
              Leadership
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Group Leader Card */}
              {renderLeadershipCard(
                "group_leader",
                "Group Leader",
                <Crown className="size-4" aria-hidden="true" />,
                "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                data.leadership.groupLeader,
              )}

              {/* Deputy Leader Card */}
              {renderLeadershipCard(
                "deputy_leader",
                "Deputy Leader",
                <Shield className="size-4" aria-hidden="true" />,
                "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                data.leadership.deputyLeader,
              )}

              {/* Bible Study Leader Card */}
              {renderLeadershipCard(
                "bible_study_leader",
                "Bible Study Leader",
                <BookOpen className="size-4" aria-hidden="true" />,
                "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                data.leadership.bibleStudyLeader,
              )}
            </div>
          </div>

          {/* OTHER MEMBERS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
                  Other Members ({otherMembers.length})
                </h2>
              </div>
              <Button
                type="button"
                size="sm"
                className="hidden min-h-11 text-sm md:inline-flex"
                onClick={openAssignDrawer}
              >
                <UserPlus className="mr-2 size-4" aria-hidden="true" />
                Assign Members
              </Button>
            </div>

            {otherMembers.length === 0 ? (
              <div className="border-border/80 bg-card rounded-xl border p-8 text-center shadow-xs">
                <Users
                  className="text-muted-foreground mx-auto size-10 stroke-1"
                  aria-hidden="true"
                />
                <h3 className="text-foreground mt-3 text-base font-semibold">
                  {data.members.length === 0
                    ? "No group members yet"
                    : "No other members"}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {data.members.length === 0
                    ? "Add enrolled term members to this group."
                    : "All current members are assigned to leadership roles above."}
                </p>
                <Button
                  type="button"
                  className="mt-4 min-h-11 text-sm"
                  onClick={openAssignDrawer}
                >
                  <UserPlus className="mr-2 size-4" aria-hidden="true" />
                  Assign Members
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div
                  role="table"
                  aria-label="Group Members"
                  className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
                >
                  <div role="rowgroup">
                    <div
                      role="row"
                      className="bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:grid-cols-[1fr_180px_120px_140px_100px] md:items-center md:border-b md:px-4 md:py-3"
                    >
                      <div role="columnheader">Name</div>
                      <div role="columnheader">Role</div>
                      <div role="columnheader">Status</div>
                      <div role="columnheader">Joined Date</div>
                      <div role="columnheader" className="text-right">
                        Actions
                      </div>
                    </div>
                  </div>

                  {/* Mobile & Desktop Rows */}
                  <div
                    role="rowgroup"
                    className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
                  >
                    {otherMembers.map((member) => {
                      const isPending = statusPendingId === member.id;
                      const isExpanded = expandedMemberId === member.id;
                      return (
                        <div
                          key={member.id}
                          role="row"
                          className="bg-card border-border/80 rounded-xl border p-4 shadow-xs md:grid md:grid-cols-[1fr_180px_120px_140px_100px] md:items-center md:rounded-none md:border-0 md:p-3 md:shadow-none"
                        >
                          {/* Name Column */}
                          <div role="cell" className="min-w-0">
                            <div className="flex items-center justify-between gap-3 md:justify-start">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-foreground text-base font-semibold md:text-sm">
                                    {member.name}
                                  </p>
                                  {/* Mobile badges on the same row as name */}
                                  <div className="flex flex-wrap items-center gap-1.5 md:hidden">
                                    {member.role !== "member" && (
                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                          member.role === "group_leader"
                                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                            : member.role === "deputy_leader"
                                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                              : "bg-purple-500/10 text-purple-700 dark:text-purple-300",
                                        )}
                                      >
                                        {GROUP_ROLE_LABELS[member.role]}
                                      </span>
                                    )}
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                        member.status === "active"
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : "bg-muted text-muted-foreground",
                                      )}
                                    >
                                      {GROUP_STATUS_LABELS[member.status]}
                                    </span>
                                  </div>
                                </div>
                                {/* Mobile joined date */}
                                <p className="text-muted-foreground mt-1 text-xs md:hidden">
                                  Joined {formatDate(member.joinedAt)}
                                </p>
                              </div>

                              {/* Mobile 3-dot Toggle Button (no dropdown) */}
                              <div className="flex items-center md:hidden">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "min-h-11 min-w-11 rounded-xl p-0",
                                    isExpanded && "bg-muted text-foreground",
                                  )}
                                  aria-label={`Actions for ${member.name}`}
                                  aria-expanded={isExpanded}
                                  onClick={() =>
                                    setExpandedMemberId((prev) =>
                                      prev === member.id ? null : member.id,
                                    )
                                  }
                                >
                                  <Ellipsis
                                    className="size-5"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </div>
                            </div>

                            {/* Mobile action buttons displayed below card when expanded */}
                            {isExpanded && (
                              <div
                                role="region"
                                aria-label={`Actions for ${member.name}`}
                                className="border-border/70 animate-in fade-in-0 mt-3 border-t pt-3 duration-150 motion-reduce:animate-none md:hidden"
                              >
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-border/80 bg-background hover:bg-muted/80 text-foreground min-h-11 w-full gap-2 text-sm font-semibold shadow-xs"
                                    onClick={() => {
                                      setExpandedMemberId(null);
                                      openRoleEditor(member);
                                    }}
                                  >
                                    <span>Change Role</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-border/80 bg-background hover:bg-muted/80 text-foreground min-h-11 w-full gap-2 text-sm font-semibold shadow-xs"
                                    onClick={() => handleToggleStatus(member)}
                                    disabled={isPending}
                                  >
                                    {isPending && (
                                      <Loader2 className="size-4 animate-spin" />
                                    )}
                                    <span>
                                      {member.status === "active"
                                        ? "Mark Inactive"
                                        : "Mark Active"}
                                    </span>
                                  </Button>
                                </div>
                                <div className="mt-2">
                                  <DestructiveActionButton
                                    type="button"
                                    className="min-h-11 w-full"
                                    onClick={() => {
                                      setExpandedMemberId(null);
                                      setLeavingMember(member);
                                    }}
                                    label="Leave Group"
                                    icon={LogOut}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Role Column (Desktop) */}
                          <div role="cell" className="hidden text-sm md:block">
                            {member.role !== "member" ? (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  member.role === "group_leader"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : member.role === "deputy_leader"
                                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300",
                                )}
                              >
                                {GROUP_ROLE_LABELS[member.role]}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </div>

                          {/* Status Column (Desktop) */}
                          <div role="cell" className="hidden text-sm md:block">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                member.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {GROUP_STATUS_LABELS[member.status]}
                            </span>
                          </div>

                          {/* Joined Date (Desktop) */}
                          <div
                            role="cell"
                            className="text-muted-foreground hidden text-xs md:block"
                          >
                            {formatDate(member.joinedAt)}
                          </div>

                          {/* Actions Column (Desktop) */}
                          <div
                            role="cell"
                            className="hidden justify-end md:flex"
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-9 min-h-9 min-w-9"
                                  aria-label={`Actions for ${member.name}`}
                                >
                                  <Ellipsis className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => openRoleEditor(member)}
                                >
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(member)}
                                  disabled={isPending}
                                >
                                  {member.status === "active"
                                    ? "Mark Inactive"
                                    : "Mark Active"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setLeavingMember(member)}
                                >
                                  Leave Group
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Floating 'Assign Members' Button */}
          <FloatingCreateButton
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            onClick={openAssignDrawer}
            disabled={filteredEligibleMembers.length === 0}
            aria-label="Assign members to group"
          >
            <span>Assign Members</span>
          </FloatingCreateButton>
        </div>
      )}

      {section === "sessions" && (
        <div className="space-y-4">
          <div>
            <div>
              <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
                Sessions ({data.sessions.length})
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Sessions for {data.group.name}.
              </p>
            </div>
          </div>
          {data.sessions.length === 0 ? (
            <div className="border-border/80 bg-card rounded-xl border p-8 text-center shadow-xs">
              <CalendarDays
                className="text-muted-foreground mx-auto size-10 stroke-1"
                aria-hidden="true"
              />
              <h3 className="text-foreground mt-3 text-base font-semibold">
                No sessions yet
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Create the first session for this group.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {data.sessions.map((session) => (
                <div
                  key={session.id}
                  className="border-border/80 bg-card rounded-xl border p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/sessions/${session.slug}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="font-semibold">{session.title}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {session.sessionDate} · {session.participantCount}{" "}
                        participants
                      </p>
                    </Link>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-11 min-w-11 p-0"
                          aria-label={`Actions for ${session.title}`}
                        >
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingSession(session);
                            setGroupSessionOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!session.canDelete}
                          onClick={() => setDeletingSession(session)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
          <FloatingCreateButton
            icon={<CalendarDays className="size-5" aria-hidden="true" />}
            onClick={() => {
              setEditingSession(null);
              setGroupSessionOpen(true);
            }}
            aria-label="Create session for group"
          >
            Create session
          </FloatingCreateButton>
        </div>
      )}

      {/* =================================================================== */}
      {/* HISTORY TAB                                                         */}
      {/* =================================================================== */}
      {section === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
              Membership History ({data.history.length})
            </h2>
          </div>

          {data.history.length === 0 ? (
            <div className="border-border/80 bg-card rounded-xl border p-8 text-center shadow-xs">
              <Users
                className="text-muted-foreground mx-auto size-10 stroke-1"
                aria-hidden="true"
              />
              <h3 className="text-foreground mt-3 text-base font-semibold">
                No past membership records
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                When members transfer to another group or leave, their closed
                records will be preserved here.
              </p>
            </div>
          ) : (
            <div
              role="table"
              aria-label="Membership History"
              className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
            >
              <div role="rowgroup">
                <div
                  role="row"
                  className="bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:grid-cols-[1fr_160px_140px_140px_120px] md:items-center md:border-b md:px-4 md:py-3"
                >
                  <div role="columnheader">Name</div>
                  <div role="columnheader">Role Held</div>
                  <div role="columnheader">Joined Date</div>
                  <div role="columnheader">Ended Date</div>
                  <div role="columnheader">Final Status</div>
                </div>
              </div>

              <div
                role="rowgroup"
                className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
              >
                {data.history.map((record) => (
                  <div
                    key={record.id}
                    role="row"
                    className="bg-card border-border/80 rounded-xl border p-4 shadow-xs md:grid md:grid-cols-[1fr_160px_140px_140px_120px] md:items-center md:rounded-none md:border-0 md:p-3 md:shadow-none"
                  >
                    <div role="cell" className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-foreground text-base font-semibold md:text-sm">
                          {record.name}
                        </p>
                        {/* Mobile badges on same row as name */}
                        <div className="flex flex-wrap items-center gap-1.5 md:hidden">
                          {record.role !== "member" && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                record.role === "group_leader"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  : record.role === "deputy_leader"
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                    : "bg-purple-500/10 text-purple-700 dark:text-purple-300",
                              )}
                            >
                              {GROUP_ROLE_LABELS[record.role]}
                            </span>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              record.status === "transferred"
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {record.status}
                          </span>
                        </div>
                      </div>
                      {/* Mobile dates */}
                      <p className="text-muted-foreground mt-1 text-xs md:hidden">
                        {formatDate(record.joinedAt)} →{" "}
                        {formatDate(record.endedAt)}
                      </p>
                    </div>

                    <div
                      role="cell"
                      className="text-muted-foreground hidden text-sm md:block"
                    >
                      {record.role !== "member"
                        ? GROUP_ROLE_LABELS[record.role]
                        : "—"}
                    </div>

                    <div
                      role="cell"
                      className="text-muted-foreground hidden text-xs md:block"
                    >
                      {formatDate(record.joinedAt)}
                    </div>

                    <div
                      role="cell"
                      className="text-muted-foreground hidden text-xs md:block"
                    >
                      {formatDate(record.endedAt)}
                    </div>

                    <div role="cell" className="hidden text-sm md:block">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          record.status === "transferred"
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* DRAWER: ASSIGN ENROLLED MEMBERS                                     */}
      {/* =================================================================== */}
      <ResponsiveEditor
        open={addDrawerOpen}
        onOpenChange={(open) => {
          setAddDrawerOpen(open);
          if (!open) {
            setSelectedMembershipIds([]);
            setAssignDrawerError(null);
          }
        }}
        title={`Assign to ${data.group.name}`}
        description="Select members enrolled in this term to assign to this group."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDrawerOpen(false)}
              disabled={addPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssignClick}
              disabled={addPending || selectedMembershipIds.length === 0}
            >
              {addPending ? (
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
        <form onSubmit={handleAssignClick} className="space-y-4">
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
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Search unassigned members..."
              className="min-h-11 pr-9 pl-9 text-base md:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
              aria-label="Filter unassigned members"
            />
            {addSearch && (
              <button
                type="button"
                onClick={() => setAddSearch("")}
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
              {filteredEligibleMembers.length}{" "}
              {filteredEligibleMembers.length === 1 ? "member" : "members"}{" "}
              available
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllDrawer}
                disabled={filteredEligibleMembers.length === 0}
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
            {filteredEligibleMembers.length === 0 ? (
              <div className="border-border/60 bg-muted/20 rounded-xl border p-6 text-center">
                <p className="text-muted-foreground text-sm">
                  No unassigned members match your search.
                </p>
              </div>
            ) : (
              filteredEligibleMembers.map((m) => {
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
                        {m.name}
                      </span>
                      {m.currentGroupName && (
                        <span className="text-muted-foreground block text-xs">
                          Currently in {m.currentGroupName}
                        </span>
                      )}
                    </div>

                    {/* Checkbox box / circle */}
                    <div
                      className={cn(
                        "ml-3 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
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
      {/* CONFIRMATION: MOVE MEMBERS FROM ANOTHER GROUP                       */}
      {/* =================================================================== */}
      <ConfirmationSheet
        open={transferConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTransferConfirmOpen(false);
            setTransferringMembers([]);
          }
        }}
        title={
          transferringMembers.length === 1
            ? "Move member to group?"
            : `Move ${transferringMembers.length} members to group?`
        }
        description={
          transferringMembers.length === 1 ? (
            <span>
              <strong>{transferringMembers[0].name}</strong> is currently
              assigned to{" "}
              <strong>{transferringMembers[0].currentGroupName}</strong>. Moving
              them will close their previous membership as <em>Transferred</em>{" "}
              and add them to <strong>{data.group.name}</strong> as an active
              member.
            </span>
          ) : (
            <span>
              <strong>{transferringMembers.length} members</strong> are
              currently assigned to other groups. Moving them will close their
              previous memberships as <em>Transferred</em> and add them to{" "}
              <strong>{data.group.name}</strong> as active members.
            </span>
          )
        }
        confirmLabel={
          transferringMembers.length === 1 ? "Move Member" : "Move Members"
        }
        variant="default"
        pending={transferPending || addPending}
        onConfirm={handleConfirmTransfer}
      />

      {/* =================================================================== */}
      {/* DRAWER: ASSIGN LEADER ROLE                                          */}
      {/* =================================================================== */}
      <ResponsiveEditor
        open={Boolean(assignLeaderTargetRole)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignLeaderTargetRole(null);
            setLeaderError(null);
          }
        }}
        title={
          assignLeaderTargetRole
            ? `Assign ${GROUP_ROLE_LABELS[assignLeaderTargetRole]}`
            : "Assign Leader"
        }
        description={
          assignLeaderTargetRole
            ? `Select an active member of ${data.group.name} to assign as ${GROUP_ROLE_LABELS[assignLeaderTargetRole]}.`
            : ""
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setAssignLeaderTargetRole(null)}
              disabled={leaderPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={handleSaveLeader}
              disabled={leaderPending || !selectedLeaderRecordId}
            >
              {leaderPending ? (
                <>
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {leaderError && (
            <div
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              role="alert"
            >
              {leaderError}
            </div>
          )}

          {activeGroupMembers.length === 0 ? (
            <div className="border-border/60 bg-muted/20 space-y-3 rounded-xl border p-6 text-center">
              <p className="text-muted-foreground text-sm">
                No active members in this group yet. Please assign members to
                the group first.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-sm font-semibold"
                onClick={() => {
                  setAssignLeaderTargetRole(null);
                  openAssignDrawer();
                }}
              >
                <UserPlus className="mr-2 size-4" />
                Assign Members to Group
              </Button>
            </div>
          ) : (
            <>
              {activeGroupMembers.length > 5 && (
                <div className="relative">
                  <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={leaderSearch}
                    onChange={(e) => setLeaderSearch(e.target.value)}
                    placeholder="Search active group members..."
                    className="min-h-11 pr-9 pl-9 text-base md:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
                    aria-label="Filter group members for leadership assignment"
                  />
                  {leaderSearch && (
                    <button
                      type="button"
                      onClick={() => setLeaderSearch("")}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 p-1"
                      aria-label="Clear search"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              <div
                role="radiogroup"
                aria-label="Select leader candidate"
                className="max-h-72 space-y-2 overflow-y-auto py-1 pr-1"
              >
                {/* Option to vacate if currently occupied */}
                {currentLeaderHolder && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedLeaderRecordId === "__none__"}
                    onClick={() => setSelectedLeaderRecordId("__none__")}
                    className={cn(
                      "hover:bg-muted/60 flex min-h-14 w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-colors",
                      selectedLeaderRecordId === "__none__"
                        ? "border-primary bg-primary/5 ring-primary/20 font-semibold ring-1"
                        : "border-border/70 bg-card",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-foreground block text-sm font-semibold">
                        Leave Unassigned
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        Remove current leader without appointing a replacement.
                      </span>
                    </div>
                    <div
                      className={cn(
                        "ml-3 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        selectedLeaderRecordId === "__none__"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-transparent",
                      )}
                      aria-hidden="true"
                    >
                      {selectedLeaderRecordId === "__none__" && (
                        <Check className="size-3.5 stroke-3" />
                      )}
                    </div>
                  </button>
                )}

                {filteredLeaderCandidates.map((m) => {
                  const isSelected = selectedLeaderRecordId === m.id;
                  const isCurrentHolder =
                    assignLeaderTargetRole && m.role === assignLeaderTargetRole;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedLeaderRecordId(m.id)}
                      className={cn(
                        "hover:bg-muted/60 flex min-h-14 w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5 ring-primary/20 font-semibold ring-1"
                          : "border-border/70 bg-card",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground block text-sm font-semibold sm:text-base">
                            {m.name}
                          </span>
                          {isCurrentHolder && (
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                              Current
                            </span>
                          )}
                          {!isCurrentHolder && m.role !== "member" && (
                            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                              {GROUP_ROLE_LABELS[m.role]}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground block text-xs">
                          Joined {formatDate(m.joinedAt)}
                        </span>
                      </div>

                      <div
                        className={cn(
                          "ml-3 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
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
                })}
              </div>
            </>
          )}
        </div>
      </ResponsiveEditor>

      {/* =================================================================== */}
      {/* DRAWER: EDIT ROLE                                                   */}
      {/* =================================================================== */}
      <ResponsiveEditor
        open={Boolean(editingRoleMember)}
        onOpenChange={(open) => !open && setEditingRoleMember(null)}
        title="Change Group Role"
        description={
          editingRoleMember ? `Assign role for ${editingRoleMember.name}.` : ""
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setEditingRoleMember(null)}
              disabled={rolePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={handleSaveRole}
              disabled={rolePending}
            >
              {rolePending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Role"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {roleError && (
            <div
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              role="alert"
            >
              {roleError}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select Role</Label>
            <div
              role="radiogroup"
              aria-label="Group role options"
              className="space-y-2"
            >
              {GROUP_ROLES.map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:bg-muted text-foreground",
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {GROUP_ROLE_LABELS[role]}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {role === "group_leader" &&
                          "Single active leader overseeing the group."}
                        {role === "deputy_leader" &&
                          "Single active deputy supporting group leadership."}
                        {role === "bible_study_leader" &&
                          "Single active leader facilitating scripture study."}
                        {role === "member" &&
                          "Standard active member of the group."}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="text-primary ml-2 size-5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ResponsiveEditor>

      {/* =================================================================== */}
      {/* CONFIRMATION: LEAVE GROUP                                           */}
      {/* =================================================================== */}
      <ConfirmationSheet
        open={Boolean(leavingMember)}
        onOpenChange={(open) => !open && setLeavingMember(null)}
        title="Remove member from group?"
        description={
          leavingMember ? (
            <span>
              Are you sure you want to remove{" "}
              <strong>{leavingMember.name}</strong> from{" "}
              <strong>{data.group.name}</strong>? Their status will be recorded
              as <em>Left</em> and membership history will be retained.
            </span>
          ) : (
            ""
          )
        }
        confirmLabel="Remove Member"
        pending={leavePending}
        onConfirm={handleConfirmLeave}
      />
      <SessionEditorDrawer
        key={editingSession?.id ?? "new"}
        open={groupSessionOpen}
        onOpenChange={(open) => {
          setGroupSessionOpen(open);
          if (!open) setEditingSession(null);
        }}
        scope={{
          groupId: data.group.id,
          ministryTermId: data.group.ministryTermId,
        }}
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
    </div>
  );
}
