"use client";

import * as React from "react";
import { Ellipsis, Loader2, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { ItemActionButtons } from "@/components/shared/item-action-buttons";
import { StatusToast } from "@/components/ui/status-toast";
import { DynamicLucideIcon } from "./dynamic-lucide-icon";
import {
  deleteDepartmentServiceRoleAction,
  getDepartmentServiceStructureAction,
  saveDepartmentServiceRoleAction,
} from "../actions";
import type {
  DepartmentServiceRole,
  DepartmentServiceStructure,
} from "../types";

interface DepartmentServiceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: {
    id: string;
    name: string;
    slug: string;
    accentColor?: string;
    iconKey?: string;
  } | null;
  ministrySlug: string;
  termSlug: string;
  onStructureChanged?: () => void;
}

export function DepartmentServiceDrawer({
  open,
  onOpenChange,
  department,
  ministrySlug,
  termSlug,
  onStructureChanged,
}: DepartmentServiceDrawerProps) {
  const [loading, setLoading] = React.useState(false);
  const [structure, setStructure] =
    React.useState<DepartmentServiceStructure | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  // Editing / adding sub-state
  const [editingRole, setEditingRole] = React.useState<
    DepartmentServiceRole | "new" | null
  >(null);
  const [nameDraft, setNameDraft] = React.useState("");
  const [pending, setPending] = React.useState(false);

  // Deleting sub-state
  const [deletingRole, setDeletingRole] =
    React.useState<DepartmentServiceRole | null>(null);

  // Role action expansion sub-state
  const [expandedRoleId, setExpandedRoleId] = React.useState<string | null>(
    null,
  );

  const reloadData = React.useCallback(async () => {
    if (!department) return;
    try {
      const result = await getDepartmentServiceStructureAction(
        ministrySlug,
        termSlug,
        department.slug,
      );
      if (result.success) {
        setStructure(result.data);
      } else {
        setFeedback(result.error);
      }
    } catch {
      setFeedback("Failed to load service structure.");
    }
  }, [department, ministrySlug, termSlug]);

  React.useEffect(() => {
    if (!open || !department) return;
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const result = await getDepartmentServiceStructureAction(
          ministrySlug,
          termSlug,
          department.slug,
        );
        if (!isMounted) return;
        if (result.success) {
          setStructure(result.data);
        } else {
          setFeedback(result.error);
        }
      } catch {
        if (!isMounted) return;
        setFeedback("Failed to load service structure.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [open, department, ministrySlug, termSlug]);

  if (!department) return null;

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!nameDraft.trim() || !department) return;
    setPending(true);
    try {
      const result = await saveDepartmentServiceRoleAction({
        id: editingRole !== "new" && editingRole ? editingRole.id : undefined,
        termDepartmentId: department.id,
        name: nameDraft.trim(),
      });
      if (result.success) {
        setFeedback(result.message);
        setEditingRole(null);
        setNameDraft("");
        setExpandedRoleId(null);
        await reloadData();
        onStructureChanged?.();
      } else {
        setFeedback(result.error);
      }
    } catch {
      setFeedback("Unable to save service role.");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteRole() {
    if (!deletingRole || !department) return;
    setPending(true);
    try {
      const result = await deleteDepartmentServiceRoleAction({
        id: deletingRole.id,
        termDepartmentId: department.id,
      });
      if (result.success) {
        setFeedback(result.message);
        setDeletingRole(null);
        setExpandedRoleId(null);
        await reloadData();
        onStructureChanged?.();
      } else {
        setFeedback(result.error);
      }
    } catch {
      setFeedback("Unable to delete service role.");
    } finally {
      setPending(false);
    }
  }

  const roles = structure?.roles ?? [];

  return (
    <>
      <ResponsiveEditor
        open={open}
        onOpenChange={onOpenChange}
        title={`${department.name} — Service Roles`}
        description="Configure the service roles for this department (e.g. Worship Leader, Audio Engineer, Usher)."
        maxWidthClass="sm:max-w-xl"
        footer={
          <Button
            type="button"
            variant="outline"
            className="col-span-2 min-h-11 w-full text-base font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-5">
          {/* Department badge banner */}
          <div className="bg-muted/30 flex items-center gap-3 rounded-xl border p-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{
                backgroundColor: department.accentColor || "var(--primary)",
              }}
            >
              <DynamicLucideIcon
                iconKey={department.iconKey || "layers-3"}
                className="size-5"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-foreground truncate font-semibold">
                {department.name}
              </h3>
              <p className="text-muted-foreground font-mono text-xs">
                /{department.slug}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Service Roles ({roles.length})
                </span>
                <Button
                  type="button"
                  className="h-11 min-h-11 gap-2 px-4 text-sm font-semibold"
                  onClick={() => {
                    setEditingRole("new");
                    setNameDraft("");
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <span>Add Role</span>
                </Button>
              </div>

              {roles.length === 0 ? (
                <div className="rounded-xl border border-dashed py-8 text-center">
                  <p className="text-foreground text-sm font-medium">
                    No service roles yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Add roles such as Worship Leader, Audio Engineer, or Usher.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-11 min-h-11 gap-2 px-4 text-sm font-semibold"
                    onClick={() => {
                      setEditingRole("new");
                      setNameDraft("");
                    }}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    <span>Add First Role</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => {
                    const hasAssignments = role.assignmentCount > 0;
                    const isExpanded = expandedRoleId === role.id;
                    return (
                      <div
                        key={role.id}
                        className="border-border/80 bg-card rounded-xl border p-3.5 shadow-2xs sm:p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-sm font-semibold">
                              {role.name}
                            </p>
                            {hasAssignments && (
                              <span className="text-muted-foreground mt-0.5 inline-block text-xs">
                                {role.assignmentCount}{" "}
                                {role.assignmentCount === 1
                                  ? "assignment"
                                  : "assignments"}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              isExpanded
                                ? `Hide actions for ${role.name}`
                                : `Show actions for ${role.name}`
                            }
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedRoleId((prev) =>
                                prev === role.id ? null : role.id,
                              )
                            }
                            className={cn(
                              "size-11 min-h-11 min-w-11 shrink-0 rounded-xl",
                              isExpanded && "bg-muted text-foreground",
                            )}
                          >
                            <Ellipsis className="size-5" aria-hidden="true" />
                          </Button>
                        </div>

                        {isExpanded && (
                          <div
                            role="region"
                            aria-label={`Actions for ${role.name}`}
                            className="border-border/70 animate-in fade-in-0 mt-3 border-t pt-3 duration-150 motion-reduce:animate-none"
                          >
                            <ItemActionButtons
                              id={role.id}
                              onEdit={() => {
                                setEditingRole(role);
                                setNameDraft(role.name);
                              }}
                              onDelete={() => setDeletingRole(role)}
                              deleteDisabled={hasAssignments}
                              deleteDisabledReason="Cannot delete role referenced by service assignments."
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </ResponsiveEditor>

      {/* Add / Edit Role Responsive Bottom Drawer */}
      <ResponsiveEditor
        open={Boolean(editingRole)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !pending) {
            setEditingRole(null);
            setNameDraft("");
          }
        }}
        title={editingRole === "new" ? "Add Service Role" : "Edit Service Role"}
        description={
          editingRole === "new"
            ? `Add a new service role to ${department.name}.`
            : `Update the service role name for ${department.name}.`
        }
        maxWidthClass="sm:max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => {
                setEditingRole(null);
                setNameDraft("");
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="service-role-form"
              className="min-h-11 w-full font-semibold"
              disabled={pending || !nameDraft.trim()}
            >
              {pending ? "Saving..." : "Save Role"}
            </Button>
          </>
        }
      >
        <form
          id="service-role-form"
          onSubmit={handleSaveRole}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="role-name-input" className="text-sm font-medium">
              Role name
            </Label>
            <Input
              id="role-name-input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="e.g. Worship Leader, Audio Engineer, Usher"
              required
              autoFocus
              className="min-h-11 text-base"
            />
          </div>
        </form>
      </ResponsiveEditor>

      {/* Delete Confirmation Sheet */}
      <ConfirmationSheet
        open={Boolean(deletingRole)}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        title={`Delete ${deletingRole?.name}?`}
        description={`Are you sure you want to delete the service role "${deletingRole?.name}"? This action cannot be undone.`}
        confirmLabel="Delete role"
        pending={pending}
        pendingLabel="Deleting..."
        variant="destructive"
        onConfirm={handleDeleteRole}
      />

      {/* Toast Feedback */}
      {feedback && (
        <StatusToast message={feedback} onDismiss={() => setFeedback(null)} />
      )}
    </>
  );
}
