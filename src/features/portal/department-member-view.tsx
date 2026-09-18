"use client";

import * as React from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import {
  assignPortalDepartmentMemberAction,
  removePortalDepartmentMemberAction,
} from "./department-member-actions";
import type { PortalDepartmentMemberRow } from "./department-member-queries";

export function PortalDepartmentMemberView({
  department,
  members,
}: {
  department: { id: string; name: string };
  members: PortalDepartmentMemberRow[];
}) {
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState(members);
  const [toast, setToast] = React.useState("");
  const visible = rows.filter((row) =>
    row.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  async function assign(row: PortalDepartmentMemberRow) {
    const result = await assignPortalDepartmentMemberAction({
      departmentId: department.id,
      membershipId: row.membershipId,
    });
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
    const result = await removePortalDepartmentMemberAction({
      assignmentId: row.assignmentId,
    });
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
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-muted-foreground text-sm">Department members</p>
        <h1 className="text-2xl font-bold">{department.name}</h1>
      </div>
      <Input
        className="min-h-11 text-base"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search term members"
        aria-label="Search department members"
      />
      <div className="grid gap-3">
        {visible.map((row) => (
          <article
            key={row.membershipId}
            className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <p className="font-semibold">{row.name}</p>
              <p className="text-muted-foreground text-sm">
                {row.assignmentId ? "Assigned to department" : "Not assigned"}
              </p>
            </div>
            {row.assignmentId ? (
              <DestructiveActionButton
                label="Remove"
                icon={UserMinus}
                onClick={() => void remove(row)}
              />
            ) : (
              <Button
                className="min-h-11 gap-2"
                onClick={() => void assign(row)}
              >
                <UserPlus className="size-4" />
                Assign
              </Button>
            )}
          </article>
        ))}
      </div>
      {toast && (
        <button
          type="button"
          className="text-destructive text-sm"
          onClick={() => setToast("")}
        >
          {toast}
        </button>
      )}
    </div>
  );
}
