"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup as RadixRadioGroup } from "radix-ui";
import { cn } from "cn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  ADMIN_NAVIGATION_ITEMS,
  isAdminNavigationItemActive,
} from "@/components/admin/admin-navigation";

interface MobileAdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeChurch: { name: string; slug: string } | null;
  userEmail: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const emptySubscribe = () => () => {};

export function MobileAdminSidebar({
  open,
  onOpenChange,
  activeChurch,
  userEmail,
  triggerRef,
}: MobileAdminSidebarProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const firstNavRef = React.useRef<HTMLAnchorElement>(null);
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Close sidebar automatically on navigation
  React.useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  // Close on crossing the desktop breakpoint
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        onOpenChange(false);
      }
    };
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [onOpenChange]);

  const initial = userEmail.trim().charAt(0).toUpperCase() || "A";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id="mobile-admin-sidebar"
        side="left"
        className="flex w-80 max-w-[85vw] flex-col justify-between p-0"
        aria-label="Mobile navigation"
        onOpenAutoFocus={(event) => {
          // Focus first navigation item or Brand link instead of jumping to theme radios in footer
          event.preventDefault();
          firstNavRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          // Ensure focus returns to the Menu trigger button when closing
          if (triggerRef?.current) {
            event.preventDefault();
            triggerRef.current.focus();
          }
        }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header with Church identity */}
          <SheetHeader className="border-b p-4 pr-14 text-left">
            <SheetTitle asChild>
              <Link
                ref={firstNavRef}
                href="/admin"
                onClick={() => onOpenChange(false)}
                className="focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <BrandLockup
                  name={activeChurch ? activeChurch.name : "TMG Church"}
                  subtitle={
                    activeChurch ? `/${activeChurch.slug}` : "Administration"
                  }
                />
              </Link>
            </SheetTitle>
            <SheetDescription className="sr-only">
              TMG Church mobile administration navigation menu
            </SheetDescription>
          </SheetHeader>

          {/* Navigation Links */}
          <nav className="space-y-1 p-3" aria-label="Mobile navigation routes">
            {ADMIN_NAVIGATION_ITEMS.map((item) => {
              const active = isAdminNavigationItemActive(
                pathname,
                item.href,
                item.exact,
              );
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-ring flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer: User Account & Theme Controls */}
        <div className="bg-muted/20 space-y-4 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* User Account Info */}
          <div className="flex items-center gap-3 px-1">
            <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-xs font-semibold">
                Admin account
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-1.5">
            <p className="text-muted-foreground px-1 text-xs font-medium">
              Appearance
            </p>
            <RadixRadioGroup.Root
              className="border-input bg-muted/50 grid grid-cols-3 gap-1 rounded-xl border p-1"
              aria-label="Appearance theme"
              value={mounted ? theme : undefined}
              onValueChange={setTheme}
            >
              {[
                { key: "light", label: "Light", icon: Sun },
                { key: "dark", label: "Dark", icon: Moon },
                { key: "system", label: "System", icon: Monitor },
              ].map(({ key, label, icon: ThemeIcon }) => {
                const isSelected = mounted && theme === key;
                return (
                  <RadixRadioGroup.Item
                    key={key}
                    value={key}
                    className={cn(
                      "focus-visible:ring-ring flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
                      isSelected
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ThemeIcon className="size-4" aria-hidden="true" />
                    <span>{label}</span>
                  </RadixRadioGroup.Item>
                );
              })}
            </RadixRadioGroup.Root>
          </div>

          {/* Sign Out Action */}
          <div className="pt-1">
            <SignOutButton className="hover:bg-destructive/10 hover:text-destructive min-h-11 w-full justify-start gap-3 rounded-xl border px-3 text-sm font-medium" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
