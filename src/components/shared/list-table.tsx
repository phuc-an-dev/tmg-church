import * as React from "react";
import { cn } from "cn";

export interface ListTableProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

export interface ListTableHeaderProps {
  gridClassName: string;
  className?: string;
  children: React.ReactNode;
}

export interface ListTableBodyProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Card-list table shell for mobile cards / desktop grid rows.
 * Keeps the role="table" a11y markup consistent across admin lists.
 */
export function ListTable({ label, className, children }: ListTableProps) {
  return (
    <div
      role="table"
      aria-label={label}
      className={cn(
        "w-full text-left md:overflow-hidden md:rounded-xl md:border",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Desktop-only header row; hidden on mobile where cards have inline labels. */
export function ListTableHeader({
  gridClassName,
  className,
  children,
}: ListTableHeaderProps) {
  return (
    <div role="rowgroup">
      <div
        role="row"
        className={cn(
          "bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:items-center md:border-b md:px-4 md:py-3",
          gridClassName,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Body rowgroup: stacked cards on mobile, divided rows on desktop. */
export function ListTableBody({ className, children }: ListTableBodyProps) {
  return (
    <div
      role="rowgroup"
      className={cn(
        "md:divide-border/60 space-y-3 md:space-y-0 md:divide-y",
        className,
      )}
    >
      {children}
    </div>
  );
}
