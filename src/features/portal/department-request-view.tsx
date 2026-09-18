"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
  const [toast, setToast] = React.useState("");
  const mine = rows.find(
    (row) => row.requesterId === memberProfileId && row.status === "pending",
  );
  async function submit() {
    const result = await submitDepartmentRequestAction({
      departmentId: department.id,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to submit request.");
    setToast("Request submitted.");
  }
  async function withdraw(id: string) {
    const result = await withdrawDepartmentRequestAction({ requestId: id });
    if (!result.success)
      return setToast(result.error ?? "Unable to withdraw request.");
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, status: "withdrawn" } : row,
      ),
    );
  }
  async function decide(id: string, decision: "approved" | "rejected") {
    const result = await decideDepartmentRequestAction({
      requestId: id,
      decision,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to decide request.");
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, status: decision } : row,
      ),
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-muted-foreground text-sm">Department requests</p>
        <h1 className="text-2xl font-bold">{department.name}</h1>
      </div>
      {!canManage && (
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-sm">Request to join this department.</p>
          {mine ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Pending request</span>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => void withdraw(mine.id)}
              >
                Withdraw
              </Button>
            </div>
          ) : (
            <Button className="mt-3 min-h-11" onClick={() => void submit()}>
              Submit request
            </Button>
          )}
        </div>
      )}
      {canManage && (
        <div className="grid gap-3">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No requests yet.</p>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-semibold">{row.requesterName}</p>
                  <p className="text-muted-foreground text-sm capitalize">
                    {row.status}
                  </p>
                </div>
                {row.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      className="min-h-11"
                      onClick={() => void decide(row.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => void decide(row.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}
      {toast && (
        <button
          type="button"
          className="text-primary text-sm"
          onClick={() => setToast("")}
        >
          {toast}
        </button>
      )}
    </div>
  );
}
