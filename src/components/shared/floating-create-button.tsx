import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

type FloatingCreateButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "type"
> & {
  children: React.ReactNode;
  icon?: React.ReactNode;
};

/** Shared primary create action for mobile-first admin collections. */
export function FloatingCreateButton({
  children,
  icon,
  className,
  ...props
}: FloatingCreateButtonProps) {
  return (
    <Button
      type="button"
      className={cn(
        "fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 min-h-12 rounded-full px-5 shadow-[0_18px_36px_-14px_color-mix(in_oklch,var(--primary)_70%,transparent)] md:right-8 md:bottom-8",
        className,
      )}
      {...props}
    >
      {icon ?? <Plus aria-hidden="true" className="size-5" />}
      {children}
    </Button>
  );
}
