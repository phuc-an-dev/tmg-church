"use client";

import * as React from "react";
import { cn } from "cn";
import { X } from "lucide-react";
import { ActionFooter } from "@/components/shared/action-footer";
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
  mobileMinHeightClass?: string;
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

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'input:not([type="hidden"]):not([disabled]):not([readonly])',
    "select:not([disabled]):not([readonly])",
    "textarea:not([disabled]):not([readonly])",
    "button:not([disabled])",
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => {
      // Exclude close/dismiss buttons
      if (
        el.getAttribute("data-slot") === "sheet-close" ||
        el.getAttribute("data-slot") === "dialog-close" ||
        el.getAttribute("aria-label")?.toLowerCase() === "close" ||
        el.closest('[data-slot="sheet-close"], [data-slot="dialog-close"]') ||
        el.querySelector("span.sr-only")?.textContent?.trim().toLowerCase() ===
          "close" ||
        el.textContent?.trim().toLowerCase() === "close"
      ) {
        return false;
      }

      // Exclude header controls (dismiss buttons, sheet/dialog headers)
      if (
        el.closest(
          '[data-slot="sheet-header"], [data-slot="dialog-header"], header, [data-slot="sheet-header-container"]',
        )
      ) {
        return false;
      }

      if (el.classList.contains("sr-only")) return false;

      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      return (
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el.getClientRects().length > 0
      );
    },
  );
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
  mobileMinHeightClass,
}: ResponsiveEditorProps) {
  const isDesktop = useIsDesktop();
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const animationHandledRef = React.useRef(false);

  // Focus first editable input
  const focusFirstInput = React.useCallback(() => {
    if (!bodyRef.current) return;
    const firstInput = bodyRef.current.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])',
    );
    if (firstInput && document.activeElement !== firstInput) {
      firstInput.focus();
    }
  }, []);

  // Desktop or reduced motion: focus immediately on open
  const handleOpenAutoFocus = React.useCallback(
    (event: Event) => {
      event.preventDefault();
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (isDesktop || prefersReducedMotion) {
        focusFirstInput();
      }
    },
    [isDesktop, focusFirstInput],
  );

  // Mobile: focus only after bottom sheet slide-in animation finishes
  const handleAnimationEnd = React.useCallback(
    (event: React.AnimationEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && open) {
        animationHandledRef.current = true;
        focusFirstInput();
      }
    },
    [open, focusFirstInput],
  );

  // Mobile safety fallback: in case animationend does not fire (e.g. headless, test env)
  React.useEffect(() => {
    if (!open) {
      animationHandledRef.current = false;
      return;
    }

    if (isDesktop) return;

    // Transition duration is 200ms; wait 250ms to ensure slide-in completed before fallback focus
    const timer = setTimeout(() => {
      if (!animationHandledRef.current) {
        focusFirstInput();
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [open, isDesktop, focusFirstInput]);

  // Navigate to next interactive control on Enter in inputs instead of saving
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "Enter") return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const isInput = target.tagName === "INPUT";
    const isRadio = target.getAttribute("role") === "radio";

    if (!isInput && !isRadio) return;

    if (isInput) {
      const input = target as HTMLInputElement;
      if (input.type === "submit" || input.type === "button") return;
    }

    const container =
      bodyRef.current?.closest(
        '[data-slot="dialog-content"], [data-slot="sheet-content"]',
      ) || bodyRef.current;
    if (!container) return;

    const focusable = getFocusableElements(container as HTMLElement);
    const currentIndex = focusable.indexOf(target);

    if (isInput) {
      event.preventDefault();

      if (event.shiftKey) {
        if (currentIndex > 0) {
          focusable[currentIndex - 1].focus();
        }
        return;
      }

      if (currentIndex !== -1 && currentIndex + 1 < focusable.length) {
        let nextElement = focusable[currentIndex + 1];

        // If next element is inside a radiogroup (e.g. Color picker), focus the active checked radio if any
        const radioGroup = nextElement.closest('[role="radiogroup"]');
        if (radioGroup) {
          const checkedRadio = radioGroup.querySelector<HTMLElement>(
            'button[role="radio"][aria-checked="true"], [role="radio"][aria-checked="true"]',
          );
          if (checkedRadio) {
            nextElement = checkedRadio;
          }
        }

        // If next element is inside footer, prefer focusing the primary/submit action button
        const footerEl = nextElement.closest('[data-slot="action-footer"]');
        if (footerEl) {
          const primaryBtn = footerEl.querySelector<HTMLElement>(
            'button[type="submit"], button:not([variant="outline"]):not([data-variant="outline"])',
          );
          if (primaryBtn) {
            nextElement = primaryBtn;
          }
        }

        nextElement.focus();
      }
    } else if (isRadio) {
      const radioGroup = target.closest('[role="radiogroup"]');
      if (radioGroup) {
        event.preventDefault();

        if (event.shiftKey) {
          // Move to previous focusable control outside this radiogroup
          const prevOutside = [...focusable]
            .reverse()
            .find(
              (_, idx) =>
                focusable.length - 1 - idx < currentIndex &&
                !radioGroup.contains(focusable[focusable.length - 1 - idx]),
            );
          if (prevOutside) {
            prevOutside.focus();
          }
          return;
        }

        (target as HTMLElement).click();

        // Advance to next focusable control outside this radiogroup (e.g. Icon picker button)
        const nextOutside = focusable.find(
          (el, idx) => idx > currentIndex && !radioGroup.contains(el),
        );
        if (nextOutside) {
          nextOutside.focus();
        }
      }
    }
  }, []);

  // Defer rendering until viewport check completes to prevent hydration layout flicker
  if (isDesktop === null) {
    return null;
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onOpenAutoFocus={handleOpenAutoFocus}
          onKeyDown={handleKeyDown}
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

          <div
            ref={bodyRef}
            data-slot="responsive-editor-body"
            className="max-h-[70dvh] overflow-y-auto px-6 py-2"
          >
            {children}
          </div>

          <ActionFooter className="border-border/70 bg-muted/30 border-t px-6 py-4">
            {footer}
          </ActionFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        onOpenAutoFocus={handleOpenAutoFocus}
        onAnimationEnd={handleAnimationEnd}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-none",
          mobileMinHeightClass,
        )}
      >
        {/* Mobile visual drag handle */}
        <div
          className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
          aria-hidden="true"
        />

        <div
          data-slot="sheet-header-container"
          className="border-border/70 flex shrink-0 items-start justify-between border-b px-5 pt-3 pb-3"
        >
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
            data-slot="sheet-close"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus:ring-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors focus:ring-2 focus:outline-none"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Independently scrollable body */}
        <div
          ref={bodyRef}
          data-slot="responsive-editor-body"
          className="flex-1 overflow-y-auto px-5 pt-4 pb-8"
        >
          {children}
        </div>

        {/* Visible sticky action footer respecting safe-area */}
        <ActionFooter className="border-border/70 bg-muted/30 shrink-0 border-t px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {footer}
        </ActionFooter>
      </SheetContent>
    </Sheet>
  );
}
