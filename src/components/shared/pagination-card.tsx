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
  className,
}: PaginationCardProps) {
  // Only display pagination when there are 20 or more items in total
  if (count < 20) {
    return null;
  }

  const totalPages = Math.ceil(count / pageSize);
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, count);

  return (
    <div
      className={cn(
        "border-border/70 flex items-center justify-between border-t pt-4",
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
          className="bg-card hover:bg-muted/40 size-11 min-h-11 min-w-11 rounded-xl p-0 shadow-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span className="px-1 text-xs font-medium sm:text-sm">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-card hover:bg-muted/40 size-11 min-h-11 min-w-11 rounded-xl p-0 shadow-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
