"use client";

import * as React from "react";
import { cn } from "cn";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface ResponsiveEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidthClass?: string;
}

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 768px)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerSnapshot() {
  return true;
}

const emptySubscribe = () => () => {};

function useIsDesktop() {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const isDesktop = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!mounted) return null;
  return isDesktop;
}

/**
 * Shared responsive editor contract:
 * - Mobile (< 768px): Flush bottom Sheet/Drawer, rounded top corners only, drag handle,
 *   max 90dvh height, scrollable body, visible sticky header and footer, env(safe-area-inset-bottom),
 *   44px close touch target.
 * - Desktop (>= 768px): Centered Dialog, consistent max width, horizontally aligned footer actions.
 */
export function ResponsiveEditor({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidthClass = "sm:max-w-lg",
}: ResponsiveEditorProps) {
  const isDesktop = useIsDesktop();

  // Defer rendering until viewport check completes to prevent hydration layout flicker
  if (isDesktop === null) {
    return null;
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "border-border/80 bg-card overflow-hidden rounded-2xl p-0 shadow-xl",
            maxWidthClass,
          )}
        >
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-foreground text-xl font-bold">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-muted-foreground mt-1 text-sm">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="max-h-[70dvh] overflow-y-auto px-6 py-2">
            {children}
          </div>

          <div className="border-border/70 bg-muted/30 grid grid-cols-2 gap-3 border-t px-6 py-4 [&>*]:w-full">
            {footer}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-none"
      >
        {/* Mobile visual drag handle */}
        <div
          className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
          aria-hidden="true"
        />

        <div className="border-border/70 flex shrink-0 items-start justify-between border-b px-5 pt-3 pb-3">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-foreground text-lg font-bold">
              {title}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus:ring-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors focus:ring-2 focus:outline-none"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Independently scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Visible sticky action footer respecting safe-area */}
        <div className="border-border/70 bg-muted/30 grid shrink-0 grid-cols-2 gap-3 border-t px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full">
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}
