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
  const navRef = React.useRef<HTMLElement>(null);
  const [indicator, setIndicator] = React.useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateIndicator = () => {
      const activeTab = nav.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
      if (activeTab) {
        if (nav.scrollWidth > nav.clientWidth) {
          nav.scrollTo({
            left:
              activeTab.offsetLeft -
              (nav.clientWidth - activeTab.clientWidth) / 2,
          });
        }
        setIndicator({
          left: activeTab.offsetLeft,
          top: activeTab.offsetTop,
          width: activeTab.offsetWidth,
          height: activeTab.offsetHeight,
        });
      }
    };

    updateIndicator();

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [children]);

  return (
    <nav
      ref={navRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "bg-muted/60 border-border/50 relative inline-flex w-full items-center gap-1 rounded-xl border p-1 sm:w-auto",
        className,
      )}
      {...props}
    >
      {indicator && (
        <span
          className="bg-card pointer-events-none absolute rounded-lg shadow-xs transition-all duration-200 ease-out"
          style={{
            transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
            width: indicator.width,
            height: indicator.height,
            left: 0,
            top: 0,
          }}
          aria-hidden="true"
        />
      )}
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
        "relative z-10 inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors select-none sm:min-h-10 sm:flex-initial",
        active
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold transition-colors",
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
        "relative z-10 inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors select-none sm:min-h-10 sm:flex-initial",
        active
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold transition-colors",
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
