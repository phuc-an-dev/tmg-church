"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export interface EditActionButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "children"
> {
  label?: string;
  icon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
}

/**
 * Standard reusable edit action button with guaranteed 44px mobile touch target
 * and high-contrast background over cards.
 */
export function EditActionButton({
  label = "Edit",
  icon: Icon = Pencil,
  className,
  variant = "outline",
  ...props
}: EditActionButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(
        "border-border/80 bg-background hover:bg-muted/80 text-foreground min-h-11 w-full gap-2 text-sm font-semibold shadow-xs",
        className,
      )}
      data-interactive="true"
      {...props}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}

export interface DestructiveActionButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "children" | "variant"
> {
  label?: string;
  icon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  iconClassName?: string;
}

/**
 * Standard reusable destructive action button with guaranteed 44px mobile touch
 * target and the canonical subtle-red treatment.
 */
export function DestructiveActionButton({
  label = "Remove",
  icon: Icon = Trash2,
  iconClassName,
  className,
  ...props
}: DestructiveActionButtonProps) {
  return (
    <Button
      type="button"
      variant="destructive-subtle"
      className={cn(
        "min-h-11 w-full gap-2 text-sm font-semibold disabled:opacity-40",
        className,
      )}
      data-interactive="true"
      {...props}
    >
      <Icon className={cn("size-4", iconClassName)} aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}

export type DeleteActionButtonProps = DestructiveActionButtonProps;

export function DeleteActionButton(props: DeleteActionButtonProps) {
  return <DestructiveActionButton label="Delete" icon={Trash2} {...props} />;
}

export interface ItemActionButtonsProps {
  id?: string;
  onEdit?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  editLabel?: string;
  editDisabled?: boolean;
  editDisabledReason?: string;
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  deleteLabel?: string;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  deleteIcon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  deleteVariant?: "destructive-subtle" | "destructive" | "outline" | "default";
  className?: string;
}

/**
 * Combined pair of Edit and Delete action buttons, with accessible disabled reasons
 * and responsive 2-column layout.
 */
export function ItemActionButtons({
  id,
  onEdit,
  editLabel = "Edit",
  editDisabled = false,
  editDisabledReason,
  onDelete,
  deleteLabel = "Delete",
  deleteDisabled = false,
  deleteDisabledReason,
  deleteIcon: DeleteIcon = Trash2,
  deleteVariant = "destructive-subtle",
  className,
}: ItemActionButtonsProps) {
  const generatedId = React.useId();
  const baseId = id ?? generatedId;
  const deleteReasonId =
    deleteDisabled && deleteDisabledReason
      ? `delete-disabled-reason-${baseId}`
      : undefined;
  const editReasonId =
    editDisabled && editDisabledReason
      ? `edit-disabled-reason-${baseId}`
      : undefined;

  const hasBoth = Boolean(onEdit && onDelete);
  const isDestructiveDelete =
    deleteVariant === "destructive" || deleteVariant === "destructive-subtle";

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "grid gap-2 sm:gap-3",
          hasBoth ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {onEdit && (
          <EditActionButton
            label={editLabel}
            disabled={editDisabled}
            aria-describedby={editReasonId}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(event);
            }}
          />
        )}

        {onDelete &&
          (isDestructiveDelete ? (
            <DestructiveActionButton
              label={deleteLabel}
              icon={DeleteIcon}
              disabled={deleteDisabled}
              aria-describedby={deleteReasonId}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(event);
              }}
            />
          ) : (
            <Button
              type="button"
              variant={deleteVariant}
              className="min-h-11 w-full gap-2 text-sm font-semibold shadow-xs"
              disabled={deleteDisabled}
              aria-describedby={deleteReasonId}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(event);
              }}
              data-interactive="true"
            >
              <DeleteIcon className="size-4" aria-hidden="true" />
              <span>{deleteLabel}</span>
            </Button>
          ))}
      </div>

      {deleteDisabled && deleteDisabledReason && (
        <p id={deleteReasonId} className="text-muted-foreground mt-2 text-xs">
          {deleteDisabledReason}
        </p>
      )}
      {editDisabled && editDisabledReason && (
        <p id={editReasonId} className="text-muted-foreground mt-2 text-xs">
          {editDisabledReason}
        </p>
      )}
    </div>
  );
}
