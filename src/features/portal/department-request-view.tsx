"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
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
import {
  submitDepartmentRequestAction,
  withdrawDepartmentRequestAction,
  decideDepartmentRequestAction,
} from "./department-request-actions";

type RequestRow = {
  id: string;
  status: string;
  reason: string | null;
  requesterId: string | null;
  requesterName: string;
  createdAt: string;
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  approved:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  pending:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  withdrawn: "border-border/60 bg-muted/40 text-muted-foreground",
};

export function PortalDepartmentRequestView({
  department,
  requests,
  canManage,
  memberProfileId,
}: {
  department: { id: string; name: string };
  requests: RequestRow[];
  canManage: boolean;
  memberProfileId: string | null;
}) {
  const [rows, setRows] = React.useState(requests);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");
  const mine = rows.find(
    (row) => row.requesterId === memberProfileId && row.status === "pending",
  );
  async function submit() {
    setPendingId("submit");
    const result = await submitDepartmentRequestAction({
      departmentId: department.id,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to submit request.");
    setToast("Request submitted.");
  }
  async function withdraw(id: string) {
    setPendingId(id);
    const result = await withdrawDepartmentRequestAction({ requestId: id });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to withdraw request.");
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, status: "withdrawn" } : row,
      ),
    );
  }
  async function decide(id: string, decision: "approved" | "rejected") {
    setPendingId(id);
    const result = await decideDepartmentRequestAction({
      requestId: id,
      decision,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to decide request.");
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, status: decision } : row,
      ),
    );
  }

  return (
    <div className="space-y-3">
      {!canManage && (
        <div className="admin-surface p-4">
          <p className="text-foreground text-sm font-medium">
            Join this department
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Submit a request and a department leader will review it.
          </p>
          {mine ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-sm font-medium">
                Your request is pending review.
              </span>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={pendingId === mine.id}
                onClick={() => void withdraw(mine.id)}
              >
                Withdraw
              </Button>
            </div>
          ) : (
            <Button
              className="mt-3 min-h-11"
              disabled={pendingId === "submit"}
              onClick={() => void submit()}
            >
              Submit request
            </Button>
          )}
        </div>
      )}

      {canManage &&
        (rows.length === 0 ? (
          <EmptyState
            icon={Check}
            title="No requests yet"
            description="Join requests from term members will appear here for review."
          />
        ) : (
          <ExpandableCoordinatorProvider resetKey={String(pendingId)}>
            <ListTable label="Department requests">
              <ListTableHeader gridClassName="md:grid-cols-[1fr_140px_44px]">
                <div role="columnheader">Member</div>
                <div role="columnheader">Status</div>
                <div role="columnheader" className="text-right">
                  Actions
                </div>
              </ListTableHeader>
              <ListTableBody>
                {rows.map((row) => {
                  const badgeStyle = STATUS_BADGE_STYLES[row.status];
                  const pending = pendingId === row.id;
                  return (
                    <ExpandableActionItem
                      key={row.id}
                      id={`department-request-${row.id}`}
                      name={row.requesterName}
                      onAdditionalAction={
                        row.status === "pending"
                          ? () => void decide(row.id, "approved")
                          : undefined
                      }
                      additionalActionLabel="Approve request"
                      additionalActionSectionLabel="Decision"
                      additionalActionIcon={Check}
                      onDelete={
                        row.status === "pending"
                          ? () => void decide(row.id, "rejected")
                          : undefined
                      }
                      deleteLabel="Reject request"
                      deleteIcon={X}
                      deleteDisabled={pending}
                      className="p-4 md:grid md:grid-cols-[1fr_140px_44px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {row.requesterName}
                          </p>
                          <p className="text-muted-foreground text-xs md:hidden">
                            <span className="capitalize">{row.status}</span>
                            {row.reason ? ` · ${row.reason}` : ""}
                          </p>
                        </div>
                        <ExpandableActionItem.Trigger className="md:hidden" />
                      </div>
                      <ExpandableActionItem.MobileActions />
                      <div role="cell" className="hidden md:block">
                        {badgeStyle ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${badgeStyle}`}
                          >
                            {row.status}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {row.status}
                          </span>
                        )}
                      </div>
                      <div role="cell" className="hidden justify-end md:flex">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </ExpandableActionItem>
                  );
                })}
              </ListTableBody>
            </ListTable>
          </ExpandableCoordinatorProvider>
        ))}
      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
