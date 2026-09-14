import * as React from "react";
import { cn } from "cn";

/**
 * The only footer primitive for paired sheet/dialog actions.
 *
 * Every direct Button is forced to the same 44px action height, regardless of
 * its visual variant. This keeps secondary and destructive actions aligned.
 */
export function ActionFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-footer"
      className={cn(
        "grid grid-cols-2 gap-3 [&>[data-slot=button]]:!h-11 [&>[data-slot=button]]:!min-h-11 [&>[data-slot=button]]:w-full",
        className,
      )}
      {...props}
    />
  );
}
