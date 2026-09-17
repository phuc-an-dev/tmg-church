import * as React from "react";
import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationCardProps {
  page: number;
  pageSize?: number;
  count: number;
  onPageChange: (page: number) => void;
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
  onPageChange,
  itemLabel = "items",
  variant = "card",
  className,
}: PaginationCardProps) {
  // Only display pagination when there are 20 or more items in total
  if (count < 20) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = count === 0 ? 0 : Math.min(page, totalPages);
  const rangeStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, count);
  const visiblePages =
    totalPages <= 4
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : currentPage <= 2
        ? [1, 2, 3, totalPages]
        : currentPage >= totalPages - 1
          ? [1, totalPages - 2, totalPages - 1, totalPages]
          : [1, currentPage - 1, currentPage, totalPages];

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
        "border-border/70 bg-card space-y-3 rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)]",
        className,
      )}
    >
      <p className="text-muted-foreground text-sm">
        Showing{" "}
        <strong className="text-foreground font-medium">
          {rangeStart}–{rangeEnd}
        </strong>{" "}
        of <strong className="text-foreground font-medium">{count}</strong>{" "}
        {itemLabel}
      </p>
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        <Button
          variant="outline"
          className="border-border bg-card hover:bg-accent hover:text-accent-foreground min-h-11 shrink-0 rounded-xl border px-2.5 shadow-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>
        <div
          className="flex min-w-0 items-center justify-center gap-1"
          aria-label="Pagination"
        >
          {visiblePages.map((pageNumber, index) => {
            const active = pageNumber === currentPage;
            const previousPage = visiblePages[index - 1];
            return (
              <React.Fragment key={pageNumber}>
                {previousPage && pageNumber > previousPage + 1 && (
                  <span
                    className="text-muted-foreground flex min-h-11 w-3 items-center justify-center text-sm"
                    aria-hidden="true"
                  >
                    …
                  </span>
                )}
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  aria-label={`Page ${pageNumber}`}
                  onClick={() => onPageChange(pageNumber)}
                  className={cn(
                    "border-border min-h-11 min-w-11 rounded-xl border px-2 text-sm font-semibold shadow-xs transition-colors",
                    active
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {pageNumber}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <Button
          variant="outline"
          className="border-border bg-card hover:bg-accent hover:text-accent-foreground min-h-11 shrink-0 rounded-xl border px-2.5 shadow-xs"
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
