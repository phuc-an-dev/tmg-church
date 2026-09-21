"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Ellipsis,
  Layers3,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const seedSteps = [
  {
    id: "church-settings",
    title: "1. Church settings",
    actionLabel: "Church settings",
    href: "/admin/church",
    icon: Building2,
  },
  {
    id: "ministries-and-terms",
    title: "2. Ministries and terms",
    actionLabel: "Ministries and terms",
    href: "/admin/ministries",
    icon: Layers3,
  },
  {
    id: "members",
    title: "3. Members",
    actionLabel: "Members",
    href: "/admin/members",
    icon: Users,
  },
  {
    id: "groups-and-departments",
    title: "4. Groups and departments",
    actionLabel: "Groups and departments",
    href: "/admin/ministries",
    icon: UsersRound,
  },
  {
    id: "leadership-roles",
    title: "5. Leadership roles",
    actionLabel: "Leadership roles",
    href: "/admin/ministries",
    icon: ShieldCheck,
  },
  {
    id: "sessions-and-assignments",
    title: "6. Sessions and assignments",
    actionLabel: "Sessions and assignments",
    href: "/admin/sessions",
    icon: CalendarDays,
  },
] as const;

export function AdminSeedStepCards() {
  const [openStepId, setOpenStepId] = React.useState<string | null>(null);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {seedSteps.map(({ id, title, actionLabel, href, icon: Icon }) => {
        const isOpen = openStepId === id;

        return (
          <article
            key={id}
            className="bg-card rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="border-primary/20 bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl border">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold">{title}</h2>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  isOpen
                    ? `Hide actions for ${actionLabel}`
                    : `Show actions for ${actionLabel}`
                }
                aria-expanded={isOpen}
                aria-controls={`seed-step-actions-${id}`}
                onClick={() =>
                  setOpenStepId((current) => (current === id ? null : id))
                }
                className={cn(
                  "size-11 min-h-11 min-w-11 shrink-0 rounded-xl",
                  isOpen && "bg-muted text-foreground",
                )}
                data-interactive="true"
              >
                <Ellipsis className="size-5" aria-hidden="true" />
              </Button>
            </div>

            {isOpen && (
              <div
                id={`seed-step-actions-${id}`}
                role="region"
                aria-label={`Actions for ${actionLabel}`}
                className="border-border/70 animate-in fade-in-0 mt-3 border-t pt-3 duration-150 motion-reduce:animate-none"
              >
                <Button
                  asChild
                  variant="outline"
                  className="border-border/80 bg-background hover:bg-muted/80 text-foreground min-h-11 w-full gap-2 text-sm font-semibold shadow-xs"
                  data-interactive="true"
                >
                  <Link href={href}>
                    <span>Open {actionLabel}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
