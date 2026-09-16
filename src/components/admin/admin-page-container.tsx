import * as React from "react";
import { cn } from "cn";

/** Shared content width, spacing, and responsive gutters for admin pages. */
export function AdminPageContainer({
  className,
  size = "wide",
  ...props
}: React.ComponentProps<"div"> & { size?: "narrow" | "wide" }) {
  return (
    <div
      className={cn(
        "mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8",
        size === "narrow" ? "max-w-4xl" : "max-w-7xl",
        className,
      )}
      {...props}
    />
  );
}
