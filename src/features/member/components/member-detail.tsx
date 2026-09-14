"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  Clock,
  Loader2,
  Phone,
  Plus,
  RotateCcw,
  Users,
} from "lucide-react";
import { cn } from "cn";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusToast } from "@/components/ui/status-toast";
import { DynamicLucideIcon } from "@/features/ministry/components/dynamic-lucide-icon";
import { normalizeMinistryColor } from "@/features/ministry/visual-identity";
import {
  ArchiveConfirmDialog,
  MemberEditor,
  RestoreConfirmDialog,
} from "./member-dialogs";
import {
  assignTermGroupAction,
  enrollMemberWithAssignmentsAction,
  removeMinistryMembershipAction,
  setMinistryAssignmentsAction,
} from "../actions";
import type {
  MemberDetailData,
  MemberDetailOptions,
  MinistryMembershipItem,
} from "../types";

interface MemberDetailProps {
  initialData: MemberDetailData;
  options: MemberDetailOptions;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not specified";
  try {
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}, ${values.hour}:${values.minute}`;
  } catch {
    return value;
  }
}

function IdentityTile({
  accentColor,
  iconKey,
}: {
  accentColor?: string | null;
  iconKey?: string | null;
}) {
  const color = normalizeMinistryColor(accentColor ?? "#3b82f6");
  const icon = iconKey ?? "layers-3";
  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-xl border"
      style={{
        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      <DynamicLucideIcon iconKey={icon} className="size-5" />
    </span>
  );
}

function VisualBadge({
  name,
  accentColor,
  iconKey,
}: {
  name: string;
  accentColor?: string | null;
  iconKey?: string | null;
}) {
  const color = normalizeMinistryColor(accentColor ?? "#3b82f6");
  const icon = iconKey ?? "users";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs"
      style={{
        borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        color,
      }}
    >
      <DynamicLucideIcon iconKey={icon} className="size-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function MemberDetail({ initialData, options }: MemberDetailProps) {
  const router = useRouter();
  const data = initialData;

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Profile Action Dialogs
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  // Ministry Enrollment Flow States:
  const [isEnrollmentSheetOpen, setIsEnrollmentSheetOpen] =
    React.useState(false);
  const [isMinistrySheetOpen, setIsMinistrySheetOpen] = React.useState(false);
  const [isTermSheetOpen, setIsTermSheetOpen] = React.useState(false);
  const [isGroupSheetOpen, setIsGroupSheetOpen] = React.useState(false);
  const [isDeptSheetOpen, setIsDeptSheetOpen] = React.useState(false);

  const [selectedMinistryId, setSelectedMinistryId] = React.useState<
    string | null
  >(null);
  const [selectedTermId, setSelectedTermId] = React.useState<string | null>(
    null,
  );
  const [selectedEnrollGroupId, setSelectedEnrollGroupId] = React.useState<
    string | null
  >(null);
  const [selectedEnrollDeptIds, setSelectedEnrollDeptIds] = React.useState<
    string[]
  >([]);
  const [selectedExistingDeptIds, setSelectedExistingDeptIds] = React.useState<
    string[]
  >([]);
  const [enrollPending, setEnrollPending] = React.useState(false);
  const [enrollError, setEnrollError] = React.useState<string | null>(null);
  const hasEnrollmentDraft =
    selectedMinistryId !== null ||
    selectedTermId !== null ||
    selectedEnrollGroupId !== null ||
    selectedEnrollDeptIds.length > 0 ||
    enrollPending;

  // Assign / Change Group Sheet (for existing enrollments)
  const [groupDialogMembership, setGroupDialogMembership] =
    React.useState<MinistryMembershipItem | null>(null);
  const [groupPending, setGroupPending] = React.useState(false);
  const [groupError, setGroupError] = React.useState<string | null>(null);

  // Add Department Sheet (for existing enrollments)
  const [deptDialogMembership, setDeptDialogMembership] =
    React.useState<MinistryMembershipItem | null>(null);
  const [deptPending, setDeptPending] = React.useState(false);
  const [deptError, setDeptError] = React.useState<string | null>(null);

  // Remove Membership Bottom Sheet State
  const [membershipToRemove, setMembershipToRemove] =
    React.useState<MinistryMembershipItem | null>(null);
  const [removeMembershipPending, setRemoveMembershipPending] =
    React.useState(false);
  const [removeMembershipError, setRemoveMembershipError] = React.useState<
    string | null
  >(null);

  function triggerRefresh(message?: string) {
    if (message) setToastMessage(message);
    router.refresh();
  }

  // --- Enrollment Flow Calculations & Handlers ---
  const enrolledTermIds = React.useMemo(
    () => new Set(data.memberships.map((m) => m.termId)),
    [data.memberships],
  );

  // Distinct Ministries with available terms not yet joined
  const availableMinistries = React.useMemo(() => {
    const ministryMap = new Map<
      string,
      { name: string; color?: string | null; iconKey?: string | null }
    >();
    for (const term of options.availableTerms) {
      if (!enrolledTermIds.has(term.termId)) {
        ministryMap.set(term.ministryId, {
          name: term.ministryName,
          color: term.ministryColor,
          iconKey: term.ministryIconKey,
        });
      }
    }
    return Array.from(ministryMap.entries()).map(([id, info]) => ({
      value: id,
      label: info.name,
      accentColor: info.color,
      iconKey: info.iconKey,
    }));
  }, [options.availableTerms, enrolledTermIds]);

  // Currently selected ministry object
  const selectedMinistry = React.useMemo(
    () => availableMinistries.find((m) => m.value === selectedMinistryId),
    [availableMinistries, selectedMinistryId],
  );

  // Terms for chosen ministry
  const termsForSelectedMinistry = React.useMemo(() => {
    if (!selectedMinistryId) return [];
    return options.availableTerms
      .filter(
        (t) =>
          t.ministryId === selectedMinistryId && !enrolledTermIds.has(t.termId),
      )
      .map((t) => ({
        value: t.termId,
        label: t.termName,
        accentColor: t.ministryColor,
        iconKey: t.ministryIconKey,
      }));
  }, [selectedMinistryId, options.availableTerms, enrolledTermIds]);

  // Currently selected term object
  const selectedTerm = React.useMemo(
    () => termsForSelectedMinistry.find((t) => t.value === selectedTermId),
    [termsForSelectedMinistry, selectedTermId],
  );

  // Groups for chosen term in enrollment
  const enrollTermGroups = React.useMemo(() => {
    if (!selectedTermId) return [];
    const groups = options.termGroupsByTermId[selectedTermId] ?? [];
    return [
      {
        value: "",
        label: "(None - No group assigned)",
        accentColor: null,
        iconKey: "x",
      },
      ...groups.map((g) => ({
        value: g.id,
        label: g.name,
        accentColor: g.accentColor,
        iconKey: g.iconKey,
      })),
    ];
  }, [selectedTermId, options.termGroupsByTermId]);

  const selectedEnrollGroup = React.useMemo(
    () => enrollTermGroups.find((g) => g.value === selectedEnrollGroupId),
    [enrollTermGroups, selectedEnrollGroupId],
  );

  // Departments for chosen term in enrollment
  const enrollTermDepartments = React.useMemo(() => {
    if (!selectedTermId) return [];
    return options.termDepartmentsByTermId[selectedTermId] ?? [];
  }, [selectedTermId, options.termDepartmentsByTermId]);

  function resetEnrollmentDialog() {
    setSelectedMinistryId(null);
    setSelectedTermId(null);
    setSelectedEnrollGroupId(null);
    setSelectedEnrollDeptIds([]);
    setEnrollError(null);
    setIsMinistrySheetOpen(false);
    setIsTermSheetOpen(false);
    setIsGroupSheetOpen(false);
    setIsDeptSheetOpen(false);
  }

  function toggleEnrollDepartment(deptId: string) {
    setSelectedEnrollDeptIds((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId],
    );
  }

  async function handleEnrollSubmit() {
    if (!selectedTermId) return;
    setEnrollPending(true);
    setEnrollError(null);
    const res = await enrollMemberWithAssignmentsAction({
      memberId: data.profile.id,
      ministryTermId: selectedTermId,
      termGroupId: selectedEnrollGroupId || null,
      departmentIds: selectedEnrollDeptIds,
    });
    setEnrollPending(false);
    if (!res.success) {
      setEnrollError(res.error);
      return;
    }
    resetEnrollmentDialog();
    setIsEnrollmentSheetOpen(false);
    triggerRefresh(res.message);
  }

  async function handleConfirmRemoveMembership() {
    if (!membershipToRemove) return;
    setRemoveMembershipPending(true);
    setRemoveMembershipError(null);
    const res = await removeMinistryMembershipAction({
      membershipId: membershipToRemove.id,
      memberId: data.profile.id,
    });
    setRemoveMembershipPending(false);
    if (!res.success) {
      setRemoveMembershipError(res.error);
      return;
    }
    setMembershipToRemove(null);
    triggerRefresh(res.message);
  }

  // --- Handlers for Term Groups (in existing cards) ---
  const currentTermGroupOptions = React.useMemo(() => {
    if (!groupDialogMembership) return [];
    const groups =
      options.termGroupsByTermId[groupDialogMembership.termId] ?? [];
    return groups.map((g) => ({
      value: g.id,
      label: g.name,
      accentColor: g.accentColor,
      iconKey: g.iconKey,
    }));
  }, [groupDialogMembership, options.termGroupsByTermId]);

  async function handleSelectGroupForExistingMembership(
    groupId: string | null,
  ) {
    if (!groupDialogMembership) return;
    setGroupPending(true);
    setGroupError(null);
    const res = await assignTermGroupAction({
      membershipId: groupDialogMembership.id,
      memberId: data.profile.id,
      termGroupId: groupId,
    });
    setGroupPending(false);
    if (!res.success) {
      setGroupError(res.error);
      return;
    }
    setGroupDialogMembership(null);
    triggerRefresh(res.message);
  }

  // --- Handlers for Departments (in existing cards) ---
  const currentTermDeptOptions = React.useMemo(() => {
    if (!deptDialogMembership) return [];
    return options.termDepartmentsByTermId[deptDialogMembership.termId] ?? [];
  }, [deptDialogMembership, options.termDepartmentsByTermId]);

  function toggleExistingDepartment(departmentId: string) {
    setSelectedExistingDeptIds((previous) =>
      previous.includes(departmentId)
        ? previous.filter((id) => id !== departmentId)
        : [...previous, departmentId],
    );
  }

  async function handleAssignDepartmentsForExistingMembership() {
    if (!deptDialogMembership) return;
    setDeptPending(true);
    setDeptError(null);
    const res = await setMinistryAssignmentsAction({
      membershipId: deptDialogMembership.id,
      memberId: data.profile.id,
      termDepartmentIds: selectedExistingDeptIds,
    });
    setDeptPending(false);
    if (!res.success) {
      setDeptError(res.error);
      return;
    }
    setSelectedExistingDeptIds([]);
    setDeptDialogMembership(null);
    triggerRefresh(res.message);
  }

  return (
    <ExpandableCoordinatorProvider>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header & Back Link */}
        <AdminPageHeader
          title="Member Details"
          description="Profile overview and ministry term enrollments."
          backLink={{
            href: "/admin",
            label: "Members",
          }}
        />

        {/* Member Profile Card */}
        <ExpandableActionItem
          id={`member-profile-${data.profile.id}`}
          name={data.profile.fullName}
          onEdit={() => setIsEditingProfile(true)}
          onDelete={() => {
            if (data.profile.archivedAt) {
              setIsRestoring(true);
            } else {
              setIsArchiving(true);
            }
          }}
          deleteLabel={
            data.profile.archivedAt ? "Restore member" : "Archive member"
          }
          deleteIcon={data.profile.archivedAt ? RotateCcw : Archive}
          deleteVariant={data.profile.archivedAt ? "outline" : "destructive"}
          className="border-border/70 bg-card rounded-2xl border p-5 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)] sm:p-6 md:rounded-2xl md:border md:shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl sm:size-14">
                <Users className="size-6 sm:size-7" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <h1 className="text-foreground truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {data.profile.fullName}
                </h1>
                <div>
                  {data.profile.archivedAt ? (
                    <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Archived
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ExpandableActionItem.Trigger />
            <div className="hidden md:flex">
              <ExpandableActionItem.DesktopActions />
            </div>
          </div>

          {/* Profile Metadata */}
          <div className="border-border/60 mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Phone className="size-3.5" aria-hidden="true" />
                Phone
              </span>
              <div className="text-foreground truncate text-sm font-semibold">
                {data.profile.phone ?? "Not provided"}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Clock className="size-3.5" aria-hidden="true" />
                Birth year
              </span>
              <div className="text-foreground text-sm font-semibold">
                {data.profile.birthYear ?? "Not provided"}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Clock className="size-3.5" aria-hidden="true" />
                Created
              </span>
              <time
                dateTime={data.profile.createdAt}
                className="text-foreground block text-sm font-semibold"
              >
                {formatDateTime(data.profile.createdAt)}
              </time>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Clock className="size-3.5" aria-hidden="true" />
                Updated
              </span>
              <time
                dateTime={data.profile.updatedAt}
                className="text-foreground block text-sm font-semibold"
              >
                {formatDateTime(data.profile.updatedAt)}
              </time>
            </div>
          </div>
          <ExpandableActionItem.MobileActions />
        </ExpandableActionItem>

        {/* Enrolled Ministry Term Cards or Empty State */}
        {data.memberships.length === 0 ? (
          <div className="border-border/70 bg-card rounded-2xl border p-8 text-center shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)]">
            <p className="text-muted-foreground text-sm font-medium">
              No ministry enrollments yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.memberships.map((membership) => (
              <div
                key={membership.id}
                className="border-border/70 bg-card rounded-2xl border p-5 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)] sm:p-6"
              >
                {/* Card Header: Ministry Name & Term Subtitle */}
                <div className="border-border/60 flex items-center justify-between gap-3 border-b pb-5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <IdentityTile
                      accentColor={membership.ministryColor}
                      iconKey={membership.ministryIconKey}
                    />
                    <div className="min-w-0">
                      <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
                        {membership.ministryName}
                      </h2>
                      <p className="text-muted-foreground text-xs font-medium sm:text-sm">
                        {membership.termName}
                      </p>
                    </div>
                  </div>

                  {/* Remove Button: Outline, bg-transparent, min-h-10 */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMembershipToRemove(membership);
                      setRemoveMembershipError(null);
                    }}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60 h-10 min-h-10 bg-transparent px-4 text-xs font-semibold sm:text-sm"
                    aria-label="Remove enrollment"
                  >
                    Remove
                  </Button>
                </div>

                {/* Assignments: one group, many departments. */}
                <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
                  <section className="border-border/70 bg-muted/20 rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-foreground text-sm font-semibold">
                          Small Group
                        </h3>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          One group per ministry term.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setGroupDialogMembership(membership);
                          setGroupError(null);
                        }}
                        className="border-input hover:bg-muted/40 h-10 min-h-10 shrink-0 bg-transparent px-3.5 text-xs font-semibold"
                      >
                        {membership.groupMembership
                          ? "Change group"
                          : "Assign group"}
                      </Button>
                    </div>

                    <div className="mt-4">
                      {membership.groupMembership ? (
                        <VisualBadge
                          name={membership.groupMembership.groupName}
                          accentColor={membership.groupMembership.groupColor}
                          iconKey={membership.groupMembership.groupIconKey}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs italic">
                          No small group assigned.
                        </span>
                      )}
                    </div>
                  </section>

                  <section className="border-border/70 bg-muted/20 rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-foreground text-sm font-semibold">
                          Departments
                        </h3>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          One or more departmental roles.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedExistingDeptIds(
                            membership.assignments.map(
                              (assignment) => assignment.departmentId,
                            ),
                          );
                          setDeptDialogMembership(membership);
                          setDeptError(null);
                        }}
                        className="border-input hover:bg-muted/40 h-10 min-h-10 shrink-0 bg-transparent px-3.5 text-xs font-semibold"
                      >
                        Manage departments
                      </Button>
                    </div>

                    <div className="mt-4">
                      {membership.assignments.length === 0 ? (
                        <span className="text-muted-foreground text-xs italic">
                          No departmental roles assigned.
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {membership.assignments.map((assignment) => (
                            <VisualBadge
                              key={assignment.id}
                              name={assignment.departmentName}
                              accentColor={assignment.departmentColor}
                              iconKey={assignment.departmentIconKey}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ministry Enrollments Bottom Sheet (Opened from Float Button) */}
        <Sheet
          open={isEnrollmentSheetOpen}
          onOpenChange={(open) => {
            setIsEnrollmentSheetOpen(open);
            if (!open) {
              resetEnrollmentDialog();
            }
          }}
        >
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
            onPointerDownOutside={(event) => {
              if (hasEnrollmentDraft) {
                event.preventDefault();
              }
            }}
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Ministry Enrollments
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Enroll member into a ministry term.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-8">
              {enrollError && (
                <div
                  role="alert"
                  className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
                >
                  {enrollError}
                </div>
              )}

              {/* Button 1: Choose a ministry */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMinistrySheetOpen(true)}
                className="border-input hover:bg-muted/40 h-auto min-h-12 w-full justify-between rounded-xl bg-transparent px-4 py-3 text-left font-medium transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {selectedMinistry && (
                    <IdentityTile
                      accentColor={selectedMinistry.accentColor}
                      iconKey={selectedMinistry.iconKey}
                    />
                  )}
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      !selectedMinistry && "text-muted-foreground",
                    )}
                  >
                    {selectedMinistry
                      ? selectedMinistry.label
                      : "Choose a ministry"}
                  </span>
                </div>
                {selectedMinistry && (
                  <span className="text-primary text-xs font-semibold">
                    Change
                  </span>
                )}
              </Button>

              {/* Button 2: Choose a ministry term */}
              {selectedMinistryId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTermSheetOpen(true)}
                  className="border-input hover:bg-muted/40 h-auto min-h-12 w-full justify-between rounded-xl bg-transparent px-4 py-3 text-left font-medium transition-colors"
                >
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      !selectedTerm && "text-muted-foreground",
                    )}
                  >
                    {selectedTerm
                      ? selectedTerm.label
                      : "Choose a ministry term"}
                  </span>
                  {selectedTerm && (
                    <span className="text-primary ml-2 shrink-0 text-xs font-semibold">
                      Change
                    </span>
                  )}
                </Button>
              )}

              {/* Button 3a: Choose a small group */}
              {selectedTermId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGroupSheetOpen(true)}
                  className="border-input hover:bg-muted/40 h-auto min-h-12 w-full justify-between rounded-xl bg-transparent px-4 py-3 text-left font-medium transition-colors"
                >
                  <span className="truncate text-sm font-semibold">
                    {selectedEnrollGroup && selectedEnrollGroupId
                      ? `Small Group: ${selectedEnrollGroup.label}`
                      : "Choose a small group (optional)"}
                  </span>
                  {selectedEnrollGroupId && (
                    <span className="text-primary ml-2 shrink-0 text-xs font-semibold">
                      Change
                    </span>
                  )}
                </Button>
              )}

              {/* Button 3b: Choose departments */}
              {selectedTermId && enrollTermDepartments.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeptSheetOpen(true)}
                  className="border-input hover:bg-muted/40 h-auto min-h-12 w-full justify-between rounded-xl bg-transparent px-4 py-3 text-left font-medium transition-colors"
                >
                  <div className="min-w-0">
                    {selectedEnrollDeptIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 py-0.5">
                        {selectedEnrollDeptIds.map((id) => {
                          const dept = enrollTermDepartments.find(
                            (d) => d.id === id,
                          );
                          if (!dept) return null;
                          return (
                            <VisualBadge
                              key={dept.id}
                              name={dept.name}
                              accentColor={dept.accentColor}
                              iconKey={dept.iconKey}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm font-semibold">
                        Choose departments (optional)
                      </span>
                    )}
                  </div>
                  {selectedEnrollDeptIds.length > 0 && (
                    <span className="text-primary ml-2 shrink-0 text-xs font-semibold">
                      Change
                    </span>
                  )}
                </Button>
              )}

              {/* Submit Action */}
              {selectedTermId && (
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleEnrollSubmit}
                    disabled={enrollPending}
                    className="min-h-11 w-full gap-2 font-semibold"
                  >
                    {enrollPending && (
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      {enrollPending ? "Enrolling..." : "Enroll member"}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Step 1: Ministry Bottom Sheet */}
        <Sheet open={isMinistrySheetOpen} onOpenChange={setIsMinistrySheetOpen}>
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 z-[60] flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Select Ministry
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Choose an active ministry to view its available terms.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-8">
              {availableMinistries.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No ministries with open terms available.
                </div>
              ) : (
                availableMinistries.map((ministry) => {
                  const isSelected = selectedMinistryId === ministry.value;
                  return (
                    <button
                      key={ministry.value}
                      type="button"
                      onClick={() => {
                        setSelectedMinistryId(ministry.value);
                        setSelectedTermId(null);
                        setSelectedEnrollGroupId(null);
                        setSelectedEnrollDeptIds([]);
                        setIsMinistrySheetOpen(false); // Auto close
                      }}
                      className={cn(
                        "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5 font-semibold"
                          : "border-border/70 bg-card",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <IdentityTile
                          accentColor={ministry.accentColor}
                          iconKey={ministry.iconKey}
                        />
                        <span className="text-foreground truncate text-sm font-semibold sm:text-base">
                          {ministry.label}
                        </span>
                      </div>
                      {isSelected && (
                        <Check
                          className="text-primary ml-2 size-5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Step 2: Ministry Term Bottom Sheet */}
        <Sheet open={isTermSheetOpen} onOpenChange={setIsTermSheetOpen}>
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 z-[60] flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Select Ministry Term
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Choose an active or upcoming term for {selectedMinistry?.label}.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-8">
              {termsForSelectedMinistry.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No available terms for this ministry.
                </div>
              ) : (
                termsForSelectedMinistry.map((term) => {
                  const isSelected = selectedTermId === term.value;
                  return (
                    <button
                      key={term.value}
                      type="button"
                      onClick={() => {
                        setSelectedTermId(term.value);
                        setSelectedEnrollGroupId(null);
                        setSelectedEnrollDeptIds([]);
                        setIsTermSheetOpen(false); // Auto close
                      }}
                      className={cn(
                        "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5 font-semibold"
                          : "border-border/70 bg-card",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <IdentityTile
                          accentColor={term.accentColor}
                          iconKey={term.iconKey}
                        />
                        <span className="text-foreground truncate text-sm font-semibold sm:text-base">
                          {term.label}
                        </span>
                      </div>
                      {isSelected && (
                        <Check
                          className="text-primary ml-2 size-5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Step 3a: Group Bottom Sheet (Enrollment) */}
        <Sheet open={isGroupSheetOpen} onOpenChange={setIsGroupSheetOpen}>
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 z-[60] flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Select Term Group
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Optional small group placement (1 group max per term).
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-8">
              {enrollTermGroups.map((group) => {
                const isSelected =
                  (selectedEnrollGroupId ?? "") === group.value;
                return (
                  <button
                    key={group.value || "none"}
                    type="button"
                    onClick={() => {
                      setSelectedEnrollGroupId(group.value || null);
                      setIsGroupSheetOpen(false); // Auto close
                    }}
                    className={cn(
                      "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 font-semibold"
                        : "border-border/70 bg-card",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {group.value ? (
                        <IdentityTile
                          accentColor={group.accentColor}
                          iconKey={group.iconKey}
                        />
                      ) : (
                        <span className="border-border/80 bg-muted/60 text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-xl border">
                          <span className="text-xs font-semibold">None</span>
                        </span>
                      )}
                      <span className="text-foreground truncate text-sm font-semibold sm:text-base">
                        {group.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check
                        className="text-primary ml-2 size-5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* Shared department picker for enrollment and existing memberships. */}
        <Sheet
          open={isDeptSheetOpen || Boolean(deptDialogMembership)}
          onOpenChange={(open) => {
            if (open || deptPending) return;
            setIsDeptSheetOpen(false);
            setSelectedExistingDeptIds([]);
            setDeptDialogMembership(null);
            setDeptError(null);
          }}
        >
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 z-[60] flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Select Departments
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                {deptDialogMembership
                  ? `Select one or more departmental roles to assign in ${deptDialogMembership.termName}.`
                  : "Select one or more departmental roles to assign."}
              </SheetDescription>
            </SheetHeader>
            {deptError && (
              <div
                role="alert"
                className="border-destructive/20 bg-destructive/10 text-destructive mx-4 mt-4 rounded-lg border p-3 text-sm"
              >
                {deptError}
              </div>
            )}
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {(deptDialogMembership
                ? currentTermDeptOptions
                : enrollTermDepartments
              ).length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  {deptDialogMembership
                    ? "All departments in this term have already been assigned, or none exist."
                    : "No departments configured for this term."}
                </div>
              ) : (
                (deptDialogMembership
                  ? currentTermDeptOptions
                  : enrollTermDepartments
                ).map((dept) => {
                  const selectedDepartmentIds = deptDialogMembership
                    ? selectedExistingDeptIds
                    : selectedEnrollDeptIds;
                  const isSelected = selectedDepartmentIds.includes(dept.id);
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      disabled={deptPending}
                      onClick={() =>
                        deptDialogMembership
                          ? toggleExistingDepartment(dept.id)
                          : toggleEnrollDepartment(dept.id)
                      }
                      className={cn(
                        "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5 font-semibold"
                          : "border-border/70 bg-card",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <IdentityTile
                          accentColor={dept.accentColor}
                          iconKey={dept.iconKey}
                        />
                        <span className="text-foreground truncate text-sm font-semibold sm:text-base">
                          {dept.name}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "ml-2 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-transparent",
                        )}
                      >
                        {isSelected && (
                          <Check className="size-3.5" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-border/70 bg-muted/30 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                disabled={deptPending}
                onClick={() => {
                  if (deptDialogMembership) {
                    void handleAssignDepartmentsForExistingMembership();
                    return;
                  }
                  setIsDeptSheetOpen(false);
                }}
                className="min-h-11 w-full font-semibold"
              >
                {deptPending ? "Assigning..." : "Done"}{" "}
                {(deptDialogMembership
                  ? selectedExistingDeptIds.length
                  : selectedEnrollDeptIds.length) > 0
                  ? `(${deptDialogMembership ? selectedExistingDeptIds.length : selectedEnrollDeptIds.length} selected)`
                  : ""}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Assign / Change Group Bottom Sheet (Existing Membership) */}
        <Sheet
          open={Boolean(groupDialogMembership)}
          onOpenChange={(open) => {
            if (!open && !groupPending) setGroupDialogMembership(null);
          }}
        >
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Assign Term Group
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                {groupDialogMembership
                  ? `Select a small group in ${groupDialogMembership.termName}.`
                  : "Select group"}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-8">
              {groupError && (
                <div
                  role="alert"
                  className="border-destructive/20 bg-destructive/10 text-destructive mb-2 rounded-lg border p-3 text-sm"
                >
                  {groupError}
                </div>
              )}

              {/* Clear group option */}
              <button
                type="button"
                disabled={groupPending}
                onClick={() => handleSelectGroupForExistingMembership(null)}
                className={cn(
                  "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                  !groupDialogMembership?.groupMembership
                    ? "border-primary bg-primary/5 font-semibold"
                    : "border-border/70 bg-card",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="border-border/80 bg-muted/60 text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-xl border">
                    <span className="text-xs font-semibold">None</span>
                  </span>
                  <span className="text-foreground truncate text-sm font-semibold sm:text-base">
                    (None - Clear group)
                  </span>
                </div>
                {!groupDialogMembership?.groupMembership && (
                  <Check
                    className="text-primary ml-2 size-5 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>

              {currentTermGroupOptions.map((group) => {
                const isSelected =
                  groupDialogMembership?.groupMembership?.groupId ===
                  group.value;
                return (
                  <button
                    key={group.value}
                    type="button"
                    disabled={groupPending}
                    onClick={() =>
                      handleSelectGroupForExistingMembership(group.value)
                    }
                    className={cn(
                      "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 font-semibold"
                        : "border-border/70 bg-card",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <IdentityTile
                        accentColor={group.accentColor}
                        iconKey={group.iconKey}
                      />
                      <span className="text-foreground truncate text-sm font-semibold sm:text-base">
                        {group.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check
                        className="text-primary ml-2 size-5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* Remove Membership Bottom Sheet (Replaced modal, 2 buttons on 1 row) */}
        <Sheet
          open={Boolean(membershipToRemove)}
          onOpenChange={(open) => {
            if (!open && !removeMembershipPending) {
              setMembershipToRemove(null);
              setRemoveMembershipError(null);
            }
          }}
        >
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Remove from ministry term
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Are you sure you want to remove{" "}
                <strong>{data.profile.fullName}</strong> from{" "}
                <strong>
                  {membershipToRemove?.ministryName} —{" "}
                  {membershipToRemove?.termName}
                </strong>
                ? This will also remove their small group and departmental
                assignments for this term.
              </SheetDescription>
            </SheetHeader>

            {removeMembershipError && (
              <div
                role="alert"
                className="border-destructive/20 bg-destructive/10 text-destructive mx-5 mt-3 rounded-lg border p-3 text-sm"
              >
                {removeMembershipError}
              </div>
            )}

            {/* 2 action buttons side by side on 1 single row */}
            <div className="grid grid-cols-2 gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                disabled={removeMembershipPending}
                onClick={() => {
                  setMembershipToRemove(null);
                  setRemoveMembershipError(null);
                }}
                className="min-h-11 w-full font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={removeMembershipPending}
                onClick={handleConfirmRemoveMembership}
                className="min-h-11 w-full gap-2 font-medium"
              >
                {removeMembershipPending && (
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {removeMembershipPending ? "Removing..." : "Remove"}
                </span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Profile Editor Dialog */}
        <MemberEditor
          member={data.profile}
          open={isEditingProfile}
          onClose={() => setIsEditingProfile(false)}
          onSuccess={(message) => {
            setIsEditingProfile(false);
            triggerRefresh(message);
          }}
        />

        {/* Archive Confirmation Dialog */}
        <ArchiveConfirmDialog
          member={data.profile}
          open={isArchiving}
          onClose={() => setIsArchiving(false)}
          onSuccess={(message) => {
            setIsArchiving(false);
            triggerRefresh(message);
          }}
        />

        {/* Restore Confirmation Dialog */}
        <RestoreConfirmDialog
          member={data.profile}
          open={isRestoring}
          onClose={() => setIsRestoring(false)}
          onSuccess={(message) => {
            setIsRestoring(false);
            triggerRefresh(message);
          }}
        />

        {/* Floating Action Button for Ministry Enrollment */}
        <Button
          type="button"
          onClick={() => {
            resetEnrollmentDialog();
            setIsEnrollmentSheetOpen(true);
          }}
          className="fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 min-h-12 rounded-full px-5 shadow-[0_18px_36px_-14px_color-mix(in_oklch,var(--primary)_70%,transparent)] md:right-8 md:bottom-8"
        >
          <Plus aria-hidden="true" className="size-5" />
          <span>Ministry Enrollments</span>
        </Button>

        {/* Toast */}
        {toastMessage && (
          <StatusToast
            message={toastMessage}
            onDismiss={() => setToastMessage(null)}
          />
        )}
      </div>
    </ExpandableCoordinatorProvider>
  );
}
