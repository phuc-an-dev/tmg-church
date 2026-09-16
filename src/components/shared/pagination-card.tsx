import * as React from "react";
import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationCardProps {
  page: number;
  pageSize?: number;
  count: number;
  pageSizeOptions?: readonly number[] | number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  variant?: "card" | "bar";
  className?: string;
}

/**
 * Reusable pagination component across TMG Church admin pages.
 * Enforces the application-wide rule: only render when count >= 20 items.
 */
export function PaginationCard({
  page,
  pageSize = 20,
  count,
  pageSizeOptions = [20, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = "items",
  variant = "card",
  className,
}: PaginationCardProps) {
  // Only display pagination when there are 20 or more items in total
  if (count < 20) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const rangeStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, count);

  if (variant === "bar") {
    return (
      <div
        className={cn(
          "flex items-center justify-between border-t pt-4",
          className,
        )}
      >
        <p className="text-muted-foreground text-xs sm:text-sm">
          Showing {rangeStart}–{rangeEnd} of {count}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-11 p-0 sm:h-9 sm:w-auto sm:px-3"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="px-1 text-xs font-medium sm:text-sm">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-11 p-0 sm:h-9 sm:w-auto sm:px-3"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4 sm:ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/70 bg-card overflow-hidden rounded-2xl border shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="text-muted-foreground text-sm">
          Showing{" "}
          <strong className="text-foreground font-medium">
            {rangeStart}–{rangeEnd}
          </strong>{" "}
          of <strong className="text-foreground font-medium">{count}</strong>{" "}
          {itemLabel}
        </span>
        {onPageSizeChange && (
          <div
            role="group"
            className="border-input bg-muted/35 flex shrink-0 items-center rounded-xl border p-1"
            aria-label="Results per page"
          >
            {pageSizeOptions.map((option) => {
              const active = pageSize === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Show ${option} ${itemLabel} per page`}
                  onClick={() => onPageSizeChange(option)}
                  className={
                    active
                      ? "bg-primary text-primary-foreground min-h-11 min-w-11 rounded-lg px-2 text-sm font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors"
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t p-4">
        <Button
          variant="outline"
          className="bg-secondary hover:bg-secondary/80 disabled:bg-muted/40 min-h-12 w-full rounded-xl border-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>
        <span
          className="border-input bg-card flex min-h-12 min-w-20 items-center justify-center rounded-xl border px-3 text-base font-semibold"
          aria-live="polite"
        >
          {count === 0 ? 0 : Math.min(page, totalPages)}
          <span className="text-muted-foreground px-1">/</span>
          {totalPages}
        </span>
        <Button
          variant="outline"
          className="bg-secondary hover:bg-secondary/80 disabled:bg-muted/40 min-h-12 w-full rounded-xl border-0"
          disabled={page >= totalPages || count === 0}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
