"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Church, LayoutDashboard, Menu } from "lucide-react";
import { cn } from "cn";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";

interface AdminHeaderProps {
  activeChurch: { name: string; slug: string } | null;
  userEmail: string;
}

const NAVIGATION_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/church",
    label: "Church Settings",
    icon: Church,
    exact: false,
  },
];

export function AdminHeader({ activeChurch, userEmail }: AdminHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isItemActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="border-border bg-card/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand and Church Identity */}
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="text-foreground focus-visible:ring-ring flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:outline-hidden"
          >
            <BrandLockup
              name={activeChurch ? activeChurch.name : "TMG Church"}
              subtitle={
                activeChurch ? `/${activeChurch.slug}` : "Administration"
              }
            />
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main Navigation"
          >
            {NAVIGATION_ITEMS.map((item) => {
              const active = isItemActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="max-w-[180px] truncate">{userEmail}</span>
          </div>

          <ThemeToggle />

          <div className="hidden sm:block">
            <SignOutButton />
          </div>

          {/* Mobile Menu Sheet */}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] rounded-lg"
                  aria-label="Open navigation menu"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                <SheetHeader className="border-border border-b p-4 pr-16 text-left">
                  <div className="flex items-center gap-2.5">
                    <BrandLockup compact />
                    <div>
                      <SheetTitle className="text-base font-semibold">
                        {activeChurch ? activeChurch.name : "TMG Church"}
                      </SheetTitle>
                      <SheetDescription className="text-muted-foreground text-xs">
                        Internal Administration
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <nav
                  className="flex-1 space-y-1 p-3"
                  aria-label="Mobile Navigation"
                >
                  {NAVIGATION_ITEMS.map((item) => {
                    const active = isItemActive(item.href, item.exact);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
                          active
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-border bg-muted/20 border-t p-4">
                  <div className="mb-3 space-y-1">
                    <span className="text-muted-foreground text-xs">
                      Signed in as:
                    </span>
                    <p className="text-foreground text-xs font-medium break-all">
                      {userEmail}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <ThemeToggle />
                    <SignOutButton />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
