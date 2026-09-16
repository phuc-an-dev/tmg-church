import * as React from "react";
import { cn } from "cn";

/** Shared content width, spacing, and responsive gutters for admin pages. */
export function AdminPageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
