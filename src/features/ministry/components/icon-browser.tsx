"use client";

import * as React from "react";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_ICON_RESULTS = 30;
const SEARCH_DEBOUNCE_MS = 300;

function labelForIcon(iconKey: string) {
  return iconKey
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function IconBrowser({
  open,
  entityLabel,
  selectedIconKey,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  entityLabel: string;
  selectedIconKey: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (iconKey: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [normalizedQuery]);

  const isSearching =
    normalizedQuery.length >= 2 && normalizedQuery !== debouncedQuery;
  const matches = React.useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return iconNames
      .filter((iconKey) => iconKey.includes(debouncedQuery))
      .slice(0, MAX_ICON_RESULTS);
  }, [debouncedQuery]);

  function clearQuery() {
    setQuery("");
    setDebouncedQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-visible p-0 sm:max-w-xl">
        <DialogHeader className="space-y-2 px-5 pt-5 pr-12">
          <DialogTitle>Browse Lucide icons</DialogTitle>
          <DialogDescription>
            Search the full Lucide catalog. Only matching icons are loaded.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto px-5 pt-1 pb-5">
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (!nextQuery) setDebouncedQuery("");
              }}
              placeholder="Search by icon name"
              aria-label={`Search all ${entityLabel.toLowerCase()} icons`}
              className="h-12 pr-11 pl-9 text-base"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 size-11 -translate-y-1/2"
                aria-label="Clear icon search"
                title="Clear search"
                onClick={clearQuery}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          {isSearching ? (
            <div
              className="grid grid-cols-4 gap-2 sm:grid-cols-5"
              aria-busy="true"
              aria-label="Loading icon search results"
            >
              {Array.from({ length: 10 }, (_, index) => (
                <Skeleton key={index} className="min-h-18 rounded-lg" />
              ))}
            </div>
          ) : normalizedQuery.length < 2 ? (
            <p className="text-muted-foreground text-sm">
              Enter at least two characters to search the full catalog.
            </p>
          ) : matches.length ? (
            <div
              className="grid grid-cols-4 gap-2 sm:grid-cols-5"
              aria-label="Lucide icon search results"
            >
              {matches.map((iconKey) => {
                const selected = iconKey === selectedIconKey;
                const label = labelForIcon(iconKey);
                return (
                  <Button
                    key={iconKey}
                    type="button"
                    variant="outline"
                    className="h-auto min-h-18 flex-col gap-1.5 px-2 py-2 text-xs"
                    aria-pressed={selected}
                    aria-label={label}
                    title={label}
                    onClick={() => {
                      onSelect(iconKey);
                      onOpenChange(false);
                    }}
                  >
                    <DynamicIcon
                      name={iconKey}
                      className="size-5"
                      aria-hidden="true"
                    />
                    <span className="w-full truncate">{label}</span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No icons match this search.
            </p>
          )}
          {matches.length === MAX_ICON_RESULTS && (
            <p className="text-muted-foreground text-sm">
              Showing the first {MAX_ICON_RESULTS} matches. Refine your search
              to narrow the list.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
