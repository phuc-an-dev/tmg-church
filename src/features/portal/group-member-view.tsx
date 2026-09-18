"use client";

import * as React from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import {
  assignPortalGroupMemberAction,
  removePortalGroupMemberAction,
} from "./group-member-actions";
import type { PortalGroupMemberRow } from "./group-member-queries";

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
  const [rows, setRows] = React.useState(members);
  const [toast, setToast] = React.useState("");
  const visible = rows.filter((row) =>
    row.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  async function assign(row: PortalGroupMemberRow) {
    const result = await assignPortalGroupMemberAction({
      groupId: group.id,
      membershipId: row.membershipId,
    });
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
    const result = await removePortalGroupMemberAction({
      recordId: row.groupMembershipId,
    });
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
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-muted-foreground text-sm">Group members</p>
        <h1 className="text-2xl font-bold">{group.name}</h1>
      </div>
      <Input
        className="min-h-11 text-base"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search members"
        aria-label="Search group members"
      />
      <div className="grid gap-3">
        {visible.map((row) => {
          const inGroup = row.groupMembershipId !== null;
          const inOtherGroup =
            row.currentGroupId !== null && row.currentGroupId !== group.id;
          return (
            <article
              key={row.membershipId}
              className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-muted-foreground text-sm">
                  {inGroup
                    ? "Active group member"
                    : inOtherGroup
                      ? "Assigned to another group"
                      : "Not assigned to a group"}
                </p>
              </div>
              {canManage &&
                (inGroup ? (
                  <DestructiveActionButton
                    label="Remove"
                    icon={UserMinus}
                    onClick={() => void remove(row)}
                  />
                ) : !inOtherGroup ? (
                  <Button
                    className="min-h-11 gap-2"
                    onClick={() => void assign(row)}
                  >
                    <UserPlus className="size-4" />
                    Assign
                  </Button>
                ) : null)}
            </article>
          );
        })}
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
