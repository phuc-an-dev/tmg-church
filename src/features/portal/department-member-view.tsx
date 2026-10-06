"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { OptionPickerSheet } from "@/components/shared/option-picker-sheet";
import { PaginationCard } from "@/components/shared/pagination-card";
import { StatusToast } from "@/components/ui/status-toast";
import { Button } from "@/components/ui/button";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import {
  ListTable,
  ListTableBody,
  ListTableHeader,
} from "@/components/shared/list-table";
import { Input } from "@/components/ui/input";
import {
  assignPortalDepartmentMemberAction,
  removePortalDepartmentMemberAction,
} from "./department-member-actions";
import type { PortalDepartmentMemberRow } from "./department-member-queries";

const PAGE_SIZE = 20;

const MEMBER_FILTER_OPTIONS = [
  { value: "assigned", label: "Department members" },
  { value: "unassigned", label: "Not assigned" },
  { value: "all", label: "All term members" },
] as const;

type MemberFilter = (typeof MEMBER_FILTER_OPTIONS)[number]["value"];

export function PortalDepartmentMemberView({
  department,
  members,
}: {
  department: { id: string; name: string };
  members: PortalDepartmentMemberRow[];
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState<MemberFilter>("assigned");
  const [draftFilter, setDraftFilter] =
    React.useState<MemberFilter>("assigned");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [rows, setRows] = React.useState(members);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = rows
    .filter((row) => row.name.toLowerCase().includes(normalizedQuery))
    .filter((row) => {
      if (filter === "assigned") return Boolean(row.assignmentId);
      if (filter === "unassigned") return !row.assignmentId;
      return true;
    });
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function assign(row: PortalDepartmentMemberRow) {
    setPendingId(row.membershipId);
    const result = await assignPortalDepartmentMemberAction({
      departmentId: department.id,
      membershipId: row.membershipId,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to assign member.");
    setRows((current) =>
      current.map((item) =>
        item.membershipId === row.membershipId
          ? { ...item, assignmentId: "pending" }
          : item,
      ),
    );
  }
  async function remove(row: PortalDepartmentMemberRow) {
    if (!row.assignmentId || row.assignmentId === "pending") return;
    setPendingId(row.membershipId);
    const result = await removePortalDepartmentMemberAction({
      assignmentId: row.assignmentId,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to remove member.");
    setRows((current) =>
      current.map((item) =>
        item.membershipId === row.membershipId
          ? { ...item, assignmentId: null }
          : item,
      ),
    );
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No term members"
          description="Members enrolled in this ministry term will appear here, ready to be assigned."
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                className="bg-card h-12 pl-9 text-base shadow-xs"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search term members"
                aria-label="Search department members"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftFilter(filter);
                setFilterOpen(true);
              }}
              className="bg-card hover:bg-card min-h-12 shrink-0 gap-2 px-3.5"
              aria-label="Filter members"
            >
              <SlidersHorizontal
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              <span>Filter</span>
            </Button>
          </div>
          <ExpandableCoordinatorProvider
            resetKey={`${query}-${page}-${filter}`}
          >
            <ListTable label="Department members">
              <ListTableHeader gridClassName="md:grid-cols-[1fr_140px_44px]">
                <div role="columnheader">Member</div>
                <div role="columnheader">Status</div>
                <div role="columnheader" className="text-right">
                  Actions
                </div>
              </ListTableHeader>
              <ListTableBody>
                {visible.map((row) => {
                  const assigned = Boolean(row.assignmentId);
                  const pending = pendingId === row.membershipId;
                  const statusLabel = assigned ? "Assigned" : "Not assigned";
                  return (
                    <ExpandableActionItem
                      key={row.membershipId}
                      id={`department-member-${row.membershipId}`}
                      name={row.name}
                      onAdditionalAction={
                        assigned ? undefined : () => void assign(row)
                      }
                      additionalActionLabel="Assign to department"
                      additionalActionSectionLabel="Assignment"
                      additionalActionIcon={UserPlus}
                      onDelete={assigned ? () => void remove(row) : undefined}
                      deleteLabel="Remove from department"
                      deleteIcon={UserMinus}
                      deleteDisabled={pending}
                      className="p-4 md:grid md:grid-cols-[1fr_140px_44px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <MemberAvatar gender={row.gender} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {row.name}
                            </span>
                            <span className="text-muted-foreground block text-xs md:hidden">
                              {statusLabel}
                            </span>
                          </span>
                        </div>
                        <ExpandableActionItem.Trigger className="md:hidden" />
                      </div>
                      <ExpandableActionItem.MobileActions />
                      <div
                        role="cell"
                        className="text-muted-foreground hidden text-sm md:block"
                      >
                        {statusLabel}
                      </div>
                      <div role="cell" className="hidden justify-end md:flex">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </ExpandableActionItem>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="border-border/60 bg-muted/20 rounded-xl border border-dashed p-6 text-center">
                    <p className="text-muted-foreground text-sm">
                      {filter === "assigned"
                        ? "No department members match this search. Switch the filter to assign from all term members."
                        : "No members match this search or filter."}
                    </p>
                  </div>
                )}
              </ListTableBody>
            </ListTable>
            <PaginationCard
              page={page}
              pageSize={PAGE_SIZE}
              count={filtered.length}
              itemLabel="members"
              onPageChange={setPage}
            />
          </ExpandableCoordinatorProvider>
        </>
      )}
      <OptionPickerSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filter members"
        description="Department members are shown by default."
        options={MEMBER_FILTER_OPTIONS}
        value={draftFilter}
        onChange={(value) => {
          setDraftFilter(value);
          setPage(1);
          setFilter(value);
        }}
      />

      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
