"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "cn";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Coordinator Context & Provider
// ---------------------------------------------------------------------------

interface ExpandableCoordinatorContextValue {
  openItemId: string | null;
  setOpenItemId: (id: string | null) => void;
  closeAll: () => void;
}

const ExpandableCoordinatorContext =
  React.createContext<ExpandableCoordinatorContextValue | null>(null);

export function useExpandableCoordinator(): ExpandableCoordinatorContextValue {
  const context = React.useContext(ExpandableCoordinatorContext);
  if (!context) {
    throw new Error(
      "useExpandableCoordinator must be used within an ExpandableCoordinatorProvider",
    );
  }
  return context;
}

export function ExpandableCoordinatorProvider({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  resetKey?: string;
}) {
  const [openItemId, setOpenItemId] = React.useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const closeAll = React.useCallback(() => {
    setOpenItemId(null);
  }, []);

  // Close on navigation / route or resetKey change (adjust own state during render)
  const navKey = `${pathname}?${searchParams?.toString() ?? ""}::${resetKey ?? ""}`;
  const [prevNavKey, setPrevNavKey] = React.useState(navKey);
  if (navKey !== prevNavKey) {
    setPrevNavKey(navKey);
    setOpenItemId(null);
  }

  // Close on outside pointer interaction
  React.useEffect(() => {
    if (!openItemId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const openElement = document.querySelector(
        `[data-expandable-item="${openItemId}"]`,
      );
      if (openElement && !openElement.contains(target)) {
        closeAll();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, [openItemId, closeAll]);

  // Close on vertical window scroll
  React.useEffect(() => {
    if (!openItemId) return;

    const handleScroll = () => {
      closeAll();
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [openItemId, closeAll]);

  // Close on Escape and return focus to originating trigger
  React.useEffect(() => {
    if (!openItemId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        const triggerId = `actions-trigger-${openItemId}`;
        const trigger = document.getElementById(triggerId);
        closeAll();
        trigger?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openItemId, closeAll]);

  // Close on crossing the desktop breakpoint
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeAll();
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [closeAll]);

  const value = React.useMemo(
    () => ({
      openItemId,
      setOpenItemId,
      closeAll,
    }),
    [openItemId, closeAll],
  );

  return (
    <ExpandableCoordinatorContext.Provider value={value}>
      {children}
    </ExpandableCoordinatorContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Item Context & Hooks
// ---------------------------------------------------------------------------

interface ExpandableItemContextValue {
  id: string;
  name: string;
  isOpen: boolean;
  toggleActions: () => void;
  onEdit?: () => void;
  editLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteIcon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  deleteVariant?: "destructive" | "default" | "outline";
  editDisabled?: boolean;
  editDisabledReason?: string;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  onAdditionalAction?: () => void;
  additionalActionLabel?: string;
  additionalActionSectionLabel?: string;
  primaryActionsSectionLabel?: string;
  additionalActionIcon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
}

const ExpandableItemContext =
  React.createContext<ExpandableItemContextValue | null>(null);

export function useExpandableItem(): ExpandableItemContextValue {
  const context = React.useContext(ExpandableItemContext);
  if (!context) {
    throw new Error(
      "useExpandableItem must be used within an ExpandableActionItem",
    );
  }
  return context;
}

export interface ExpandableActionItemProps {
  id: string;
  name: string;
  onEdit?: () => void;
  editLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteIcon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  deleteVariant?: "destructive" | "default" | "outline";
  editDisabled?: boolean;
  editDisabledReason?: string;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  onAdditionalAction?: () => void;
  additionalActionLabel?: string;
  additionalActionSectionLabel?: string;
  primaryActionsSectionLabel?: string;
  additionalActionIcon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Mobile Explicit Action Trigger Button
// ---------------------------------------------------------------------------

export function ExpandableActionTrigger({ className }: { className?: string }) {
  const { id, name, isOpen, toggleActions } = useExpandableItem();

  const label = isOpen
    ? `Hide actions for ${name}`
    : `Show actions for ${name}`;
  const tooltipText = isOpen ? "Hide actions" : "Show actions";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          id={`actions-trigger-${id}`}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-expanded={isOpen}
          aria-controls={`actions-panel-${id}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleActions();
          }}
          className={cn(
            "size-11 min-h-11 min-w-11 shrink-0 rounded-xl md:hidden",
            isOpen && "bg-muted text-foreground",
            className,
          )}
          data-interactive="true"
        >
          <Ellipsis className="size-5" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Mobile Expanded Actions Panel (rendered inside the item's cell)
// ---------------------------------------------------------------------------

export function ExpandableActionMobileActions({
  className,
}: {
  className?: string;
}) {
  const {
    id,
    name,
    isOpen,
    onEdit,
    editLabel = "Edit",
    onDelete,
    deleteLabel = "Delete",
    deleteIcon: DeleteIcon = Trash2,
    deleteVariant = "destructive",
    editDisabled,
    editDisabledReason,
    deleteDisabled,
    deleteDisabledReason,
    onAdditionalAction,
    additionalActionLabel = "Additional action",
    additionalActionSectionLabel = "Additional actions",
    primaryActionsSectionLabel = "Actions",
    additionalActionIcon: AdditionalActionIcon,
  } = useExpandableItem();

  if (!isOpen) return null;

  const deleteReasonId =
    deleteDisabled && deleteDisabledReason
      ? `delete-disabled-reason-${id}`
      : undefined;
  const editReasonId =
    editDisabled && editDisabledReason
      ? `edit-disabled-reason-${id}`
      : undefined;

  const hasMemberActions = Boolean(onEdit || onDelete);

  return (
    <div
      id={`actions-panel-${id}`}
      role="region"
      aria-label={`Actions for ${name}`}
      className={cn(
        "border-border/70 animate-in fade-in-0 mt-3 border-t pt-3 duration-150 motion-reduce:animate-none md:hidden",
        className,
      )}
    >
      {onAdditionalAction && AdditionalActionIcon && (
        <section className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {additionalActionSectionLabel}
          </p>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={(event) => {
              event.stopPropagation();
              onAdditionalAction();
            }}
            className="min-h-11 w-full gap-2 text-sm font-semibold"
            data-interactive="true"
          >
            <AdditionalActionIcon className="size-4" aria-hidden="true" />
            <span>{additionalActionLabel}</span>
          </Button>
        </section>
      )}
      {hasMemberActions && (
        <section className={cn("space-y-2", onAdditionalAction && "mt-4")}>
          {onAdditionalAction && (
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {primaryActionsSectionLabel}
            </p>
          )}
          <div
            className={cn(
              "grid gap-2 sm:gap-3",
              onEdit && onDelete ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {/* Edit Action Button */}
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="default"
                disabled={editDisabled}
                aria-describedby={editReasonId}
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                className="min-h-11 w-full gap-2 text-sm font-semibold"
                data-interactive="true"
              >
                <Pencil className="size-4" aria-hidden="true" />
                <span>{editLabel}</span>
              </Button>
            )}

            {/* Delete / Secondary Action Button */}
            {onDelete && (
              <Button
                type="button"
                variant={
                  deleteVariant === "destructive" ? "destructive" : "outline"
                }
                size="default"
                disabled={deleteDisabled}
                aria-describedby={deleteReasonId}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                className={cn(
                  "min-h-11 w-full gap-2 text-sm font-semibold",
                  deleteVariant === "destructive" &&
                    "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/25 border shadow-none",
                )}
                data-interactive="true"
              >
                <DeleteIcon className="size-4" aria-hidden="true" />
                <span>{deleteLabel}</span>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Accessible visible disabled reasons */}
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

// ---------------------------------------------------------------------------
// Desktop Row Action Menu
// ---------------------------------------------------------------------------

export function ExpandableActionDesktopMenu({
  className,
}: {
  className?: string;
}) {
  const {
    id,
    name,
    onEdit,
    editLabel = "Edit",
    onDelete,
    deleteLabel = "Delete",
    deleteIcon: DeleteIcon = Trash2,
    deleteVariant = "destructive",
    editDisabled,
    editDisabledReason,
    deleteDisabled,
    deleteDisabledReason,
    onAdditionalAction,
    additionalActionLabel = "Additional action",
    additionalActionIcon: AdditionalActionIcon,
  } = useExpandableItem();
  const { closeAll } = useExpandableCoordinator();

  const deleteReasonId =
    deleteDisabled && deleteDisabledReason
      ? `desktop-delete-reason-${id}`
      : undefined;
  const editReasonId =
    editDisabled && editDisabledReason
      ? `desktop-edit-reason-${id}`
      : undefined;

  return (
    <div className={cn("hidden items-center justify-end md:flex", className)}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                id={`desktop-actions-trigger-${id}`}
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-lg"
                aria-label={`Actions for ${name}`}
                data-interactive="true"
              >
                <Ellipsis className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Actions</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="max-w-xs min-w-44">
          {onAdditionalAction && AdditionalActionIcon && (
            <DropdownMenuItem
              onClick={() => {
                closeAll();
                onAdditionalAction();
              }}
              className="gap-2"
            >
              <AdditionalActionIcon
                className="size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{additionalActionLabel}</span>
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem
              disabled={editDisabled}
              aria-describedby={editReasonId}
              onClick={() => {
                closeAll();
                onEdit();
              }}
              className="gap-2"
            >
              <Pencil className="size-4 shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <span>{editLabel}</span>
                {editDisabled && editDisabledReason && (
                  <span
                    id={editReasonId}
                    className="text-muted-foreground text-[11px] leading-tight"
                  >
                    {editDisabledReason}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              disabled={deleteDisabled}
              aria-describedby={deleteReasonId}
              onClick={() => {
                closeAll();
                onDelete();
              }}
              variant={
                deleteVariant === "destructive" ? "destructive" : "default"
              }
              className="gap-2"
            >
              <DeleteIcon className="size-4 shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <span>{deleteLabel}</span>
                {deleteDisabled && deleteDisabledReason && (
                  <span
                    id={deleteReasonId}
                    className="text-muted-foreground text-[11px] leading-tight"
                  >
                    {deleteDisabledReason}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Canonical Expandable Action Item Component (role="row")
// ---------------------------------------------------------------------------

export function ExpandableActionItem({
  id,
  name,
  onEdit,
  editLabel = "Edit",
  onDelete,
  deleteLabel = "Delete",
  deleteIcon = Trash2,
  deleteVariant = "destructive",
  editDisabled = false,
  editDisabledReason,
  deleteDisabled = false,
  deleteDisabledReason,
  onAdditionalAction,
  additionalActionLabel = "Additional action",
  additionalActionSectionLabel = "Additional actions",
  primaryActionsSectionLabel = "Actions",
  additionalActionIcon,
  children,
  className,
}: ExpandableActionItemProps) {
  const { openItemId, setOpenItemId, closeAll } = useExpandableCoordinator();
  const isOpen = openItemId === id;

  const toggleActions = React.useCallback(() => {
    if (isOpen) {
      closeAll();
    } else {
      setOpenItemId(id);
    }
  }, [id, isOpen, closeAll, setOpenItemId]);

  const handleEdit = React.useCallback(() => {
    closeAll();
    onEdit?.();
  }, [closeAll, onEdit]);

  const handleDelete = React.useCallback(() => {
    closeAll();
    onDelete?.();
  }, [closeAll, onDelete]);
  const handleAdditionalAction = React.useCallback(() => {
    closeAll();
    onAdditionalAction?.();
  }, [closeAll, onAdditionalAction]);

  const itemContextValue = React.useMemo(
    () => ({
      id,
      name,
      isOpen,
      toggleActions,
      onEdit: onEdit ? handleEdit : undefined,
      editLabel,
      onDelete: onDelete ? handleDelete : undefined,
      deleteLabel,
      deleteIcon,
      deleteVariant,
      editDisabled,
      editDisabledReason,
      deleteDisabled,
      deleteDisabledReason,
      onAdditionalAction: onAdditionalAction
        ? handleAdditionalAction
        : undefined,
      additionalActionLabel,
      additionalActionSectionLabel,
      primaryActionsSectionLabel,
      additionalActionIcon,
    }),
    [
      id,
      name,
      isOpen,
      toggleActions,
      onEdit,
      handleEdit,
      editLabel,
      onDelete,
      handleDelete,
      deleteLabel,
      deleteIcon,
      deleteVariant,
      editDisabled,
      editDisabledReason,
      deleteDisabled,
      deleteDisabledReason,
      onAdditionalAction,
      handleAdditionalAction,
      additionalActionLabel,
      additionalActionSectionLabel,
      primaryActionsSectionLabel,
      additionalActionIcon,
    ],
  );

  return (
    <ExpandableItemContext.Provider value={itemContextValue}>
      <div
        role="row"
        data-expandable-item={id}
        className={cn(
          "bg-card relative rounded-2xl border shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] md:rounded-none md:border-0 md:shadow-none",
          className,
        )}
      >
        {children}
      </div>
    </ExpandableItemContext.Provider>
  );
}

ExpandableActionItem.Trigger = ExpandableActionTrigger;
ExpandableActionItem.DesktopActions = ExpandableActionDesktopMenu;
ExpandableActionItem.MobileActions = ExpandableActionMobileActions;
