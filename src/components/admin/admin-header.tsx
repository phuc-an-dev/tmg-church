"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { AdminAccountMenu } from "@/components/admin/admin-account-menu";
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

  return (
    <header className="border-border/80 bg-card sticky top-0 z-40 border-b">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center">
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

        <div className="flex items-center gap-2 sm:gap-3">
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
  );
}
