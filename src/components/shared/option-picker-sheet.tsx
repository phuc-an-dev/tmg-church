"use client";

import * as React from "react";
import { cn } from "cn";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface OptionPickerItem<T extends string | null> {
  value: T;
  label: React.ReactNode;
}

/**
 * Mobile bottom drawer for single-select option lists. Manages draft selection
 * internally and commits through onChange on Confirm.
 */
export function OptionPickerSheet<T extends string | null>({
  open,
  onOpenChange,
  title,
  description,
  options,
  value,
  onChange,
  itemLabelClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  options: readonly OptionPickerItem<T>[];
  value: T;
  onChange: (value: T) => void;
  itemLabelClassName?: string;
}) {
  const [draft, setDraft] = React.useState<T>(value);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setDraft(value);
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="border-border/80 bg-card inset-x-0 bottom-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
      >
        <div
          className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
          <SheetTitle className="text-foreground text-lg font-bold">
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="text-muted-foreground text-xs">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-4">
          {options.map((opt) => {
            const isSelected = draft === opt.value;
            return (
              <button
                key={opt.value ?? "none"}
                type="button"
                onClick={() => setDraft(opt.value)}
                className={cn(
                  "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3.5 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 font-semibold"
                    : "border-border/70 bg-card",
                )}
              >
                <span
                  className={cn(
                    "text-foreground truncate text-sm font-semibold sm:text-base",
                    itemLabelClassName,
                  )}
                >
                  {opt.label}
                </span>
                {isSelected && (
                  <Check
                    className="text-primary ml-2 size-5 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
        <div
          className={cn(
            "border-border/70 bg-muted/30 shrink-0 border-t px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
            draft !== value ? "grid grid-cols-2 gap-3 [&>*]:w-full" : "",
          )}
        >
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-[44px] w-full text-base font-medium"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {draft !== value && (
            <Button
              type="button"
              className="h-11 min-h-[44px] w-full text-base font-medium"
              onClick={() => {
                onChange(draft);
                onOpenChange(false);
              }}
            >
              Confirm
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
