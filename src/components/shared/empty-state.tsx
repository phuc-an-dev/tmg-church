import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "card" | "plain";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "card",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "card"
          ? "border-border/70 bg-card rounded-2xl border px-4 py-12 shadow-xs"
          : "px-4 py-8",
        className,
      )}
    >
      {Icon && (
        <span className="bg-muted text-muted-foreground mb-3.5 flex size-12 items-center justify-center rounded-2xl">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <p className="text-foreground text-base font-semibold">{title}</p>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
