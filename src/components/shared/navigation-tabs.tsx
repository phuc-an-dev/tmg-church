"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "cn";

export interface NavigationTabsProps extends React.ComponentProps<"nav"> {
  "aria-label": string;
}

/**
 * Accessible, mobile-first segmented tab bar.
 * Ensures mobile touch targets meet >= 44px (min-h-11) and stretches full-width on mobile.
 */
export function NavigationTabs({
  className,
  children,
  "aria-label": ariaLabel,
  ...props
}: NavigationTabsProps) {
  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "bg-muted/60 border-border/50 inline-flex w-full items-center gap-1 rounded-xl border p-1 sm:w-auto",
        className,
      )}
      {...props}
    >
      {children}
    </nav>
  );
}

export interface NavigationTabLinkProps extends React.ComponentProps<
  typeof Link
> {
  active: boolean;
  icon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  badge?: React.ReactNode;
}

export function NavigationTabLink({
  active,
  icon: Icon,
  badge,
  className,
  children,
  ...props
}: NavigationTabLinkProps) {
  return (
    <Link
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all select-none sm:min-h-10 sm:flex-initial",
        active
          ? "bg-card text-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
            active
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export interface NavigationTabButtonProps extends React.ComponentProps<"button"> {
  active: boolean;
  icon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  badge?: React.ReactNode;
}

export function NavigationTabButton({
  active,
  icon: Icon,
  badge,
  className,
  children,
  type = "button",
  ...props
}: NavigationTabButtonProps) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all select-none sm:min-h-10 sm:flex-initial",
        active
          ? "bg-card text-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
            active
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
