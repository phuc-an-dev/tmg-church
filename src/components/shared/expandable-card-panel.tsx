import * as React from "react";
import { cn } from "cn";

export function ExpandableCardPanel({
  open,
  id,
  label,
  className,
  contentClassName,
  children,
}: {
  open: boolean;
  id?: string;
  label: string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      data-open={open}
      className={cn(
        "grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-in-out data-[open=true]:grid-rows-[1fr] motion-reduce:transition-none",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={contentClassName ?? "border-border/70 mt-3 border-t pt-3"}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
