import * as React from "react";
import { User } from "lucide-react";
import { cn } from "cn";

export interface MemberAvatarProps {
  gender?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  status?: "active" | "inactive" | string | null;
  statusClassName?: string;
}

const SIZE_STYLES = {
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-xl md:size-9 md:rounded-lg",
  lg: "size-12 rounded-2xl sm:size-14",
} as const;

const ICON_SIZES = {
  sm: "size-4",
  md: "size-5 md:size-4.5",
  lg: "size-6 sm:size-7",
} as const;

const STATUS_DOT_SIZES = {
  sm: "size-2 -bottom-0.5 -right-0.5",
  md: "size-2.5 -bottom-0.5 -right-0.5",
  lg: "size-3.5 bottom-0 right-0",
} as const;

export function MemberAvatar({
  gender,
  size = "md",
  className,
  status,
  statusClassName,
}: MemberAvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center",
          SIZE_STYLES[size],
          gender === "male"
            ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
            : gender === "female"
              ? "bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400"
              : "bg-primary/10 text-primary",
        )}
      >
        <User className={ICON_SIZES[size]} aria-hidden="true" />
      </span>
      {status && (
        <span
          className={cn(
            "ring-background absolute rounded-full ring-2",
            STATUS_DOT_SIZES[size],
            status === "active" ? "bg-emerald-500" : "bg-muted-foreground/40",
            statusClassName,
          )}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
