"use client";

import * as React from "react";
import { X } from "lucide-react";
import { ActionFooter } from "@/components/shared/action-footer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ConfirmationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  pendingLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  confirmIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Shared confirmation contract: every destructive or status-changing confirmation
 * is a bottom sheet, with a consistent accessible header and action footer.
 */
export function ConfirmationSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending = false,
  pendingLabel,
  onConfirm,
  variant = "destructive",
  confirmIcon,
  children,
}: ConfirmationSheetProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && pending) return;
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-none"
      >
        <div
          className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
          aria-hidden="true"
        />

        <div className="border-border/70 flex items-start justify-between border-b px-5 pt-3 pb-3">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-foreground text-lg font-bold">
              {title}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground mt-0.5 text-sm leading-6">
              {description}
            </SheetDescription>
          </SheetHeader>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus:ring-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {children && (
          <div className="max-h-[45dvh] overflow-y-auto px-5 py-4">
            {children}
          </div>
        )}

        <ActionFooter className="border-border/70 bg-muted/30 shrink-0 border-t px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={pending}
            onClick={onConfirm}
            className="gap-2"
          >
            {!pending && confirmIcon}
            <span>
              {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
            </span>
          </Button>
        </ActionFooter>
      </SheetContent>
    </Sheet>
  );
}
