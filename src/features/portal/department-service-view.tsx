"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Shield } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { StatusToast } from "@/components/ui/status-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
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
  deletePortalDepartmentServiceRoleAction,
  savePortalDepartmentServiceRoleAction,
} from "./department-service-actions";

export function PortalDepartmentRoleView({
  department,
  roles,
}: {
  department: { id: string; name: string };
  roles: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<
    { id: string; name: string } | "new" | null
  >(null);
  const [roleName, setRoleName] = React.useState("");
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");

  function openEditor(role: { id: string; name: string } | "new") {
    setEditing(role);
    setRoleName(role === "new" ? "" : role.name);
  }

  async function save() {
    if (!editing) return;
    setPendingKey("save");
    const result = await savePortalDepartmentServiceRoleAction({
      departmentId: department.id,
      roleId: editing === "new" ? null : editing.id,
      name: roleName,
    });
    setPendingKey(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to save role.");
    setEditing(null);
    router.refresh();
  }
  async function removeRole(id: string) {
    setPendingKey(`role-${id}`);
    const result = await deletePortalDepartmentServiceRoleAction({
      roleId: id,
    });
    setPendingKey(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to delete role.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {roles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No service roles created yet"
          description={`Define service roles for ${department.name} to assign responsibilities during church sessions.`}
          action={
            <Button
              type="button"
              onClick={() => openEditor("new")}
              className="min-h-11 gap-2 text-sm font-semibold"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Create first service role</span>
            </Button>
          }
        />
      ) : (
        <ExpandableCoordinatorProvider resetKey={String(pendingKey)}>
          <ListTable label="Department service roles">
            <ListTableHeader gridClassName="md:grid-cols-[1fr_80px]">
              <div role="columnheader">Role name</div>
              <div role="columnheader" className="text-right">
                Actions
              </div>
            </ListTableHeader>
            <ListTableBody>
              {roles.map((role) => (
                <ExpandableActionItem
                  key={role.id}
                  id={`department-role-${role.id}`}
                  name={role.name}
                  onEdit={() => openEditor(role)}
                  editLabel="Rename"
                  onDelete={() => void removeRole(role.id)}
                  deleteLabel="Delete"
                  deleteDisabled={pendingKey === `role-${role.id}`}
                  className="p-4 md:grid md:grid-cols-[1fr_80px] md:items-center md:gap-4 md:p-3"
                >
                  <div role="cell" className="min-w-0">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="text-foreground min-w-0 flex-1 truncate font-semibold">
                        {role.name}
                      </span>
                      <ExpandableActionItem.Trigger className="md:hidden" />
                    </div>
                    <ExpandableActionItem.MobileActions />
                  </div>
                  <div role="cell" className="hidden justify-end md:flex">
                    <ExpandableActionItem.DesktopActions />
                  </div>
                </ExpandableActionItem>
              ))}
            </ListTableBody>
          </ListTable>
        </ExpandableCoordinatorProvider>
      )}

      <FloatingCreateButton onClick={() => openEditor("new")}>
        New role
      </FloatingCreateButton>

      <ResponsiveEditor
        open={Boolean(editing)}
        onOpenChange={(nextOpen) => !nextOpen && setEditing(null)}
        title={editing === "new" ? "New service role" : "Edit service role"}
        description="Service role for this department's sessions."
        footer={
          <>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setEditing(null)}
              disabled={pendingKey === "save"}
            >
              Cancel
            </Button>
            <Button
              className="min-h-[44px]"
              onClick={() => void save()}
              disabled={pendingKey === "save" || !roleName.trim()}
            >
              Save role
            </Button>
          </>
        }
      >
        <Input
          className="h-12 text-base"
          value={roleName}
          onChange={(event) => setRoleName(event.target.value)}
          placeholder="Role name"
          aria-label="Service role name"
        />
      </ResponsiveEditor>

      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
