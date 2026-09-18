"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import {
  savePortalDepartmentServiceRoleAction,
  deletePortalDepartmentServiceRoleAction,
  savePortalServiceAssignmentAction,
  removePortalServiceAssignmentAction,
} from "./department-service-actions";

type Data = {
  department: { id: string; name: string };
  roles: { id: string; name: string }[];
  sessions: {
    session_id: string;
    session_title: string;
    session_date: string;
  }[];
  members: { id: string; name: string }[];
  assignments: {
    assignment_id: string | null;
    session_id: string;
    session_title: string;
    role_id: string;
    role_name: string;
    membership_id: string | null;
    full_name: string | null;
  }[];
};
export function PortalDepartmentServiceView({ data }: { data: Data }) {
  const [roles, setRoles] = React.useState(data.roles);
  const [roleName, setRoleName] = React.useState("");
  const [sessionId, setSessionId] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [memberId, setMemberId] = React.useState("");
  const [assignments, setAssignments] = React.useState(data.assignments);
  const [toast, setToast] = React.useState("");
  async function saveRole() {
    const result = await savePortalDepartmentServiceRoleAction({
      departmentId: data.department.id,
      roleId: null,
      name: roleName,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to save role.");
    setRoleName("");
    setToast("Service role saved. Refresh to see it.");
  }
  async function removeRole(id: string) {
    const result = await deletePortalDepartmentServiceRoleAction({
      roleId: id,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to delete role.");
    setRoles((current) => current.filter((role) => role.id !== id));
  }
  async function assign() {
    const result = await savePortalServiceAssignmentAction({
      sessionId,
      roleId,
      membershipId: memberId,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to assign member.");
    setToast("Member assigned to service role.");
  }
  async function remove(id: string) {
    const result = await removePortalServiceAssignmentAction({
      assignmentId: id,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to remove assignment.");
    setAssignments((current) =>
      current.filter((row) => row.assignment_id !== id),
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Department service roles
        </p>
        <h1 className="text-2xl font-bold">{data.department.name}</h1>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Role catalog</h2>
        <div className="flex gap-2">
          <Input
            className="min-h-11 text-base"
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="New service role"
          />
          <Button
            className="min-h-11"
            disabled={!roleName.trim()}
            onClick={() => void saveRole()}
          >
            Add
          </Button>
        </div>
        <div className="grid gap-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border-border flex items-center justify-between rounded-xl border p-3"
            >
              <span>{role.name}</span>
              <DestructiveActionButton
                label="Delete"
                onClick={() => void removeRole(role.id)}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Assign a member</h2>
        <p className="text-muted-foreground text-sm">
          Choose a Department session, service role, and an assigned Department
          member.
        </p>
        <div className="grid gap-3">
          <Button
            variant="outline"
            className="min-h-11 justify-start"
            onClick={() => setSessionId(data.sessions[0]?.session_id ?? "")}
          >
            Session:{" "}
            {data.sessions.find((item) => item.session_id === sessionId)
              ?.session_title ?? "Choose first session"}
          </Button>
          <Button
            variant="outline"
            className="min-h-11 justify-start"
            onClick={() => setRoleId(roles[0]?.id ?? "")}
          >
            Role:{" "}
            {roles.find((item) => item.id === roleId)?.name ??
              "Choose first role"}
          </Button>
          <Button
            variant="outline"
            className="min-h-11 justify-start"
            onClick={() => setMemberId(data.members[0]?.id ?? "")}
          >
            Member:{" "}
            {data.members.find((item) => item.id === memberId)?.name ??
              "Choose first member"}
          </Button>
          <Button
            className="min-h-11"
            disabled={!sessionId || !roleId || !memberId}
            onClick={() => void assign()}
          >
            Assign member
          </Button>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Current assignments</h2>
        {assignments.map((row) => (
          <div
            key={
              row.assignment_id ??
              `${row.session_id}-${row.role_id}-${row.membership_id}`
            }
            className="border-border flex items-center justify-between rounded-xl border p-3"
          >
            <div>
              <p className="font-medium">{row.full_name ?? "Unassigned"}</p>
              <p className="text-muted-foreground text-sm">
                {row.session_title} · {row.role_name}
              </p>
            </div>
            {row.assignment_id && (
              <DestructiveActionButton
                label="Remove"
                onClick={() => void remove(row.assignment_id as string)}
              />
            )}
          </div>
        ))}
      </section>
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
