"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  CheckSquare,
  Ellipsis,
  Filter,
  Loader2,
  Music,
  Search,
  Square,
  X,
} from "lucide-react";
import { useQueryStates } from "nuqs";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { ExpandableCardPanel } from "@/components/shared/expandable-card-panel";
import { PaginationCard } from "@/components/shared/pagination-card";
import {
  NavigationTabs,
  NavigationTabLink,
} from "@/components/shared/navigation-tabs";
import { StatusToast } from "@/components/ui/status-toast";
import { saveAttendanceAction, saveBulkAttendanceAction } from "../actions";
import {
  sessionAttendanceFilterValues,
  sessionDetailSearchParams,
} from "../search-params";
import type {
  SessionAttendanceStatus,
  SessionDetail,
  SessionFilterStatus,
  SessionParticipantDetail,
} from "../types";

type AttendanceActions = {
  save: (raw: unknown) => Promise<{ success: boolean; error?: string }>;
  saveBulk: (raw: unknown) => Promise<{ success: boolean; error?: string }>;
};

const FILTER_LABELS: Record<SessionFilterStatus, string> = {
  all: "All",
  pending: "Pending",
  present: "Present",
  absent: "Absent",
  excused: "Excused",
};

export function AttendanceManagement({
  session,
  actions,
  basePath,
  baseQuery,
  returnUrl,
  description,
}: {
  session: SessionDetail;
  actions?: AttendanceActions;
  basePath?: string;
  baseQuery?: string;
  returnUrl?: string;
  description?: string;
}) {
  // URL state with nuqs (shallow: false for Server Component re-render)
  const [query, setQuery] = useQueryStates(sessionDetailSearchParams, {
    shallow: false,
  });

  // Local debounced search state (300ms)
  const [searchTerm, setSearchTerm] = React.useState(query.q);
  const [prevQueryQ, setPrevQueryQ] = React.useState(query.q);
  if (query.q !== prevQueryQ) {
    setPrevQueryQ(query.q);
    setSearchTerm(query.q);
  }

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== query.q) {
        void setQuery({ q: searchTerm, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, query.q, setQuery]);

  // Selection mode & selected member IDs
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>(
    [],
  );

  // Set of member IDs whose 3 buttons are expanded/shown for editing
  const [expandedMemberIds, setExpandedMemberIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const toggleMemberControls = React.useCallback((memberId: string) => {
    setExpandedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  // Clear selection automatically when filter or search changes (Requirement #2)
  const [prevFilterKey, setPrevFilterKey] = React.useState(
    `${query.q}:${query.status}`,
  );
  const currentFilterKey = `${query.q}:${query.status}`;
  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setSelectedMemberIds([]);
    setExpandedMemberIds(new Set());
  }

  // Filter drawer state
  const [filterDrawerOpen, setFilterDrawerOpen] = React.useState(false);
  const [draftStatus, setDraftStatus] = React.useState<SessionFilterStatus>(
    query.status as SessionFilterStatus,
  );

  // Bulk action confirmation state
  const [bulkConfirm, setBulkConfirm] = React.useState<{
    open: boolean;
    targetStatus: SessionAttendanceStatus;
    memberIds: string[];
    count: number;
    title: string;
    description: string;
  } | null>(null);
  const [bulkPending, setBulkPending] = React.useState(false);

  // Per-member saving pending state
  const [savingMemberId, setSavingMemberId] = React.useState<string | null>(
    null,
  );

  // Toast notification state
  const [toast, setToast] = React.useState<{
    message: string;
    action?: { label: string; onClick: () => void };
  } | null>(null);

  // Single attendance update handler
  async function handleSetStatus(
    member: SessionParticipantDetail,
    newStatus: SessionAttendanceStatus,
  ) {
    if (member.status === newStatus) {
      setExpandedMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(member.memberId);
        return next;
      });
      return;
    }
    if (savingMemberId) return;

    setSavingMemberId(member.memberId);
    const result = await (actions?.save ?? saveAttendanceAction)({
      sessionId: session.id,
      memberId: member.memberId,
      status: newStatus,
    });
    setSavingMemberId(null);

    if (result.success) {
      setExpandedMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(member.memberId);
        return next;
      });
      const statusLabel =
        newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      setToast({
        message: `Attendance saved: ${member.fullName} marked as ${statusLabel}.`,
        action:
          query.status === "pending"
            ? {
                label: "View All",
                onClick: () => {
                  void setQuery({ status: "all", page: 1 });
                },
              }
            : undefined,
      });
    } else {
      setToast({
        message: result.error ?? "Failed to save attendance.",
      });
    }
  }

  // Bulk attendance confirmation trigger
  function triggerBulkAction(
    targetStatus: SessionAttendanceStatus,
    memberIds: string[],
    isAllFiltered = false,
  ) {
    const statusLabel =
      targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1);
    setBulkConfirm({
      open: true,
      targetStatus,
      memberIds,
      count: memberIds.length,
      title: isAllFiltered
        ? `Mark All ${memberIds.length} Members as ${statusLabel}?`
        : `Mark ${memberIds.length} Selected as ${statusLabel}?`,
      description: isAllFiltered
        ? `This will record ${statusLabel} for all ${memberIds.length} members matching your current filter and search across all pages.`
        : `This will record ${statusLabel} for the ${memberIds.length} currently selected members.`,
    });
  }

  // Execute bulk action
  async function executeBulkAction() {
    if (!bulkConfirm) return;
    setBulkPending(true);
    const result = await (actions?.saveBulk ?? saveBulkAttendanceAction)({
      sessionId: session.id,
      memberIds: bulkConfirm.memberIds,
      status: bulkConfirm.targetStatus,
    });
    setBulkPending(false);

    if (result.success) {
      const count = bulkConfirm.count;
      const statusLabel =
        bulkConfirm.targetStatus.charAt(0).toUpperCase() +
        bulkConfirm.targetStatus.slice(1);
      setBulkConfirm(null);
      setSelectedMemberIds([]);
      setIsSelectionMode(false);
      setToast({
        message: `Attendance saved: ${count} members marked as ${statusLabel}.`,
        action:
          query.status === "pending"
            ? {
                label: "View All",
                onClick: () => {
                  void setQuery({ status: "all", page: 1 });
                },
              }
            : undefined,
      });
    } else {
      setToast({
        message: result.error ?? "Failed to save bulk attendance.",
      });
    }
  }

  // Toggle single member selection
  function toggleMemberSelection(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  // Select/Deselect all on current page
  const currentPageMemberIds = session.participants.map((p) => p.memberId);
  const allCurrentPageSelected =
    currentPageMemberIds.length > 0 &&
    currentPageMemberIds.every((id) => selectedMemberIds.includes(id));

  function toggleSelectAllCurrentPage() {
    if (allCurrentPageSelected) {
      setSelectedMemberIds((prev) =>
        prev.filter((id) => !currentPageMemberIds.includes(id)),
      );
    } else {
      setSelectedMemberIds((prev) => [
        ...prev,
        ...currentPageMemberIds.filter((id) => !prev.includes(id)),
      ]);
    }
  }

  const activeStatus = (query.status as SessionFilterStatus) || "all";

  const targetReturnUrl = returnUrl ?? query.returnUrl;
  const isSafeReturnUrl = Boolean(
    targetReturnUrl?.startsWith("/") && !targetReturnUrl.startsWith("//"),
  );
  const backHref =
    isSafeReturnUrl && targetReturnUrl ? targetReturnUrl : "/admin/sessions";
  const backLabel = isSafeReturnUrl ? "Back" : "Sessions";
  const sessionPath = basePath ?? `/admin/sessions/${session.slug}`;
  const routeQuery = baseQuery ? `?${baseQuery}` : "";
  const returnParam =
    !basePath && isSafeReturnUrl && targetReturnUrl
      ? `&returnUrl=${encodeURIComponent(targetReturnUrl)}`
      : "";

  return (
    <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
      <AdminPageHeader
        title={session.title}
        description={
          description ??
          `${session.ministryName} · ${session.termName} · ${session.scopeLabel} · ${session.sessionDate}`
        }
        backLink={{
          href: backHref,
          label: backLabel,
        }}
      />

      {!session.departmentId && (
        <NavigationTabs aria-label="Session views">
          <NavigationTabLink
            href={`${sessionPath}${basePath ? routeQuery : returnParam.replace("&", "?")}`}
            active={true}
          >
            Attendance
          </NavigationTabLink>
          <NavigationTabLink
            href={`${sessionPath}${basePath ? `${routeQuery}${routeQuery ? "&" : "?"}tab=assignments` : `?tab=assignments${returnParam}`}`}
            active={false}
          >
            Service Assignments
          </NavigationTabLink>
        </NavigationTabs>
      )}

      {/* 2. Summary Stat Grid (2-col on mobile, 4-col on desktop) */}
      <section aria-label="Attendance summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Present
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {session.summary.presentCount}
            </p>
          </div>
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Absent
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {session.summary.absentCount}
            </p>
          </div>
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Excused
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {session.summary.excusedCount}
            </p>
          </div>
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Pending
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              {session.summary.pendingCount}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Search, Filter & Bulk Controls Toolbar */}
      <section>
        {session.summary.enrolledCount >= 20 ||
        Boolean(query.q) ||
        query.status !== "all" ? (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search field */}
            <div className="relative min-w-[200px] flex-1">
              <Search
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                className="bg-card h-11 pl-9 text-base shadow-2xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search member name..."
                aria-label="Search members"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    void setQuery({ q: "", page: 1 });
                  }}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 p-1"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filter button (opens bottom drawer) */}
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-[100px] gap-2 px-3.5"
              onClick={() => {
                setDraftStatus(activeStatus);
                setFilterDrawerOpen(true);
              }}
              aria-label={`Filter attendance status, current: ${FILTER_LABELS[activeStatus]}`}
            >
              <Filter className="size-4" />
              <span>{FILTER_LABELS[activeStatus]}</span>
            </Button>

            {/* Selection mode toggle */}
            <Button
              type="button"
              variant="outline"
              className={cn(
                "border-border/80 bg-background text-foreground hover:bg-muted/80 h-11 gap-2 px-3.5 shadow-2xs",
                isSelectionMode && "bg-muted font-semibold",
              )}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedMemberIds([]);
              }}
            >
              <CheckSquare className="size-4" />
              <span>{isSelectionMode ? "Cancel" : "Select"}</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-foreground text-sm font-semibold tracking-wide uppercase">
              Members ({session.summary.enrolledCount})
            </h2>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "border-border/80 bg-background text-foreground hover:bg-muted/80 h-11 gap-2 px-3.5 shadow-2xs",
                isSelectionMode && "bg-muted font-semibold",
              )}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedMemberIds([]);
              }}
            >
              <CheckSquare className="size-4" />
              <span>{isSelectionMode ? "Cancel" : "Select"}</span>
            </Button>
          </div>
        )}
      </section>

      {/* 4. Content Area: Mobile Cards vs Desktop Table */}
      {session.participants.length === 0 ? (
        <div className="bg-card border-border/80 flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
          <p className="text-foreground text-base font-medium">
            No members found
          </p>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {activeStatus !== "all" || query.q
              ? "No enrolled members match your current search or status filter."
              : "There are no active enrolled members in this term."}
          </p>
          {(activeStatus !== "all" || query.q) && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchTerm("");
                void setQuery({ q: "", status: "all", page: 1 });
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card Collection (render on mobile only) */}
          <div className="block space-y-3 md:hidden">
            {session.participants.map((p) => {
              const isSelected = selectedMemberIds.includes(p.memberId);
              const isSavingThis = savingMemberId === p.memberId;
              const hasRole = Boolean(p.sessionRole);

              return (
                <article
                  key={p.memberId}
                  className={cn(
                    "border-border/80 overflow-hidden border shadow-2xs transition-shadow",
                    hasRole ? "bg-muted/40 rounded-2xl" : "bg-card rounded-xl",
                  )}
                >
                  <div
                    className={cn(
                      "p-4",
                      hasRole &&
                        "bg-card border-border/80 rounded-b-xl border-b",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {isSelectionMode && (
                          <button
                            type="button"
                            onClick={() => toggleMemberSelection(p.memberId)}
                            className="text-foreground -ml-2 flex size-11 shrink-0 items-center justify-center"
                            aria-label={`Select ${p.fullName}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="text-primary size-5" />
                            ) : (
                              <Square className="text-muted-foreground size-5" />
                            )}
                          </button>
                        )}
                        <MemberAvatar gender={p.gender} />
                        <div className="min-w-0 flex-1">
                          <h2 className="text-foreground truncate text-base leading-tight font-semibold">
                            {p.fullName}
                          </h2>
                          {(p.group?.name || p.departments.length > 0) && (
                            <p className="text-muted-foreground mt-0.5 truncate text-xs">
                              {[
                                p.group?.name,
                                ...p.departments.map((d) => d.name),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status badge and 3-dots action in top right */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {p.status === "present" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Present
                          </span>
                        )}
                        {p.status === "absent" && (
                          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                            Absent
                          </span>
                        )}
                        {p.status === "excused" && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                            Excused
                          </span>
                        )}
                        {!p.status && (
                          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                            Pending
                          </span>
                        )}

                        {/* 3-dots icon on top right: click to show 3 buttons to re-select */}
                        {p.status && (
                          <button
                            type="button"
                            onClick={() => toggleMemberControls(p.memberId)}
                            className={cn(
                              "text-muted-foreground hover:text-foreground hover:bg-muted/60 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                              expandedMemberIds.has(p.memberId) &&
                                "bg-muted text-foreground",
                            )}
                            aria-label={`Change attendance for ${p.fullName}`}
                            aria-expanded={expandedMemberIds.has(p.memberId)}
                            aria-controls={`attendance-actions-${p.memberId}`}
                          >
                            <Ellipsis className="size-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3 Segmented attendance controls (outline buttons with status dots, >=44px) */}
                    <ExpandableCardPanel
                      open={!p.status || expandedMemberIds.has(p.memberId)}
                      id={`attendance-actions-${p.memberId}`}
                      label={`Attendance actions for ${p.fullName}`}
                      contentClassName="mt-3"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSetStatus(p, "present")}
                          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-all ${
                            p.status === "present"
                              ? "border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                              : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                        >
                          {isSavingThis ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <span
                                className="size-2 shrink-0 rounded-full bg-emerald-500"
                                aria-hidden="true"
                              />
                              <span>Present</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSetStatus(p, "absent")}
                          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-all ${
                            p.status === "absent"
                              ? "border-rose-500/40 bg-rose-500/10 font-semibold text-rose-700 dark:text-rose-300"
                              : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                        >
                          {isSavingThis ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <span
                                className="size-2 shrink-0 rounded-full bg-rose-500"
                                aria-hidden="true"
                              />
                              <span>Absent</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSetStatus(p, "excused")}
                          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-all ${
                            p.status === "excused"
                              ? "border-amber-500/40 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300"
                              : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                        >
                          {isSavingThis ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <span
                                className="size-2 shrink-0 rounded-full bg-amber-500"
                                aria-hidden="true"
                              />
                              <span>Excused</span>
                            </>
                          )}
                        </button>
                      </div>
                    </ExpandableCardPanel>
                  </div>

                  {/* Mobile role footer tab */}
                  {p.sessionRole && (
                    <div className="text-muted-foreground flex items-center justify-center gap-1.5 px-4 py-1.5 text-center text-xs font-medium md:hidden">
                      {p.sessionRole.role === "worship_guide" ? (
                        <Music className="size-3.5" aria-hidden="true" />
                      ) : (
                        <BookOpen className="size-3.5" aria-hidden="true" />
                      )}
                      <span>{p.sessionRole.label}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Desktop Table (render on desktop only) */}
          <div className="bg-card hidden overflow-hidden rounded-xl border shadow-2xs md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground border-b text-xs tracking-wider uppercase">
                <tr>
                  <th className="w-12 px-4 py-3 text-center">
                    {isSelectionMode && (
                      <button
                        type="button"
                        onClick={toggleSelectAllCurrentPage}
                        className="hover:text-primary mx-auto flex size-8 items-center justify-center"
                        aria-label="Select all on page"
                      >
                        {allCurrentPageSelected ? (
                          <CheckSquare className="text-primary size-4" />
                        ) : (
                          <Square className="text-muted-foreground size-4" />
                        )}
                      </button>
                    )}
                  </th>
                  <th className="text-foreground px-4 py-3 font-semibold">
                    Member
                  </th>
                  <th className="text-foreground px-4 py-3 text-right font-semibold">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {session.participants.map((p) => {
                  const isSelected = selectedMemberIds.includes(p.memberId);
                  const isSavingThis = savingMemberId === p.memberId;
                  const isExpanded = expandedMemberIds.has(p.memberId);
                  const showButtons = !p.status || isExpanded;

                  return (
                    <tr
                      key={p.memberId}
                      className={`hover:bg-muted/30 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        {isSelectionMode && (
                          <button
                            type="button"
                            onClick={() => toggleMemberSelection(p.memberId)}
                            className="text-foreground mx-auto flex size-9 items-center justify-center"
                            aria-label={`Select ${p.fullName}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="text-primary size-4" />
                            ) : (
                              <Square className="text-muted-foreground size-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="text-foreground px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <MemberAvatar gender={p.gender} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold">
                                {p.fullName}
                              </span>
                              {p.sessionRole && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                    p.sessionRole.role === "worship_guide"
                                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                                  )}
                                >
                                  {p.sessionRole.role === "worship_guide" ? (
                                    <Music
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <BookOpen
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span>{p.sessionRole.label}</span>
                                </span>
                              )}
                            </div>
                            {(p.group?.name || p.departments.length > 0) && (
                              <span className="text-muted-foreground block truncate text-xs font-normal">
                                {[
                                  p.group?.name,
                                  ...p.departments.map((d) => d.name),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {showButtons ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleSetStatus(p, "present")}
                              className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
                                p.status === "present"
                                  ? "border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                                  : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                            >
                              {isSavingThis ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <>
                                  <span
                                    className="size-1.5 shrink-0 rounded-full bg-emerald-500"
                                    aria-hidden="true"
                                  />
                                  <span>Present</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleSetStatus(p, "absent")}
                              className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
                                p.status === "absent"
                                  ? "border-rose-500/40 bg-rose-500/10 font-semibold text-rose-700 dark:text-rose-300"
                                  : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                            >
                              {isSavingThis ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <>
                                  <span
                                    className="size-1.5 shrink-0 rounded-full bg-rose-500"
                                    aria-hidden="true"
                                  />
                                  <span>Absent</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleSetStatus(p, "excused")}
                              className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
                                p.status === "excused"
                                  ? "border-amber-500/40 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300"
                                  : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                            >
                              {isSavingThis ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <>
                                  <span
                                    className="size-1.5 shrink-0 rounded-full bg-amber-500"
                                    aria-hidden="true"
                                  />
                                  <span>Excused</span>
                                </>
                              )}
                            </button>

                            {p.status && (
                              <button
                                type="button"
                                onClick={() => toggleMemberControls(p.memberId)}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex size-9 items-center justify-center rounded-lg"
                                aria-label="Cancel editing"
                              >
                                <X className="size-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-2">
                            {p.status === "present" && (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                Present
                              </span>
                            )}
                            {p.status === "absent" && (
                              <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                                Absent
                              </span>
                            )}
                            {p.status === "excused" && (
                              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                Excused
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleMemberControls(p.memberId)}
                              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex size-9 items-center justify-center rounded-lg"
                              aria-label={`Change attendance for ${p.fullName}`}
                            >
                              <Ellipsis className="size-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 5. Pagination Bar */}
      <PaginationCard
        variant="bar"
        page={session.page}
        pageSize={session.pageSize}
        count={session.count}
        onPageChange={(page) => void setQuery({ page })}
      />

      {/* 6. Fixed Bottom Action Bar for Multi-select */}
      {isSelectionMode && selectedMemberIds.length > 0 && (
        <aside
          className="bg-card border-border/80 fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border p-2.5 shadow-2xl backdrop-blur-sm sm:gap-3 sm:p-3"
          aria-label="Bulk actions bar"
        >
          {/* Selected count badge */}
          <div className="flex shrink-0 items-center pl-1 sm:pl-1.5">
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-bold">
              {selectedMemberIds.length}
            </span>
          </div>

          {/* 3 Full-width Equal Buttons */}
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 sm:gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-[44px] w-full justify-center gap-1.5 px-2 text-xs font-medium sm:min-h-11 sm:px-3 sm:text-sm"
              onClick={() => triggerBulkAction("present", selectedMemberIds)}
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              <span>Present</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-[44px] w-full justify-center gap-1.5 px-2 text-xs font-medium sm:min-h-11 sm:px-3 sm:text-sm"
              onClick={() => triggerBulkAction("absent", selectedMemberIds)}
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-rose-500"
                aria-hidden="true"
              />
              <span>Absent</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-[44px] w-full justify-center gap-1.5 px-2 text-xs font-medium sm:min-h-11 sm:px-3 sm:text-sm"
              onClick={() => triggerBulkAction("excused", selectedMemberIds)}
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              <span>Excused</span>
            </Button>
          </div>

          {/* Cancel/Clear selection button */}
          <button
            type="button"
            onClick={() => setSelectedMemberIds([])}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors"
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </button>
        </aside>
      )}

      {/* 7. Bottom Drawer for Attendance Filter */}
      <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-none"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="text-lg font-semibold">
              Filter Attendance
            </SheetTitle>
            <SheetDescription className="text-xs">
              Select status to filter session members
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-1 p-4">
            {sessionAttendanceFilterValues.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setDraftStatus(val)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-colors ${
                  draftStatus === val
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span>{FILTER_LABELS[val]}</span>
                {draftStatus === val && <Check className="size-5" />}
              </button>
            ))}
          </div>

          <div className="flex gap-3 border-t p-4">
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 text-base"
              >
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="button"
              className="h-12 flex-1 text-base"
              onClick={() => {
                void setQuery({ status: draftStatus, page: 1 });
                setFilterDrawerOpen(false);
              }}
            >
              Apply Filter
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 11. Bulk Action Confirmation Sheet */}
      {bulkConfirm && (
        <ConfirmationSheet
          open={bulkConfirm.open}
          onOpenChange={(open) => {
            if (!open) setBulkConfirm(null);
          }}
          title={bulkConfirm.title}
          description={bulkConfirm.description}
          confirmLabel={`Confirm (${bulkConfirm.count})`}
          pending={bulkPending}
          pendingLabel="Saving attendance..."
          variant={
            bulkConfirm.targetStatus === "absent" ? "destructive" : "default"
          }
          onConfirm={executeBulkAction}
        />
      )}

      {/* 12. Success & Feedback Toast */}
      {toast && (
        <StatusToast
          message={toast.message}
          action={toast.action}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
