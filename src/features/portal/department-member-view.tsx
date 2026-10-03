"use client";

import * as React from "react";
import { Search, UserMinus, UserPlus, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PaginationCard } from "@/components/shared/pagination-card";
import { StatusToast } from "@/components/ui/status-toast";
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

export function PortalDepartmentMemberView({
  department,
  members,
}: {
  department: { id: string; name: string };
  members: PortalDepartmentMemberRow[];
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState(members);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = rows.filter((row) =>
    row.name.toLowerCase().includes(normalizedQuery),
  );
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          title={department.name}
          description="Term members assigned to this department."
          backLink={{ href: "/portal", label: "Portal" }}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No term members"
            description="Members enrolled in this ministry term will appear here, ready to be assigned."
          />
        ) : (
          <>
            <div className="relative">
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
            <ExpandableCoordinatorProvider resetKey={`${query}-${page}`}>
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
                        No members match this search.
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
      </div>
      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
