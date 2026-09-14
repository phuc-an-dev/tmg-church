"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { AdminAccountMenu } from "@/components/admin/admin-account-menu";
import { MobileAdminSidebar } from "@/components/admin/mobile-admin-sidebar";
import {
  ADMIN_NAVIGATION_ITEMS,
  isAdminNavigationItemActive,
} from "@/components/admin/admin-navigation";

interface AdminHeaderProps {
  activeChurch: { name: string; slug: string } | null;
  userEmail: string;
}

export function AdminHeader({ activeChurch, userEmail }: AdminHeaderProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <header className="border-border/80 bg-card sticky top-0 z-40 border-b">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              ref={triggerRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-admin-sidebar"
              className="size-11 min-h-[44px] min-w-[44px] shrink-0 rounded-xl md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>

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
          </div>

          <div className="hidden items-center gap-2 sm:gap-3 md:flex">
            <AdminAccountMenu email={userEmail} />
          </div>
        </div>
        <div className="border-border/70 hidden border-t md:block">
          <nav
            className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8"
            aria-label="Primary navigation"
          >
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
                  aria-current={active ? "page" : undefined}
                  data-active={active}
                  className="admin-nav-chip"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <MobileAdminSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeChurch={activeChurch}
        userEmail={userEmail}
        triggerRef={triggerRef}
      />
    </>
  );
}
