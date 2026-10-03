"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { OptionPickerSheet } from "@/components/shared/option-picker-sheet";
import { StatusToast } from "@/components/ui/status-toast";
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
  const [picker, setPicker] = React.useState<
    "session" | "role" | "member" | null
  >(null);
  const [assignments, setAssignments] = React.useState(data.assignments);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");

  const selectedSession = data.sessions.find(
    (item) => item.session_id === sessionId,
  );
  const selectedRole = roles.find((item) => item.id === roleId);
  const selectedMember = data.members.find((item) => item.id === memberId);

  async function saveRole() {
    setPendingKey("role");
    const result = await savePortalDepartmentServiceRoleAction({
      departmentId: data.department.id,
      roleId: null,
      name: roleName,
    });
    setPendingKey(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to save role.");
    setRoleName("");
    setToast("Service role saved. Refresh to see it.");
  }
  async function removeRole(id: string) {
    setPendingKey(`role-${id}`);
    const result = await deletePortalDepartmentServiceRoleAction({
      roleId: id,
    });
    setPendingKey(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to delete role.");
    setRoles((current) => current.filter((role) => role.id !== id));
    if (roleId === id) setRoleId("");
  }
  async function assign() {
    setPendingKey("assign");
    const result = await savePortalServiceAssignmentAction({
      sessionId,
      roleId,
      membershipId: memberId,
    });
    setPendingKey(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to assign member.");
    setToast("Member assigned to service role.");
  }
  async function remove(id: string) {
    setPendingKey(`assignment-${id}`);
    const result = await removePortalServiceAssignmentAction({
      assignmentId: id,
    });
    setPendingKey(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to remove assignment.");
    setAssignments((current) =>
      current.filter((row) => row.assignment_id !== id),
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <AdminPageHeader
          title={data.department.name}
          description="Service roles and per-session assignments."
          backLink={{ href: "/portal", label: "Portal" }}
        />

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-semibold">Role catalog</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Service roles available for this department&apos;s sessions.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              className="bg-card h-12 text-base shadow-xs"
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              placeholder="New service role"
              aria-label="New service role name"
            />
            <Button
              className="min-h-12 shrink-0 gap-2 px-4"
              disabled={!roleName.trim() || pendingKey === "role"}
              onClick={() => void saveRole()}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Add</span>
            </Button>
          </div>
          {roles.length === 0 ? (
            <div className="border-border/60 bg-muted/20 rounded-xl border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">
                No service roles yet. Add the first one above.
              </p>
            </div>
          ) : (
            <div className="divide-border/60 overflow-hidden rounded-xl border">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="bg-card flex items-center justify-between gap-3 border-b p-3.5 last:border-b-0"
                >
                  <span className="text-foreground text-sm font-semibold">
                    {role.name}
                  </span>
                  <DestructiveActionButton
                    label="Delete"
                    disabled={pendingKey === `role-${role.id}`}
                    onClick={() => void removeRole(role.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-semibold">Assign a member</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Choose a Department session, service role, and an assigned
              Department member.
            </p>
          </div>
          <div className="admin-surface grid gap-3 p-4">
            <Button
              variant="outline"
              className="min-h-12 justify-between gap-2 px-4 text-base font-medium"
              onClick={() => setPicker("session")}
              disabled={data.sessions.length === 0}
            >
              <span className="truncate">
                {selectedSession
                  ? `${selectedSession.session_title} · ${selectedSession.session_date}`
                  : "Choose session"}
              </span>
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden="true"
              />
            </Button>
            <Button
              variant="outline"
              className="min-h-12 justify-between gap-2 px-4 text-base font-medium"
              onClick={() => setPicker("role")}
              disabled={roles.length === 0}
            >
              <span className="truncate">
                {selectedRole?.name ?? "Choose role"}
              </span>
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden="true"
              />
            </Button>
            <Button
              variant="outline"
              className="min-h-12 justify-between gap-2 px-4 text-base font-medium"
              onClick={() => setPicker("member")}
              disabled={data.members.length === 0}
            >
              <span className="truncate">
                {selectedMember?.name ?? "Choose member"}
              </span>
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden="true"
              />
            </Button>
            <Button
              className="min-h-12"
              disabled={
                !sessionId || !roleId || !memberId || pendingKey === "assign"
              }
              onClick={() => void assign()}
            >
              Assign member
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-semibold">Current assignments</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Members assigned to service roles, grouped per session.
            </p>
          </div>
          {assignments.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No assignments yet"
              description="Assignments appear here after you assign a member to a session role."
            />
          ) : (
            <div className="divide-border/60 overflow-hidden rounded-xl border">
              {assignments.map((row) => (
                <div
                  key={
                    row.assignment_id ??
                    `${row.session_id}-${row.role_id}-${row.membership_id}`
                  }
                  className="bg-card flex items-center justify-between gap-3 border-b p-3.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                      {row.full_name ?? "Unassigned"}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {row.session_title} · {row.role_name}
                    </p>
                  </div>
                  {row.assignment_id && (
                    <DestructiveActionButton
                      label="Remove"
                      disabled={
                        pendingKey === `assignment-${row.assignment_id}`
                      }
                      onClick={() => void remove(row.assignment_id as string)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <OptionPickerSheet
        open={picker === "session"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Choose session"
        options={data.sessions.map((session) => ({
          value: session.session_id,
          label: `${session.session_title} · ${session.session_date}`,
        }))}
        value={sessionId}
        onChange={setSessionId}
      />
      <OptionPickerSheet
        open={picker === "role"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Choose role"
        options={roles.map((role) => ({ value: role.id, label: role.name }))}
        value={roleId}
        onChange={setRoleId}
      />
      <OptionPickerSheet
        open={picker === "member"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Choose member"
        options={data.members.map((member) => ({
          value: member.id,
          label: member.name,
        }))}
        value={memberId}
        onChange={setMemberId}
      />

      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
