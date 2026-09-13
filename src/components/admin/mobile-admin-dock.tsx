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
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold transition-all duration-150",
              active
                ? "bg-card text-primary ring-border/80 shadow-sm ring-1"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4",
                active && "fill-primary/10 stroke-[2.25]",
              )}
              aria-hidden="true"
            />
            <span>{item.mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
