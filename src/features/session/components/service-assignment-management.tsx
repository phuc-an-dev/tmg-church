"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LockKeyhole, Plus, Users } from "lucide-react";
import { cn } from "cn";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { IdentityTile } from "@/components/shared/identity-picker";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import {
  ListTable,
  ListTableBody,
  ListTableHeader,
} from "@/components/shared/list-table";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { StatusToast } from "@/components/ui/status-toast";
import {
  batchSaveServiceAssignmentsAction,
  removeServiceAssignmentAction,
  setSessionServiceRolesAction,
} from "../actions";
import type {
  SessionDepartmentOption,
  SessionServiceAssignmentData,
  SessionServiceAssignment,
} from "../types";

interface ServiceAssignmentManagementProps {
  assignmentData: SessionServiceAssignmentData;
  returnUrl?: string;
}

export function ServiceAssignmentManagement({
  assignmentData,
  returnUrl,
}: ServiceAssignmentManagementProps) {
  const router = useRouter();
  const {
    session,
    departments = [],
    assignments = [],
    enrolledMembers = [],
    selectedRoleIds = [],
  } = assignmentData;

  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [serviceRolesDrawerOpen, setServiceRolesDrawerOpen] =
    React.useState(false);
  const [draftRoleIds, setDraftRoleIds] = React.useState<string[]>([]);

  // Role assignment drawer state
  const [assignDrawerOpen, setAssignDrawerOpen] = React.useState(false);
  const [targetDept, setTargetDept] =
    React.useState<SessionDepartmentOption | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>(
    [],
  );

  const selectedDepartments = React.useMemo(
    () =>
      departments
        .map((department) => ({
          ...department,
          roles: department.roles.filter((role) =>
            selectedRoleIds.includes(role.id),
          ),
        }))
        .filter((department) => department.roles.length > 0),
    [departments, selectedRoleIds],
  );

  function openServiceRolesDrawer() {
    setDraftRoleIds(selectedRoleIds);
    setServiceRolesDrawerOpen(true);
  }

  async function saveServiceRoles() {
    setPending(true);
    try {
      const result = await setSessionServiceRolesAction({
        sessionId: session.id,
        roleIds: draftRoleIds,
      });
      if (!result.success) {
        setFeedback(result.error ?? "Unable to update service roles.");
        return;
      }
      setServiceRolesDrawerOpen(false);
      setFeedback(result.message ?? "Service roles updated.");
      router.refresh();
    } catch {
      setFeedback("Unable to update service roles.");
    } finally {
      setPending(false);
    }
  }

  function openAssignDrawer(dept: SessionDepartmentOption, roleId: string) {
    setTargetDept(dept);
    setSelectedRoleId(roleId);
    setSelectedMemberIds(
      assignments
        .filter(
          (assignment) =>
            assignment.termDepartmentId === dept.id &&
            assignment.departmentServiceRoleId === roleId,
        )
        .map((assignment) => assignment.ministryMembershipId),
    );
    setAssignDrawerOpen(true);
  }

  function getAssignmentChanges(memberIds: readonly string[]) {
    if (!targetDept || !selectedRoleId) return { additions: [], removals: [] };
    const currentAssignments = assignments.filter(
      (assignment) =>
        assignment.termDepartmentId === targetDept.id &&
        assignment.departmentServiceRoleId === selectedRoleId,
    );
    const currentMemberIds = new Set(
      currentAssignments.map((assignment) => assignment.ministryMembershipId),
    );

    return {
      additions: memberIds.filter((id) => !currentMemberIds.has(id)),
      removals: currentAssignments.filter(
        (assignment) => !memberIds.includes(assignment.ministryMembershipId),
      ),
    };
  }

  const assignmentChanges = getAssignmentChanges(selectedMemberIds);

  async function applyAssignmentChanges(changes: {
    additions: string[];
    removals: SessionServiceAssignment[];
  }) {
    setPending(true);
    try {
      if (changes.additions.length > 0) {
        const result = await batchSaveServiceAssignmentsAction({
          sessionId: session.id,
          roleId: selectedRoleId,
          membershipIds: changes.additions,
        });
        if (!result.success) {
          setFeedback(result.error ?? "Failed to assign members.");
          return;
        }
      }

      for (const assignment of changes.removals) {
        const result = await removeServiceAssignmentAction({
          sessionId: session.id,
          assignmentId: assignment.id,
        });
        if (!result.success) {
          setFeedback(result.error ?? "Failed to remove assignment.");
          return;
        }
      }

      setAssignDrawerOpen(false);
      setFeedback("Service assignments updated.");
      router.refresh();
    } catch {
      setFeedback("Unable to save service assignments.");
    } finally {
      setPending(false);
    }
  }

  function handleSaveAssignment(memberIds: string[]) {
    const changes = getAssignmentChanges(memberIds);
    if (changes.additions.length === 0 && changes.removals.length === 0) {
      return;
    }

    void applyAssignmentChanges(changes);
  }

  const totalRoles = selectedDepartments.reduce(
    (acc, dept) => acc + dept.roles.length,
    0,
  );

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

      {/* 2. Navigation Tabs */}
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

      {/* 3. Summary Stats */}
      <section aria-label="Service assignment summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Total Assignments
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {assignments.length}
            </p>
          </div>
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Configured Roles
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {totalRoles}
            </p>
          </div>
          <div className="border-border/80 bg-card col-span-2 rounded-xl border p-3.5 shadow-2xs sm:col-span-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Departments
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {selectedDepartments.length}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Selected service roles */}
      {selectedDepartments.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center sm:p-12">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <Users className="size-6" />
          </div>
          <h2 className="text-foreground mt-3 text-base font-semibold">
            No service roles selected
          </h2>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
            Select the service roles needed for this session, then assign
            members to them.
          </p>
          <Button
            type="button"
            className="mt-4 min-h-11"
            onClick={openServiceRolesDrawer}
          >
            <Plus className="size-4" />
            Select service roles
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* If 0 roles configured yet, show an informational banner */}
          {totalRoles === 0 && (
            <div className="bg-muted/20 space-y-3 rounded-2xl border border-dashed p-6 text-center sm:p-8">
              <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
                <Users className="size-6" />
              </div>
              <div>
                <h2 className="text-foreground text-base font-semibold">
                  No service roles configured yet
                </h2>
                <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
                  Configure service roles in the department structure to start
                  assigning volunteers for this session.
                </p>
              </div>
              {assignmentData.ministrySlug && assignmentData.termSlug && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="min-h-11"
                  >
                    <Link
                      href={`/admin/ministries/${assignmentData.ministrySlug}/terms/${assignmentData.termSlug}?section=departments`}
                    >
                      <span>Open Department Structure</span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Service roster */}
          <ExpandableCoordinatorProvider>
            <div className="space-y-8">
              {selectedDepartments.map((dept) => {
                const deptAssignments = assignments.filter(
                  (a) => a.termDepartmentId === dept.id,
                );
                const staffedRoleCount = dept.roles.filter((role) =>
                  deptAssignments.some(
                    (assignment) =>
                      assignment.departmentServiceRoleId === role.id,
                  ),
                ).length;

                return (
                  <section key={dept.id} className="space-y-2">
                    <div className="flex items-center gap-3 px-1">
                      <IdentityTile
                        accentColor={dept.accentColor}
                        iconKey={dept.iconKey}
                        className="size-10 rounded-xl !border-0"
                      />
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">
                          {dept.name}
                        </h2>
                        <p className="text-muted-foreground text-xs">
                          {staffedRoleCount}/{dept.roles.length} staffed
                        </p>
                      </div>
                    </div>

                    <div className="border-border/70 ml-5 border-l pl-4 md:ml-0 md:border-l-0 md:pl-0">
                      <ListTable label={`Service roles for ${dept.name}`}>
                        <ListTableHeader gridClassName="md:grid-cols-[1fr_80px]">
                          <div role="columnheader">Role</div>
                          <div role="columnheader" className="text-right">
                            Actions
                          </div>
                        </ListTableHeader>
                        <ListTableBody>
                          {dept.roles.map((role) => {
                            const roleAssignments = deptAssignments.filter(
                              (assignment) =>
                                assignment.departmentServiceRoleId === role.id,
                            );

                            return (
                              <ExpandableActionItem
                                key={role.id}
                                id={`session-role-${session.id}-${role.id}`}
                                name={`${dept.name} ${role.name}`}
                                onEdit={() => openAssignDrawer(dept, role.id)}
                                editLabel="Manage"
                                className="before:bg-border/70 p-4 before:absolute before:top-1/2 before:-left-4 before:h-px before:w-4 md:grid md:grid-cols-[1fr_80px] md:items-center md:gap-4 md:p-3 md:before:hidden"
                              >
                                <div role="cell" className="min-w-0">
                                  <div className="flex min-w-0 items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-base font-semibold md:text-sm">
                                        {role.name}
                                      </p>
                                      {roleAssignments.length === 0 ? (
                                        <p className="text-muted-foreground mt-0.5 text-sm">
                                          Unassigned
                                        </p>
                                      ) : (
                                        <p className="text-muted-foreground mt-0.5 truncate text-sm">
                                          {roleAssignments
                                            .map(
                                              (assignment) =>
                                                assignment.memberName,
                                            )
                                            .join(" · ")}
                                        </p>
                                      )}
                                    </div>
                                    <ExpandableActionItem.Trigger className="md:hidden" />
                                  </div>
                                  <ExpandableActionItem.MobileActions />
                                </div>
                                <div
                                  role="cell"
                                  className="hidden justify-end md:flex"
                                >
                                  <ExpandableActionItem.DesktopActions />
                                </div>
                              </ExpandableActionItem>
                            );
                          })}
                        </ListTableBody>
                      </ListTable>
                    </div>
                  </section>
                );
              })}
            </div>
          </ExpandableCoordinatorProvider>
        </div>
      )}

      <FloatingCreateButton
        onClick={openServiceRolesDrawer}
        icon={<Plus className="size-5" />}
      >
        Configure service roles
      </FloatingCreateButton>

      <ResponsiveEditor
        open={serviceRolesDrawerOpen}
        onOpenChange={setServiceRolesDrawerOpen}
        title="Service roles"
        description="Choose the roles needed for this session."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              disabled={pending}
              onClick={() => setServiceRolesDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full"
              disabled={pending}
              onClick={() => void saveServiceRoles()}
            >
              Save roles
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {departments.map((department) => {
            return (
              <section key={department.id} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <IdentityTile
                    accentColor={department.accentColor}
                    iconKey={department.iconKey}
                    className="size-10 rounded-xl !border-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {department.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {
                        department.roles.filter((role) =>
                          draftRoleIds.includes(role.id),
                        ).length
                      }
                      /{department.roles.length} selected
                    </p>
                  </div>
                </div>
                <div className="border-border/70 relative ml-5 space-y-2 border-l pl-4">
                  {department.roles.map((role) => {
                    const selected = draftRoleIds.includes(role.id);
                    const locked =
                      selected &&
                      assignments.some(
                        (assignment) =>
                          assignment.departmentServiceRoleId === role.id,
                      );

                    return (
                      <button
                        key={role.id}
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          setDraftRoleIds((current) =>
                            selected
                              ? current.filter((id) => id !== role.id)
                              : [...current, role.id],
                          )
                        }
                        className={cn(
                          "before:bg-border/70 relative flex min-h-14 w-full items-center justify-between rounded-xl border p-3.5 text-left before:absolute before:top-1/2 before:-left-4 before:h-px before:w-4",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border/70 bg-card",
                          locked && "cursor-not-allowed",
                        )}
                      >
                        <span className="min-w-0 truncate font-semibold">
                          {role.name}
                        </span>
                        {locked ? (
                          <LockKeyhole
                            aria-label="Role has assignments"
                            className="text-muted-foreground size-4 shrink-0"
                          />
                        ) : selected ? (
                          <Check className="text-primary size-5 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </ResponsiveEditor>

      <MemberAssignDrawer
        open={assignDrawerOpen}
        onOpenChange={(open) => !open && setAssignDrawerOpen(false)}
        title={
          targetDept
            ? `Manage · ${targetDept.name} / ${targetDept.roles.find((role) => role.id === selectedRoleId)?.name ?? "Role"}`
            : "Manage volunteers"
        }
        description={`Select members from ${targetDept?.name ?? "department"}`}
        searchPlaceholder={`Search members in ${targetDept?.name ?? "department"}...`}
        members={enrolledMembers
          .filter((member) =>
            targetDept ? member.departmentIds.includes(targetDept.id) : false,
          )
          .map((member) => {
            const assignedRoles = assignments
              .filter(
                (assignment) =>
                  assignment.ministryMembershipId === member.membershipId &&
                  assignment.termDepartmentId === targetDept?.id,
              )
              .map((assignment) => assignment.departmentServiceRoleName);

            return {
              id: member.membershipId,
              name: member.memberName,
              gender: member.gender,
              subtitle:
                assignedRoles.length > 0
                  ? `Assigned: ${assignedRoles.join(", ")}`
                  : null,
            };
          })}
        selectedIds={selectedMemberIds}
        onSelectedIdsChange={setSelectedMemberIds}
        onAssign={handleSaveAssignment}
        pending={pending}
        assignLabel="Save changes"
        isSubmitDisabled={
          assignmentChanges.additions.length === 0 &&
          assignmentChanges.removals.length === 0
        }
        emptySearchMessage="No members match your search."
        emptyListMessage={`No members in ${targetDept?.name ?? "this department"}.`}
      />

      {/* 4. Toast Feedback */}
      {feedback && (
        <StatusToast message={feedback} onDismiss={() => setFeedback(null)} />
      )}
    </div>
  );
}
