"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Building2,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup } from "radix-ui";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DynamicLucideIcon } from "@/features/ministry/components/dynamic-lucide-icon";

type Workspace = {
  id: string;
  kind: string;
  name: string;
  href: string;
  accentColor?: string;
  iconKey?: string;
};
const emptySubscribe = () => () => {};

export function PortalSidebar({
  email,
  workspaces,
  todoCount,
  memberMode = false,
}: {
  memberMode?: boolean;
  email: string;
  workspaces: Workspace[];
  todoCount: number;
}) {
  const [open, setOpen] = useState(false);
  const firstNavRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const section = searchParams.get("section") ?? "upcoming";
  const department = workspaces.find(
    (workspace) => workspace.kind === "Department",
  );
  const role = memberMode
    ? "Member"
    : workspaces.some((workspace) => workspace.kind === "Administration")
      ? "Admin"
      : department
        ? "Department leader"
        : "Portal account";
  const navigationClass = (active: boolean) =>
    cn(
      "focus-visible:ring-ring flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
      active
        ? "bg-primary text-primary-foreground shadow-xs"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="border-border/80 bg-card hover:bg-muted relative size-11 overflow-visible rounded-xl border p-1 shadow-sm"
          aria-label={
            todoCount > 0
              ? `Open portal sidebar, ${todoCount} ${memberMode ? "upcoming assigned sessions" : "tasks to do"}`
              : "Open portal sidebar"
          }
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
            {email.trim().charAt(0).toUpperCase() || "P"}
          </span>
          {todoCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-destructive border-card absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] leading-none font-semibold text-white"
            >
              {todoCount > 99 ? "99+" : todoCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-80 max-w-[85vw] flex-col justify-between gap-0 p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstNavRef.current?.focus();
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SheetHeader className="border-b p-4 pr-14 text-left">
            <SheetTitle asChild>
              <Link
                href="/portal"
                onClick={() => setOpen(false)}
                className="focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <BrandLockup name="TMG Church" subtitle="Portal" />
              </Link>
            </SheetTitle>
            <SheetDescription className="sr-only">
              TMG Church portal navigation menu
            </SheetDescription>
          </SheetHeader>
          <nav className="space-y-1 p-3" aria-label="Portal navigation">
            {[
              { key: "upcoming", label: "Upcoming", icon: CalendarDays },
              {
                key: memberMode ? "assignments" : "readiness",
                label: memberMode ? "My assignments" : "To do",
                icon: CheckCircle2,
              },
              { key: "workspaces", label: "Workspaces", icon: Building2 },
            ].map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                ref={key === "upcoming" ? firstNavRef : undefined}
                href={`/portal?section=${key}`}
                onClick={() => setOpen(false)}
                className={navigationClass(
                  pathname === "/portal" && section === key,
                )}
                aria-current={
                  pathname === "/portal" && section === key ? "page" : undefined
                }
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {(key === "readiness" || key === "assignments") &&
                  todoCount > 0 && (
                    <span
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-xs",
                        pathname === "/portal" && section === key
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {todoCount}
                    </span>
                  )}
              </Link>
            ))}
            {workspaces.length > 0 && (
              <p className="text-muted-foreground px-3 pt-5 pb-2 text-xs font-medium">
                Your workspaces
              </p>
            )}
            {workspaces.map((workspace) => {
              const basePath = workspace.href.split("?")[0];
              const active =
                !memberMode &&
                (pathname === basePath ||
                  (workspace.kind !== "Ministry" &&
                    pathname.startsWith(`${basePath}/`)) ||
                  (workspace.kind === "Ministry" &&
                    pathname.startsWith(`${basePath}/sessions/`)));
              const departmentWorkspace = workspaces.find(
                (item) =>
                  item.kind === "Department" &&
                  item.href.startsWith(`${basePath}/departments/`),
              );
              const href =
                !memberMode &&
                workspace.kind === "Ministry" &&
                departmentWorkspace
                  ? `${basePath}?fromDepartment=${departmentWorkspace.href.split("/departments/")[1].split("?")[0]}`
                  : workspace.href;
              return (
                <Link
                  key={workspace.id}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={navigationClass(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      active &&
                        "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground",
                    )}
                    style={
                      active
                        ? undefined
                        : {
                            color: workspace.accentColor,
                            backgroundColor: workspace.accentColor
                              ? `${workspace.accentColor}14`
                              : undefined,
                            borderColor: workspace.accentColor
                              ? `${workspace.accentColor}40`
                              : undefined,
                          }
                    }
                  >
                    <DynamicLucideIcon
                      iconKey={
                        workspace.iconKey ??
                        (workspace.kind === "Group"
                          ? "users-round"
                          : "layers-3")
                      }
                      className="size-5"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {!memberMode && workspace.kind === "Ministry"
                        ? "Ministry sessions"
                        : workspace.name}
                    </span>
                    {!memberMode && workspace.kind === "Ministry" && (
                      <span
                        className={cn(
                          "block truncate text-xs",
                          active
                            ? "text-primary-foreground/90"
                            : "text-muted-foreground",
                        )}
                      >
                        {workspace.name}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="bg-muted/20 shrink-0 space-y-4 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 px-1">
            <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
              {email.trim().charAt(0).toUpperCase() || "P"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-xs font-semibold">{role}</p>
              <p className="text-muted-foreground truncate text-xs">{email}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground px-1 text-xs font-medium">
              Appearance
            </p>
            <RadioGroup.Root
              aria-label="Appearance theme"
              value={mounted ? theme : undefined}
              onValueChange={setTheme}
              className="border-input bg-muted/50 grid grid-cols-3 gap-1 rounded-xl border p-1"
            >
              {[
                { key: "light", label: "Light", icon: Sun },
                { key: "dark", label: "Dark", icon: Moon },
                { key: "system", label: "System", icon: Monitor },
              ].map(({ key, label, icon: Icon }) => (
                <RadioGroup.Item
                  key={key}
                  value={key}
                  className={cn(
                    "focus-visible:ring-ring flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium focus-visible:ring-2 focus-visible:outline-hidden",
                    mounted && theme === key
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{label}</span>
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          </div>
          <div className="pt-1">
            <SignOutButton className="hover:bg-destructive/10 hover:text-destructive min-h-11 w-full justify-start gap-3 rounded-xl border px-3 text-sm font-medium" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
