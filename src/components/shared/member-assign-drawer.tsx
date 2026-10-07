"use client";

import * as React from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PaginationCard } from "@/components/shared/pagination-card";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";

export interface AssignableMember {
  id: string;
  name: string;
  gender?: string | null;
  subtitle?: string | null;
}

export interface MemberAssignDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  searchPlaceholder?: string;
  members: readonly AssignableMember[];
  onAssign: (selectedIds: string[]) => void | Promise<void>;
  pending?: boolean;
  error?: string | null;
  assignLabel?: string;
  emptySearchMessage?: string;
  emptyListMessage?: string;
  pageSize?: number;
  singleSelect?: boolean;
  selectedIds?: readonly string[];
  onSelectedIdsChange?: (selectedIds: string[]) => void;
  isSubmitDisabled?: boolean;
  embedded?: boolean;
}

export function MemberAssignDrawer({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder = "Search unassigned members...",
  members,
  onAssign,
  pending = false,
  error = null,
  assignLabel = "Assign",
  emptySearchMessage = "No unassigned members match your search.",
  emptyListMessage = "No members available to assign.",
  pageSize = 20,
  singleSelect = false,
  selectedIds,
  onSelectedIdsChange,
  isSubmitDisabled,
  embedded = false,
}: MemberAssignDrawerProps) {
  const [uncontrolledSelectedIds, setUncontrolledSelectedIds] = React.useState<
    string[]
  >([]);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const listRef = React.useRef<HTMLDivElement>(null);
  const activeSelectedIds = selectedIds ?? uncontrolledSelectedIds;

  function setActiveSelectedIds(next: string[]) {
    if (selectedIds) {
      onSelectedIdsChange?.(next);
      return;
    }
    setUncontrolledSelectedIds(next);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setUncontrolledSelectedIds([]);
      setSearch("");
      setPage(1);
    }
    onOpenChange(nextOpen);
  }

  const filteredMembers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.subtitle && m.subtitle.toLowerCase().includes(q)),
    );
  }, [members, search]);

  const totalCount = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedMembers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  const handleSelectAll = () => {
    const next = new Set(activeSelectedIds);
    for (const member of filteredMembers) {
      next.add(member.id);
    }
    setActiveSelectedIds(Array.from(next));
  };

  const handleClear = () => {
    setActiveSelectedIds([]);
  };

  const handleToggle = (id: string) => {
    setActiveSelectedIds(
      activeSelectedIds.includes(id)
        ? activeSelectedIds.filter((i) => i !== id)
        : singleSelect
          ? [id]
          : [...activeSelectedIds, id],
    );
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      pending ||
      isSubmitDisabled === true ||
      (isSubmitDisabled === undefined && activeSelectedIds.length === 0)
    ) {
      return;
    }
    void onAssign([...activeSelectedIds]);
  };

  const content = (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="min-h-11 pr-12 pl-9 text-base md:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
            aria-label={searchPlaceholder}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Control bar: count and actions */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">
            {filteredMembers.length}{" "}
            {filteredMembers.length === 1 ? "member" : "members"} available
          </span>
          <div className="flex items-center gap-2">
            {!singleSelect && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredMembers.length === 0}
                className="min-h-11 px-2 text-xs font-semibold"
              >
                Select all
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={activeSelectedIds.length === 0}
              className="min-h-11 px-2 text-xs font-semibold"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Member cards */}
        <div
          ref={listRef}
          className="max-h-[50dvh] space-y-2 overflow-y-auto py-1 pr-1 sm:max-h-[440px]"
        >
          {filteredMembers.length === 0 ? (
            <div className="border-border/60 bg-muted/20 rounded-xl border p-6 text-center">
              <p className="text-muted-foreground text-sm">
                {members.length === 0 ? emptyListMessage : emptySearchMessage}
              </p>
            </div>
          ) : (
            paginatedMembers.map((m) => {
              const isSelected = activeSelectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleToggle(m.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "hover:bg-muted/60 flex min-h-14 w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 ring-primary/20 font-semibold ring-1"
                      : "border-border/70 bg-card",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <MemberAvatar gender={m.gender} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-sm font-semibold sm:text-base">
                        {m.name}
                      </span>
                      {m.subtitle && (
                        <span className="text-muted-foreground block truncate text-xs font-normal">
                          {m.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Circular indicator */}
                  <div
                    className={cn(
                      "ml-3 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-transparent",
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="size-3.5 stroke-3" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </form>
      {embedded && totalCount >= 20 && (
        <PaginationCard
          page={currentPage}
          pageSize={pageSize}
          count={totalCount}
          itemLabel="members"
          onPageChange={handlePageChange}
        />
      )}
    </>
  );
  if (embedded) return content;

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      mobileMinHeightClass="min-h-[85dvh]"
      bodyClassName="pb-3 sm:pb-3"
      bottomBar={
        totalCount >= 20 ? (
          <PaginationCard
            page={currentPage}
            pageSize={pageSize}
            count={totalCount}
            itemLabel="members"
            onPageChange={handlePageChange}
            className="border-t-0 pt-0"
          />
        ) : null
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={
              pending ||
              isSubmitDisabled === true ||
              (isSubmitDisabled === undefined && activeSelectedIds.length === 0)
            }
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>{assignLabel}...</span>
              </>
            ) : (
              <span>
                {activeSelectedIds.length > 0 && !singleSelect
                  ? `${assignLabel} (${activeSelectedIds.length})`
                  : assignLabel}
              </span>
            )}
          </Button>
        </>
      }
    >
      {content}
    </ResponsiveEditor>
  );
}
