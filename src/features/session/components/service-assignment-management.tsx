"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, Search, Users, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { StatusToast } from "@/components/ui/status-toast";
import { DynamicLucideIcon } from "@/features/ministry/components/dynamic-lucide-icon";
import { normalizeMinistryColor } from "@/features/ministry/visual-identity";
import {
  batchSaveServiceAssignmentsAction,
  removeServiceAssignmentAction,
  saveServiceAssignmentAction,
} from "../actions";
import type {
  SessionDepartmentOption,
  SessionServiceAssignmentData,
  SessionServiceAssignment,
} from "../types";

interface ServiceAssignmentManagementProps {
  assignmentData: SessionServiceAssignmentData;
}

export function ServiceAssignmentManagement({
  assignmentData,
}: ServiceAssignmentManagementProps) {
  const router = useRouter();
  const { session, departments, assignments, enrolledMembers } = assignmentData;

  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Assign Drawer Wizard state
  const [assignDrawerOpen, setAssignDrawerOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState<1 | 2>(1);
  const [targetDept, setTargetDept] =
    React.useState<SessionDepartmentOption | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>(
    [],
  );
  const [memberSearchDraft, setMemberSearchDraft] = React.useState("");

  // Remove confirmation state
  const [removingAssignment, setRemovingAssignment] =
    React.useState<SessionServiceAssignment | null>(null);

  function openAssignDrawer(dept: SessionDepartmentOption) {
    setTargetDept(dept);
    setWizardStep(1);
    setSelectedRoleId(dept.roles[0]?.id ?? "");
    setSelectedMemberIds([]);
    setMemberSearchDraft("");
    setAssignDrawerOpen(true);
  }

  // Members strictly belonging to the target department
  const deptMembers = React.useMemo(() => {
    if (!targetDept) return [];
    return enrolledMembers.filter((m) =>
      m.departmentIds.includes(targetDept.id),
    );
  }, [enrolledMembers, targetDept]);

  // Filtered members by search query in step 1
  const filteredDeptMembers = React.useMemo(() => {
    const q = memberSearchDraft.trim().toLowerCase();
    if (!q) return deptMembers;
    return deptMembers.filter((m) => m.memberName.toLowerCase().includes(q));
  }, [deptMembers, memberSearchDraft]);

  // Check if all selected members are already assigned to the selected role
  const isDuplicateRole = React.useMemo(() => {
    if (!selectedRoleId || selectedMemberIds.length === 0) return false;
    const existingRoleMemberIds = new Set(
      assignments
        .filter((a) => a.departmentServiceRoleId === selectedRoleId)
        .map((a) => a.ministryMembershipId),
    );
    return selectedMemberIds.every((id) => existingRoleMemberIds.has(id));
  }, [assignments, selectedRoleId, selectedMemberIds]);

  async function handleSaveAssignment() {
    if (!selectedRoleId || selectedMemberIds.length === 0) return;

    setPending(true);
    try {
      if (selectedMemberIds.length === 1) {
        const result = await saveServiceAssignmentAction({
          sessionId: session.id,
          roleId: selectedRoleId,
          membershipId: selectedMemberIds[0],
        });

        if (result.success) {
          setFeedback(result.message ?? "Member assigned successfully.");
          setAssignDrawerOpen(false);
          router.refresh();
        } else {
          setFeedback(result.error ?? "Failed to assign member.");
        }
      } else {
        const result = await batchSaveServiceAssignmentsAction({
          sessionId: session.id,
          roleId: selectedRoleId,
          membershipIds: selectedMemberIds,
        });

        if (result.success) {
          setFeedback(result.message ?? "Members assigned successfully.");
          setAssignDrawerOpen(false);
          router.refresh();
        } else {
          setFeedback(result.error ?? "Failed to assign members.");
        }
      }
    } catch {
      setFeedback("Unable to save service assignment.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemoveAssignment() {
    if (!removingAssignment) return;
    setPending(true);
    try {
      const result = await removeServiceAssignmentAction({
        sessionId: session.id,
        assignmentId: removingAssignment.id,
      });

      if (result.success) {
        setFeedback(result.message ?? "Service assignment removed.");
        setRemovingAssignment(null);
        router.refresh();
      } else {
        setFeedback(result.error ?? "Failed to remove assignment.");
      }
    } catch {
      setFeedback("Unable to remove service assignment.");
    } finally {
      setPending(false);
    }
  }

  function toggleMemberSelection(membershipId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(membershipId)
        ? prev.filter((id) => id !== membershipId)
        : [...prev, membershipId],
    );
  }

  const totalRoles = departments.reduce(
    (acc, dept) => acc + dept.roles.length,
    0,
  );

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Header */}
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

      {/* 2. Navigation Tabs */}
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
              {departments.length}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Grouped Department & Roles List */}
      {departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center sm:p-12">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <Users className="size-6" />
          </div>
          <h2 className="text-foreground mt-3 text-base font-semibold">
            No departments configured
          </h2>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
            This ministry term has no departments yet. Please add departments in
            the Ministry Term Structure.
          </p>
          {assignmentData.ministrySlug && assignmentData.termSlug && (
            <div className="mt-4">
              <Button asChild variant="outline" className="min-h-11">
                <Link
                  href={`/admin/ministries/${assignmentData.ministrySlug}/terms/${assignmentData.termSlug}?section=departments`}
                >
                  Open Ministry Term Structure
                </Link>
              </Button>
            </div>
          )}
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

          {/* Department Cards */}
          {departments.map((dept) => {
            const color = normalizeMinistryColor(dept.accentColor);
            const deptAssignments = assignments.filter(
              (a) => a.termDepartmentId === dept.id,
            );
            const assignedRoles = dept.roles.filter((role) =>
              deptAssignments.some(
                (a) => a.departmentServiceRoleId === role.id,
              ),
            );

            return (
              <div
                key={dept.id}
                className="border-border/80 bg-card space-y-3 rounded-2xl border p-4 shadow-2xs sm:p-5"
              >
                {/* Card Header: Department Info + Single Assign Button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
                      style={{ backgroundColor: color }}
                    >
                      <DynamicLucideIcon
                        iconKey={dept.iconKey}
                        className="size-4"
                      />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-foreground truncate text-base font-semibold sm:text-lg">
                        {dept.name}
                      </h2>
                      <p className="text-muted-foreground text-xs">
                        {dept.roles.length}{" "}
                        {dept.roles.length === 1 ? "role" : "roles"} ·{" "}
                        {deptAssignments.length}{" "}
                        {deptAssignments.length === 1 ? "assigned" : "assigned"}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 shrink-0 gap-1.5 px-4 font-semibold"
                    disabled={dept.roles.length === 0}
                    onClick={() => openAssignDrawer(dept)}
                    title={
                      dept.roles.length === 0
                        ? `No roles configured in ${dept.name}`
                        : `Assign volunteers to ${dept.name}`
                    }
                  >
                    <Plus className="size-4" />
                    <span>Assign</span>
                  </Button>
                </div>

                {/* Card Body: Only assigned roles (flat, no nested box) */}
                {dept.roles.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">
                    No service roles configured in {dept.name}.
                  </p>
                ) : assignedRoles.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">
                    No volunteers assigned yet.
                  </p>
                ) : (
                  <div className="border-border/40 divide-border/40 divide-y border-t pt-1">
                    {assignedRoles.map((role) => {
                      const roleAssignments = deptAssignments.filter(
                        (a) => a.departmentServiceRoleId === role.id,
                      );

                      return (
                        <div
                          key={role.id}
                          className="flex flex-col gap-2 py-3 first:pt-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-36">
                            <span className="text-foreground text-sm font-semibold">
                              {role.name}
                            </span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({roleAssignments.length})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {roleAssignments.map((assignment) => (
                              <span
                                key={assignment.id}
                                className="border-border/80 bg-muted/40 text-foreground inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-2.5 text-xs font-medium shadow-2xs"
                              >
                                <span>{assignment.memberName}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRemovingAssignment(assignment)
                                  }
                                  className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex size-6 items-center justify-center rounded-full transition-colors focus-visible:outline-hidden"
                                  title={`Remove ${assignment.memberName} from ${role.name}`}
                                  aria-label={`Remove ${assignment.memberName} from ${role.name}`}
                                >
                                  <X className="size-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 2-Step Wizard Assign Drawer */}
      <ResponsiveEditor
        open={assignDrawerOpen}
        onOpenChange={(open) => !open && setAssignDrawerOpen(false)}
        title={
          wizardStep === 1
            ? targetDept
              ? `Assign · ${targetDept.name}`
              : "Assign Volunteers"
            : targetDept
              ? `Choose Role · ${targetDept.name}`
              : "Choose Role"
        }
        description={
          wizardStep === 1
            ? `Step 1 of 2: Select members from ${targetDept?.name ?? "department"}`
            : `Step 2 of 2: Select a service role for ${selectedMemberIds.length} volunteer${selectedMemberIds.length === 1 ? "" : "s"}`
        }
        maxWidthClass="sm:max-w-xl"
        footer={
          wizardStep === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => setAssignDrawerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full font-semibold"
                disabled={selectedMemberIds.length === 0}
                onClick={() => setWizardStep(2)}
              >
                <span>Next: Choose Role</span>
                {selectedMemberIds.length > 0 && (
                  <span className="ml-1">({selectedMemberIds.length})</span>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => setWizardStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full font-semibold"
                disabled={pending || !selectedRoleId || isDuplicateRole}
                onClick={handleSaveAssignment}
              >
                {pending
                  ? "Assigning..."
                  : selectedMemberIds.length > 1
                    ? `Assign (${selectedMemberIds.length}) Members`
                    : "Assign Member"}
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {/* STEP 1: Search & Select Members */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              {deptMembers.length === 0 ? (
                <div className="bg-muted/15 space-y-3 rounded-xl border border-dashed p-6 text-center">
                  <p className="text-foreground text-sm font-semibold">
                    No members in {targetDept?.name}
                  </p>
                  <p className="text-muted-foreground mx-auto max-w-sm text-xs">
                    This department has no members enrolled in this term yet.
                    Please assign members in the Term Structure.
                  </p>
                  {assignmentData.ministrySlug && assignmentData.termSlug && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                    >
                      <Link
                        href={`/admin/ministries/${assignmentData.ministrySlug}/terms/${assignmentData.termSlug}?section=departments`}
                      >
                        Open Term Structure
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search
                      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <Input
                      value={memberSearchDraft}
                      onChange={(e) => setMemberSearchDraft(e.target.value)}
                      placeholder={`Search members in ${targetDept?.name}...`}
                      className="h-11 pl-9 text-base sm:text-sm"
                      aria-label="Search members"
                    />
                  </div>

                  <div className="max-h-72 space-y-2.5 overflow-y-auto pr-0.5">
                    {filteredDeptMembers.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center text-xs">
                        No matching members found.
                      </p>
                    ) : (
                      filteredDeptMembers.map((member) => {
                        const isSelected = selectedMemberIds.includes(
                          member.membershipId,
                        );

                        // Find any existing assignments for this member in this department for this session
                        const memberAssignedRoles = assignments
                          .filter(
                            (a) =>
                              a.ministryMembershipId === member.membershipId &&
                              a.termDepartmentId === targetDept?.id,
                          )
                          .map((a) => a.departmentServiceRoleName);

                        return (
                          <button
                            key={member.membershipId}
                            type="button"
                            onClick={() =>
                              toggleMemberSelection(member.membershipId)
                            }
                            className={cn(
                              "flex min-h-14 w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all select-none sm:p-4",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-2xs"
                                : "border-border/80 bg-card hover:bg-muted/30",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground truncate text-sm font-semibold sm:text-base">
                                {member.memberName}
                              </p>
                              {memberAssignedRoles.length > 0 && (
                                <p className="text-muted-foreground truncate text-xs font-normal">
                                  Assigned: {memberAssignedRoles.join(", ")}
                                </p>
                              )}
                            </div>

                            <div
                              className={cn(
                                "ml-3 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/30 bg-transparent",
                              )}
                            >
                              {isSelected && (
                                <Check
                                  className="size-3.5 stroke-[3]"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: Select Role */}
          {wizardStep === 2 && targetDept && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Select a role to assign the {selectedMemberIds.length} chosen
                volunteer{selectedMemberIds.length === 1 ? "" : "s"}:
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {targetDept.roles.map((role) => {
                  const isSelected = role.id === selectedRoleId;
                  const currentRoleAssignments = assignments.filter(
                    (a) => a.departmentServiceRoleId === role.id,
                  );

                  // Check if any selected member already has this role
                  const existingRoleMemberIds = new Set(
                    currentRoleAssignments.map((a) => a.ministryMembershipId),
                  );
                  const duplicates = selectedMemberIds.filter((id) =>
                    existingRoleMemberIds.has(id),
                  );
                  const isAllDuplicate =
                    duplicates.length === selectedMemberIds.length;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={cn(
                        "flex min-h-12 items-center justify-between rounded-xl border p-3.5 text-left transition-all select-none",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/80 bg-card hover:bg-muted/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-semibold">
                          {role.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {currentRoleAssignments.length}{" "}
                          {currentRoleAssignments.length === 1
                            ? "member assigned"
                            : "members assigned"}
                        </p>
                        {isAllDuplicate && (
                          <p className="text-destructive mt-0.5 text-[11px] font-medium">
                            Already assigned to selected member(s)
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
                          <Check className="size-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ResponsiveEditor>

      {/* 6. Confirmation Sheet for Removal */}
      <ConfirmationSheet
        open={Boolean(removingAssignment)}
        onOpenChange={(open) => !open && setRemovingAssignment(null)}
        title={`Remove ${removingAssignment?.memberName}?`}
        description={`Remove ${removingAssignment?.memberName} from ${removingAssignment?.departmentServiceRoleName} in ${removingAssignment?.termDepartmentName}?`}
        confirmLabel="Remove assignment"
        pending={pending}
        pendingLabel="Removing..."
        variant="destructive"
        onConfirm={handleRemoveAssignment}
      />

      {/* 7. Toast Feedback */}
      {feedback && (
        <StatusToast message={feedback} onDismiss={() => setFeedback(null)} />
      )}
    </div>
  );
}
