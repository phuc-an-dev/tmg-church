"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { iconNames } from "lucide-react/dynamic";
import {
  Check,
  Copy,
  GripVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { StatusToast } from "@/components/ui/status-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DynamicLucideIcon } from "@/features/ministry/components/dynamic-lucide-icon";
import {
  addFrequentIconAction,
  reorderFrequentIconsAction,
  removeFrequentIconAction,
} from "../actions";
import type { FrequentIconItem } from "../types";

const MAX_SEARCH_RESULTS = 60;

function formatIconLabel(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface IconManagementProps {
  frequentIcons: FrequentIconItem[];
}

interface SortableIconCardProps {
  icon: FrequentIconItem;
  isSelected: boolean;
  pending: boolean;
  onSelect: (icon: FrequentIconItem) => void;
  onRemove: (icon: FrequentIconItem) => void;
}

function SortableIconCard({
  icon,
  isSelected,
  pending,
  onSelect,
  onRemove,
}: SortableIconCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: icon.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : undefined,
      }}
      className={`group relative flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow,opacity] ${
        isSelected
          ? "border-primary bg-primary/5 ring-primary/20 shadow-xs ring-2"
          : "border-border/80 bg-card hover:border-border hover:bg-muted/20"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(icon)}
        className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2"
        aria-label={`View details for ${formatIconLabel(icon.name)}`}
      >
        <div className="bg-muted text-foreground group-hover:bg-background flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors">
          <DynamicLucideIcon iconKey={icon.name} className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-bold">
            {formatIconLabel(icon.name)}
          </p>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {icon.name}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          className="text-muted-foreground hover:text-foreground size-11 min-h-[44px] min-w-[44px] cursor-grab touch-none rounded-lg active:cursor-grabbing"
          aria-label={`Drag ${icon.name} to reorder`}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          onClick={() => onRemove(icon)}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-11 min-h-[44px] min-w-[44px] rounded-lg"
          aria-label={`Remove ${icon.name} from frequent list`}
          title="Remove icon"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function IconManagement({ frequentIcons }: IconManagementProps) {
  const router = useRouter();
  const [orderedIcons, setOrderedIcons] = React.useOptimistic(frequentIcons);
  const [activeIconId, setActiveIconId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Selected icon state
  const [selectedIconId, setSelectedIconId] = React.useState<string | null>(
    null,
  );

  const effectiveSelectedId =
    (selectedIconId && orderedIcons.some((i) => i.id === selectedIconId)
      ? selectedIconId
      : orderedIcons[0]?.id) ?? null;

  const selectedIcon = React.useMemo(() => {
    return orderedIcons.find((i) => i.id === effectiveSelectedId) ?? null;
  }, [orderedIcons, effectiveSelectedId]);

  const frequentNamesSet = React.useMemo(() => {
    return new Set(orderedIcons.map((i) => i.name));
  }, [orderedIcons]);

  // Drawers and Toast state
  const [addDrawerOpen, setAddDrawerOpen] = React.useState(false);
  const [deleteConfirmIcon, setDeleteConfirmIcon] =
    React.useState<FrequentIconItem | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);

  // Search state inside Add Icon drawer (no icons loaded by default)
  const [queryInput, setQueryInput] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");
  const [hasSearched, setHasSearched] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const [pending, startTransition] = React.useTransition();

  // Search trigger inside drawer
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = queryInput.trim().toLowerCase();
    if (!clean) {
      setHasSearched(false);
      setSearchResults([]);
      setSubmittedQuery("");
      return;
    }

    setIsSearching(true);
    setSubmittedQuery(clean);
    setHasSearched(true);

    const matches = iconNames
      .filter((name) => name.includes(clean))
      .slice(0, MAX_SEARCH_RESULTS);

    setSearchResults(matches);
    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setQueryInput("");
    setSubmittedQuery("");
    setHasSearched(false);
    setSearchResults([]);
  };

  const handleAdd = (iconName: string) => {
    startTransition(async () => {
      const result = await addFrequentIconAction({ name: iconName });
      if (!result.success) {
        setToastMessage(result.error ?? "Failed to add icon.");
      } else {
        setToastMessage(
          result.message ?? `Icon "${iconName}" added to frequently used list.`,
        );
        router.refresh();
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveIconId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIconId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previousIcons = orderedIcons;
    const oldIndex = previousIcons.findIndex((icon) => icon.id === active.id);
    const newIndex = previousIcons.findIndex((icon) => icon.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextIcons = arrayMove(previousIcons, oldIndex, newIndex);

    startTransition(async () => {
      setOrderedIcons(nextIcons);
      const result = await reorderFrequentIconsAction({
        orderedIds: nextIcons.map((icon) => icon.id),
      });
      if (!result.success) {
        setToastMessage(result.error ?? "Failed to reorder icon.");
      } else {
        setToastMessage(result.message ?? "Icon order updated.");
      }
    });
  };

  const handleDragCancel = () => setActiveIconId(null);

  const handleConfirmRemove = () => {
    if (!deleteConfirmIcon) return;
    const iconToRemove = deleteConfirmIcon;
    startTransition(async () => {
      const result = await removeFrequentIconAction({ id: iconToRemove.id });
      if (!result.success) {
        setToastMessage(result.error ?? "Failed to remove icon.");
      } else {
        setToastMessage(
          result.message ?? "Icon removed from frequently used list.",
        );
        if (selectedIconId === iconToRemove.id) {
          const remaining = orderedIcons.filter(
            (i) => i.id !== iconToRemove.id,
          );
          setSelectedIconId(remaining[0]?.id ?? null);
          setMobileDetailOpen(false);
        }
        router.refresh();
      }
      setDeleteConfirmIcon(null);
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1800);
  };

  return (
    <div className="relative space-y-6 pb-20">
      {/* Header bar with counter and desktop Add Icon action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">
            {orderedIcons.length}{" "}
            {orderedIcons.length === 1 ? "frequent icon" : "frequent icons"}
          </span>
          <p className="text-muted-foreground text-xs">
            Shared list across all administrators.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setAddDrawerOpen(true)}
          className="hidden min-h-11 items-center gap-2 rounded-xl px-4 sm:flex"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>Add Icon</span>
        </Button>
      </div>

      {/* Main List of Frequently Used Icons (Rendered as Cards) */}
      <section aria-label="Frequently used icons list" className="space-y-4">
        {orderedIcons.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed p-12 text-center">
            <Sparkles
              className="text-muted-foreground/50 mx-auto size-10"
              aria-hidden="true"
            />
            <h3 className="text-foreground mt-3 text-base font-bold">
              No frequent icons yet
            </h3>
            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
              Use the Add Icon button to search and build your shared list of
              frequently used icons.
            </p>
            <Button
              type="button"
              onClick={() => setAddDrawerOpen(true)}
              className="mt-4 min-h-[44px] gap-2 rounded-xl"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Add Icon</span>
            </Button>
          </div>
        ) : (
          <DndContext
            id="frequent-icons"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={orderedIcons.map((icon) => icon.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {orderedIcons.map((icon) => (
                  <SortableIconCard
                    key={icon.id}
                    icon={icon}
                    isSelected={icon.id === effectiveSelectedId}
                    pending={pending}
                    onSelect={(nextIcon) => {
                      setSelectedIconId(nextIcon.id);
                      setMobileDetailOpen(true);
                    }}
                    onRemove={setDeleteConfirmIcon}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeIconId ? (
                <div className="border-primary bg-card flex scale-[1.02] items-center gap-3 rounded-2xl border p-3.5 shadow-2xl">
                  <div className="bg-muted text-foreground flex size-12 shrink-0 items-center justify-center rounded-xl">
                    <DynamicLucideIcon
                      iconKey={
                        orderedIcons.find((icon) => icon.id === activeIconId)
                          ?.name ?? "circle"
                      }
                      className="size-6"
                    />
                  </div>
                  <p className="text-foreground text-sm font-bold">
                    {formatIconLabel(
                      orderedIcons.find((icon) => icon.id === activeIconId)
                        ?.name ?? "icon",
                    )}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      {/* Floating Action Button: Add Icon */}
      <FloatingCreateButton onClick={() => setAddDrawerOpen(true)}>
        Add Icon
      </FloatingCreateButton>

      {/* Bottom Drawer: Add Icon with Search */}
      <Sheet open={addDrawerOpen} onOpenChange={setAddDrawerOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="bg-card inset-x-0 bottom-0 flex h-[85dvh] max-h-[92dvh] flex-col gap-0 rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-none"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between border-b px-5 pt-3 pb-3">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Add Icon
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Search Lucide icons and add to frequently used list
              </SheetDescription>
            </SheetHeader>
            <button
              type="button"
              onClick={() => setAddDrawerOpen(false)}
              className="text-muted-foreground hover:text-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors focus:outline-none"
              aria-label="Close add icon drawer"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden p-5">
            {/* Search Input & Search Button */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Search keyword (e.g. user, church, book...)"
                  aria-label="Search Lucide icon catalog"
                  className="h-12 pr-10 pl-10 text-base"
                />
                {queryInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearSearch}
                    aria-label="Clear search input"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-11 min-h-[44px] min-w-[44px] -translate-y-1/2"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSearching || !queryInput.trim()}
                className="h-12 min-h-[44px] min-w-[44px] px-5 font-semibold"
              >
                <Search className="size-4" aria-hidden="true" />
                <span>Search</span>
              </Button>
            </form>

            {/* Results / Empty States Area (scrollable) */}
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-6">
              {/* Initial State: No search performed yet */}
              {!hasSearched && (
                <div className="bg-muted/20 rounded-2xl border border-dashed p-10 text-center">
                  <div className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-2xl">
                    <Search className="size-6" aria-hidden="true" />
                  </div>
                  <h4 className="text-foreground mt-3 text-sm font-bold">
                    Catalog Search
                  </h4>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs">
                    Enter an icon name or keyword above and press Search to find
                    matching Lucide icons.
                  </p>
                </div>
              )}

              {/* Skeletons while searching */}
              {isSearching && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              )}

              {/* Search Results Display */}
              {hasSearched && !isSearching && (
                <div className="space-y-3">
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      Found {searchResults.length} result
                      {searchResults.length === 1 ? "" : "s"} for &ldquo;
                      {submittedQuery}&rdquo;
                    </span>
                    {searchResults.length === MAX_SEARCH_RESULTS && (
                      <span>Showing top {MAX_SEARCH_RESULTS}</span>
                    )}
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-8 text-center">
                      <p className="text-foreground text-sm font-semibold">
                        No matching icons
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        No Lucide icons matched &ldquo;{submittedQuery}&rdquo;.
                        Try another keyword.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {searchResults.map((iconName) => {
                        const isAlreadyFrequent =
                          frequentNamesSet.has(iconName);

                        return (
                          <div
                            key={iconName}
                            className="bg-card hover:border-border hover:bg-muted/20 flex flex-col items-center justify-between gap-2 rounded-xl border p-3 text-center transition-colors"
                          >
                            <div className="bg-muted text-foreground flex size-11 items-center justify-center rounded-xl">
                              <DynamicLucideIcon
                                iconKey={iconName}
                                className="size-5"
                              />
                            </div>

                            <div className="w-full min-w-0">
                              <p className="text-foreground truncate text-xs font-semibold">
                                {formatIconLabel(iconName)}
                              </p>
                              <p className="text-muted-foreground truncate font-mono text-[11px]">
                                {iconName}
                              </p>
                            </div>

                            {isAlreadyFrequent ? (
                              <div className="flex min-h-[44px] w-full items-center justify-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <Check className="size-4" aria-hidden="true" />
                                <span>Added</span>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={pending}
                                onClick={() => handleAdd(iconName)}
                                className="min-h-[44px] w-full gap-1.5 text-xs font-semibold"
                              >
                                <Plus className="size-4" aria-hidden="true" />
                                <span>Add</span>
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Selected Icon Detail Bottom Drawer */}
      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-none"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between border-b px-5 pt-3 pb-3">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Icon Details
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Lucide icon metadata and component code
              </SheetDescription>
            </SheetHeader>
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="text-muted-foreground hover:text-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors focus:outline-none"
              aria-label="Close details"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {selectedIcon && (
            <div className="space-y-4 overflow-y-auto px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
                  <DynamicLucideIcon
                    iconKey={selectedIcon.name}
                    className="size-8"
                  />
                </div>
                <div>
                  <h4 className="text-foreground text-base font-bold">
                    {formatIconLabel(selectedIcon.name)}
                  </h4>
                  <p className="text-muted-foreground font-mono text-xs">
                    {selectedIcon.name}
                  </p>
                </div>
              </div>

              <div className="bg-muted/60 text-foreground rounded-xl p-3 font-mono text-xs">
                <code>{`<DynamicLucideIcon iconKey="${selectedIcon.name}" />`}</code>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyCode(selectedIcon.name)}
                  className="min-h-[44px] flex-1 gap-2 text-sm font-semibold"
                >
                  {copiedKey ? (
                    <>
                      <Check className="size-4 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" /> Copy Name
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setMobileDetailOpen(false);
                    setDeleteConfirmIcon(selectedIcon);
                  }}
                  className="min-h-[44px] gap-2 text-sm font-semibold"
                >
                  <Trash2 className="size-4" />
                  <span>Remove</span>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Bottom Drawer for Deletion */}
      <ConfirmationSheet
        open={Boolean(deleteConfirmIcon)}
        onOpenChange={(open) => !open && setDeleteConfirmIcon(null)}
        title="Remove Frequent Icon"
        description={
          deleteConfirmIcon
            ? `Are you sure you want to remove "${deleteConfirmIcon.name}" from the frequently used list? It can be re-added anytime using Add Icon.`
            : ""
        }
        confirmLabel="Remove icon"
        pending={pending}
        onConfirm={handleConfirmRemove}
      />

      {/* Synchronized Project Status Toast (fast, swipe-down dismissable) */}
      {toastMessage && (
        <StatusToast
          duration={4000}
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
