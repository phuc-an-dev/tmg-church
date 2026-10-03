"use client";

import * as React from "react";
import { Search, UserPlus, UserMinus, UsersRound } from "lucide-react";
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
  assignPortalGroupMemberAction,
  removePortalGroupMemberAction,
} from "./group-member-actions";
import type { PortalGroupMemberRow } from "./group-member-queries";

const PAGE_SIZE = 20;

export function PortalGroupMemberView({
  group,
  members,
  canManage,
}: {
  group: { id: string; name: string };
  members: PortalGroupMemberRow[];
  canManage: boolean;
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

  async function assign(row: PortalGroupMemberRow) {
    setPendingId(row.membershipId);
    const result = await assignPortalGroupMemberAction({
      groupId: group.id,
      membershipId: row.membershipId,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to assign member.");
    setRows((current) =>
      current.map((item) =>
        item.membershipId === row.membershipId
          ? {
              ...item,
              groupMembershipId: "pending",
              role: "member",
              status: "active",
              currentGroupId: group.id,
            }
          : item,
      ),
    );
  }
  async function remove(row: PortalGroupMemberRow) {
    if (!row.groupMembershipId || row.groupMembershipId === "pending") return;
    setPendingId(row.membershipId);
    const result = await removePortalGroupMemberAction({
      recordId: row.groupMembershipId,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to remove member.");
    setRows((current) =>
      current.map((item) =>
        item.membershipId === row.membershipId
          ? {
              ...item,
              groupMembershipId: null,
              role: null,
              status: null,
              currentGroupId: null,
            }
          : item,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          title={group.name}
          description="Term members and their group assignment."
          backLink={{ href: "/portal", label: "Portal" }}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No term members"
            description="Members enrolled in this ministry term will appear here, ready to be grouped."
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
                placeholder="Search members"
                aria-label="Search group members"
              />
            </div>
            <ExpandableCoordinatorProvider resetKey={`${query}-${page}`}>
              <ListTable label="Group members">
                <ListTableHeader gridClassName="md:grid-cols-[1fr_140px_44px]">
                  <div role="columnheader">Member</div>
                  <div role="columnheader">Status</div>
                  <div role="columnheader" className="text-right">
                    Actions
                  </div>
                </ListTableHeader>
                <ListTableBody>
                  {visible.map((row) => {
                    const inGroup = row.groupMembershipId !== null;
                    const inOtherGroup =
                      row.currentGroupId !== null &&
                      row.currentGroupId !== group.id;
                    const statusLabel = inGroup
                      ? "Active group member"
                      : inOtherGroup
                        ? "In another group"
                        : "Not assigned";
                    const pending = pendingId === row.membershipId;
                    return (
                      <ExpandableActionItem
                        key={row.membershipId}
                        id={`group-member-${row.membershipId}`}
                        name={row.name}
                        onAdditionalAction={
                          canManage && !inGroup && !inOtherGroup
                            ? () => void assign(row)
                            : undefined
                        }
                        additionalActionLabel="Assign to group"
                        additionalActionSectionLabel="Assignment"
                        additionalActionIcon={UserPlus}
                        onDelete={
                          canManage && inGroup
                            ? () => void remove(row)
                            : undefined
                        }
                        deleteLabel="Remove from group"
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
                              {row.role && inGroup && (
                                <span className="text-muted-foreground block text-xs capitalize">
                                  {row.role.replaceAll("_", " ")}
                                </span>
                              )}
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
