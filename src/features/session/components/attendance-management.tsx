"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Filter,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Square,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { PaginationCard } from "@/components/shared/pagination-card";
import { StatusToast } from "@/components/ui/status-toast";
import {
  deleteSessionAction,
  saveAttendanceAction,
  saveBulkAttendanceAction,
  saveSessionAction,
} from "../actions";
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

const FILTER_LABELS: Record<SessionFilterStatus, string> = {
  all: "All",
  pending: "Pending",
  present: "Present",
  absent: "Absent",
  excused: "Excused",
};

export function AttendanceManagement({ session }: { session: SessionDetail }) {
  const router = useRouter();

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

  // More menu state
  const [moreDrawerOpen, setMoreDrawerOpen] = React.useState(false);

  // Edit Session state
  const [editOpen, setEditOpen] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(session.title);
  const [editDate, setEditDate] = React.useState(session.sessionDate);
  const [editPending, setEditPending] = React.useState(false);

  // Delete Session confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);

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
    const result = await saveAttendanceAction({
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
    const result = await saveBulkAttendanceAction({
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

  // Save session edits
  async function handleSaveSession() {
    setEditPending(true);
    const result = await saveSessionAction({
      id: session.id,
      ministryTermId: session.termId,
      title: editTitle,
      sessionDate: editDate,
    });
    setEditPending(false);

    if (result.success) {
      setEditOpen(false);
      setToast({ message: "Session details updated." });
    } else {
      setToast({ message: result.error ?? "Failed to save session." });
    }
  }

  // Delete session
  async function handleDeleteSession() {
    setDeletePending(true);
    const result = await deleteSessionAction({ id: session.id });
    setDeletePending(false);

    if (result.success) {
      setDeleteConfirmOpen(false);
      router.push("/admin/sessions");
    } else {
      setToast({ message: result.error ?? "Failed to delete session." });
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

  const activeStatus = (query.status as SessionFilterStatus) || "pending";

  return (
    <div className="space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
      {/* 1. Compact Header with Back and More action */}
      <header className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/sessions"
            className="border-input hover:bg-accent hover:text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors"
            aria-label="Back to sessions"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {session.title}
            </h1>
            <p className="text-muted-foreground truncate text-sm">
              {session.ministryName} · {session.termName} ·{" "}
              {session.sessionDate} ·{" "}
              <span className="text-foreground/80 font-medium">
                {session.summary.recordedCount}/{session.summary.enrolledCount}{" "}
                recorded
              </span>
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="size-11 shrink-0 p-0"
          onClick={() => setMoreDrawerOpen(true)}
          aria-label="Session options"
        >
          <MoreVertical className="size-5" />
        </Button>
      </header>

      {/* 2. Summary Stat Grid (2-col on mobile, 4-col on desktop) */}
      <section aria-label="Attendance summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-xs font-medium tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
              Present
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
              {session.summary.presentCount}
            </p>
          </div>
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-xs font-medium tracking-wider text-rose-700 uppercase dark:text-rose-400">
              Absent
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-rose-800 dark:text-rose-300">
              {session.summary.absentCount}
            </p>
          </div>
          <div className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs">
            <p className="text-xs font-medium tracking-wider text-amber-700 uppercase dark:text-amber-400">
              Excused
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-amber-800 dark:text-amber-300">
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
      <section className="space-y-3">
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
            variant={isSelectionMode ? "secondary" : "outline"}
            className="h-11 gap-2 px-3.5"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedMemberIds([]);
            }}
          >
            <CheckSquare className="size-4" />
            <span>{isSelectionMode ? "Cancel" : "Select"}</span>
          </Button>

          {/* Mark all present button (applies to all filtered members across pages) */}
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1.5 px-3.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            disabled={session.filteredMemberIds.length === 0}
            onClick={() =>
              triggerBulkAction("present", session.filteredMemberIds, true)
            }
          >
            <Users className="size-4" />
            <span className="hidden sm:inline">Mark all present</span>
            <span className="sm:hidden">All present</span>
          </Button>
        </div>

        {/* Selection mode toolbar helper */}
        {isSelectionMode && (
          <div className="border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-1.5 text-sm">
            <button
              type="button"
              onClick={toggleSelectAllCurrentPage}
              className="hover:text-primary hover:bg-card/80 active:bg-card flex min-h-[44px] items-center gap-2.5 rounded-lg px-3.5 py-2 font-medium transition-colors"
            >
              {allCurrentPageSelected ? (
                <CheckSquare className="text-primary size-5" />
              ) : (
                <Square className="text-muted-foreground size-5" />
              )}
              <span className="text-sm font-semibold">Select all on page</span>
            </button>
            <span className="text-muted-foreground px-3.5 py-2 text-xs font-medium">
              {selectedMemberIds.length} selected total
            </span>
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

              return (
                <article
                  key={p.memberId}
                  className="bg-card border-border/80 rounded-xl border p-4 shadow-2xs transition-shadow"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
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
                      <h2 className="text-foreground text-base leading-tight font-semibold">
                        {p.fullName}
                      </h2>
                    </div>

                    {/* Status badge and 3-dots action in top right */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {p.status === "present" && (
                        <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Present
                        </span>
                      )}
                      {p.status === "absent" && (
                        <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                          Absent
                        </span>
                      )}
                      {p.status === "excused" && (
                        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          Excused
                        </span>
                      )}
                      {!p.status && (
                        <span className="border-border text-muted-foreground inline-flex items-center rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-normal">
                          Pending
                        </span>
                      )}

                      {/* 3-dots icon on top right: click to show 3 buttons to re-select */}
                      {p.status && (
                        <button
                          type="button"
                          onClick={() => toggleMemberControls(p.memberId)}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors"
                          aria-label={`Change attendance for ${p.fullName}`}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3 Segmented attendance controls (outline buttons without icons, >=44px) */}
                  {(!p.status || expandedMemberIds.has(p.memberId)) && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={() => handleSetStatus(p, "present")}
                        className={`flex min-h-[44px] items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                          p.status === "present"
                            ? "border-2 border-emerald-600 bg-emerald-100 font-semibold text-emerald-800 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "border-emerald-300/80 bg-emerald-50/20 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800/80 dark:bg-emerald-950/10 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                      >
                        {isSavingThis ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Present"
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={() => handleSetStatus(p, "absent")}
                        className={`flex min-h-[44px] items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                          p.status === "absent"
                            ? "border-2 border-rose-600 bg-rose-100 font-semibold text-rose-800 shadow-xs dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-200"
                            : "border-rose-300/80 bg-rose-50/20 text-rose-700 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-800/80 dark:bg-rose-950/10 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                      >
                        {isSavingThis ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Absent"
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={() => handleSetStatus(p, "excused")}
                        className={`flex min-h-[44px] items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                          p.status === "excused"
                            ? "border-2 border-amber-600 bg-amber-100 font-semibold text-amber-800 shadow-xs dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-200"
                            : "border-amber-300/80 bg-amber-50/20 text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-800/80 dark:bg-amber-950/10 dark:text-amber-400 dark:hover:bg-amber-950/30"
                        } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                      >
                        {isSavingThis ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Excused"
                        )}
                      </button>
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
                        {p.fullName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {showButtons ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleSetStatus(p, "present")}
                              className={`inline-flex min-h-[36px] items-center justify-center rounded-lg border px-3 text-xs font-medium transition-all ${
                                p.status === "present"
                                  ? "border-2 border-emerald-600 bg-emerald-100 font-semibold text-emerald-800 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200"
                                  : "border-emerald-300/80 bg-emerald-50/20 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800/80 dark:bg-emerald-950/10 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                            >
                              {isSavingThis ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                "Present"
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleSetStatus(p, "absent")}
                              className={`inline-flex min-h-[36px] items-center justify-center rounded-lg border px-3 text-xs font-medium transition-all ${
                                p.status === "absent"
                                  ? "border-2 border-rose-600 bg-rose-100 font-semibold text-rose-800 shadow-xs dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-200"
                                  : "border-rose-300/80 bg-rose-50/20 text-rose-700 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-800/80 dark:bg-rose-950/10 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                            >
                              {isSavingThis ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                "Absent"
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleSetStatus(p, "excused")}
                              className={`inline-flex min-h-[36px] items-center justify-center rounded-lg border px-3 text-xs font-medium transition-all ${
                                p.status === "excused"
                                  ? "border-2 border-amber-600 bg-amber-100 font-semibold text-amber-800 shadow-xs dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-200"
                                  : "border-amber-300/80 bg-amber-50/20 text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-800/80 dark:bg-amber-950/10 dark:text-amber-400 dark:hover:bg-amber-950/30"
                              } ${isSavingThis ? "pointer-events-none opacity-60" : ""}`}
                            >
                              {isSavingThis ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                "Excused"
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
                              <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                Present
                              </span>
                            )}
                            {p.status === "absent" && (
                              <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                                Absent
                              </span>
                            )}
                            {p.status === "excused" && (
                              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                Excused
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleMemberControls(p.memberId)}
                              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex size-9 items-center justify-center rounded-lg"
                              aria-label={`Change attendance for ${p.fullName}`}
                            >
                              <MoreVertical className="size-4" />
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
          className="bg-card border-border/80 fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-2xl items-center justify-between gap-2 rounded-2xl border p-3 shadow-2xl backdrop-blur-sm sm:gap-3"
          aria-label="Bulk actions bar"
        >
          <div className="flex items-center gap-2 pl-2">
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-bold">
              {selectedMemberIds.length}
            </span>
            <span className="text-foreground text-xs font-semibold sm:text-sm">
              selected
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-[44px] border-emerald-300 px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 sm:min-h-0 sm:px-3 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              onClick={() => triggerBulkAction("present", selectedMemberIds)}
            >
              Present
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-[44px] border-rose-300 px-2.5 text-xs text-rose-700 hover:bg-rose-50 sm:min-h-0 sm:px-3 dark:text-rose-400 dark:hover:bg-rose-950/40"
              onClick={() => triggerBulkAction("absent", selectedMemberIds)}
            >
              Absent
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-[44px] border-amber-300 px-2.5 text-xs text-amber-700 hover:bg-amber-50 sm:min-h-0 sm:px-3 dark:text-amber-400 dark:hover:bg-amber-950/40"
              onClick={() => triggerBulkAction("excused", selectedMemberIds)}
            >
              Excused
            </Button>
            <button
              type="button"
              onClick={() => setSelectedMemberIds([])}
              className="text-muted-foreground hover:text-foreground flex size-11 items-center justify-center p-2 text-xs"
              aria-label="Clear selection"
            >
              <X className="size-4" />
            </button>
          </div>
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

      {/* 8. Bottom Drawer for More Actions (Edit & Delete info) */}
      <Sheet open={moreDrawerOpen} onOpenChange={setMoreDrawerOpen}>
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
              Session Options
            </SheetTitle>
            <SheetDescription className="text-xs">
              Manage details or remove this session
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 p-5">
            {/* Edit action */}
            <button
              type="button"
              onClick={() => {
                setMoreDrawerOpen(false);
                setEditTitle(session.title);
                setEditDate(session.sessionDate);
                setEditOpen(true);
              }}
              className="hover:bg-muted/50 flex min-h-[48px] w-full items-center gap-3 rounded-xl border p-3.5 text-base font-medium transition-colors"
            >
              <Pencil className="text-muted-foreground size-5" />
              <span>Edit session details</span>
            </button>

            {/* Guarded delete behavior (Requirement #6) */}
            {session.canDelete ? (
              <button
                type="button"
                onClick={() => {
                  setMoreDrawerOpen(false);
                  setDeleteConfirmOpen(true);
                }}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 text-base font-medium text-rose-700 transition-colors hover:bg-rose-100/50 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400"
              >
                <Trash2 className="size-5" />
                <span>Delete session</span>
              </button>
            ) : (
              <div className="border-border/70 bg-muted/40 text-muted-foreground rounded-xl border p-4 text-xs">
                <p className="text-foreground text-sm font-medium">
                  Deletion unavailable
                </p>
                <p className="mt-1 leading-relaxed">
                  This session cannot be deleted because it has participant
                  attendance or service dependencies.
                </p>
              </div>
            )}
          </div>

          <div className="border-t p-4">
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base"
              >
                Close
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      {/* 9. Edit Session Editor (Responsive: Drawer on mobile, Dialog on desktop) */}
      <ResponsiveEditor
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Session"
        description="Update session title and date. Ministry Term is locked."
        footer={
          <div className="flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 text-base"
              disabled={editPending}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 text-base"
              disabled={editPending || !editTitle.trim() || !editDate}
              onClick={handleSaveSession}
            >
              {editPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Ministry Term</Label>
            <Input
              disabled
              value={`${session.ministryName} · ${session.termName}`}
              className="bg-muted/50 h-12 cursor-not-allowed text-base"
            />
            <p className="text-muted-foreground text-xs">
              Sessions cannot be moved to another term once created.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-title" className="text-sm font-semibold">
              Title
            </Label>
            <Input
              id="session-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Sunday Service or Weekly Practice"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Session Date</Label>
            <DatePicker
              value={editDate}
              onChange={setEditDate}
              placeholder="Select session date"
            />
          </div>
        </div>
      </ResponsiveEditor>

      {/* 10. Delete Confirmation Sheet */}
      <ConfirmationSheet
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Session"
        description={
          <>
            Are you sure you want to permanently delete{" "}
            <strong>{session.title}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete session"
        pending={deletePending}
        pendingLabel="Deleting..."
        onConfirm={handleDeleteSession}
      />

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
