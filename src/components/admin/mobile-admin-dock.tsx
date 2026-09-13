"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  ADMIN_NAVIGATION_ITEMS,
  isAdminNavigationItemActive,
} from "@/components/admin/admin-navigation";

export function MobileAdminDock() {
  const pathname = usePathname();

  return (
    <nav className="mobile-admin-dock" aria-label="Primary navigation">
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
            className={cn(
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-3 text-[11px] font-semibold transition-all duration-150",
              active
                ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_color-mix(in_oklch,var(--primary)_90%,transparent)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{item.mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
