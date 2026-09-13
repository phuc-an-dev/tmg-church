"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Layers3,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { StatusToast } from "@/components/ui/status-toast";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ministrySearchParams,
  structureSearchParams,
  termSearchParams,
} from "../search-params";
import {
  deleteMinistryAction,
  deleteStructureAction,
  deleteTermAction,
  saveMinistryAction,
  saveStructureAction,
  saveTermAction,
} from "../actions";
import type {
  MinistryItem,
  PageResult,
  StructureItem,
  TermItem,
} from "../types";
import {
  DEFAULT_MINISTRY_COLOR,
  DEFAULT_MINISTRY_ICON_KEY,
  MINISTRY_COLOR_OPTIONS,
  MINISTRY_ICON_OPTIONS,
  ministryIconFor,
  normalizeMinistryColor,
  type MinistryIconKey,
} from "../visual-identity";

type Mode = "ministries" | "terms" | "groups" | "departments";
type Item = MinistryItem | TermItem | StructureItem;
type Props = {
  mode: Mode;
  title: string;
  description: string;
  result: PageResult<Item>;
  ministryId?: string;
  termId?: string;
};
const labelFor = (mode: Mode) =>
  mode === "ministries"
    ? "Ministry"
    : mode === "terms"
      ? "Term"
      : mode === "groups"
        ? "Group"
        : "Department";
function isTerm(item: Item): item is TermItem {
  return "startDate" in item;
}
function isMinistry(item: Item): item is MinistryItem {
  return "slug" in item && "termCount" in item;
}

interface ChoiceMenuProps {
  label: string;
  value: string;
  choices: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  compact?: boolean;
  icon?: "filter" | "rows";
}

function ChoiceMenu({
  label,
  value,
  choices,
  onChange,
  compact = false,
  icon,
}: ChoiceMenuProps) {
  const activeLabel = choices.find((choice) => choice.value === value)?.label;
  const Icon = icon === "filter" ? SlidersHorizontal : Rows3;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={
            compact
              ? "bg-card hover:bg-card min-h-11 gap-2 px-3"
              : "bg-card hover:bg-card min-h-11 gap-2 px-4"
          }
          aria-label={`${label}: ${activeLabel}`}
        >
          {icon && <Icon className="size-4" aria-hidden="true" />}
          <span>{activeLabel}</span>
          <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 p-1.5">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {choices.map((choice) => (
            <DropdownMenuRadioItem
              key={choice.value}
              value={choice.value}
              className="min-h-10 px-3 text-sm"
            >
              {choice.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MinistryIdentityTile({
  accentColor,
  iconKey,
}: {
  accentColor: string;
  iconKey: string;
}) {
  const Icon = ministryIconFor(iconKey);
  const color = normalizeMinistryColor(accentColor);
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-xl border md:flex"
      style={{
        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      {React.createElement(Icon, { className: "size-5", "aria-hidden": true })}
    </span>
  );
}

function MinistryIdentityPicker({
  accentColor,
  iconKey,
  iconSearch,
  customColorOpen,
  colorError,
  previewName,
  onAccentColorChange,
  onIconKeyChange,
  onIconSearchChange,
  onCustomColorOpenChange,
}: {
  accentColor: string;
  iconKey: MinistryIconKey;
  iconSearch: string;
  customColorOpen: boolean;
  colorError: string | null;
  previewName: string;
  onAccentColorChange: (value: string) => void;
  onIconKeyChange: (value: MinistryIconKey) => void;
  onIconSearchChange: (value: string) => void;
  onCustomColorOpenChange: (value: boolean) => void;
}) {
  const normalizedColor = normalizeMinistryColor(accentColor);
  const activeIcon = ministryIconFor(iconKey);
  const activeIconLabel =
    MINISTRY_ICON_OPTIONS.find((option) => option.key === iconKey)?.label ??
    "Layers";
  const iconQuery = iconSearch.trim().toLowerCase().replace(/\s+/g, " ");
  const customColorSelected = !MINISTRY_COLOR_OPTIONS.some(
    (option) => option.value === normalizedColor,
  );
  const icons = MINISTRY_ICON_OPTIONS.filter(
    (option) =>
      !iconQuery ||
      `${option.label} ${option.keywords}`.toLowerCase().includes(iconQuery),
  );

  function moveIconFocus(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const columns = window.matchMedia("(min-width: 640px)").matches ? 6 : 5;
    const direction =
      event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowDown"
            ? columns
            : event.key === "ArrowUp"
              ? -columns
              : 0;
    if (!direction) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(icons.length - 1, index + direction));
    const grid = event.currentTarget.closest("[data-icon-grid]");
    const buttons = grid?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[next]?.focus();
  }

  function selectColor(index: number) {
    if (index === MINISTRY_COLOR_OPTIONS.length) {
      onCustomColorOpenChange(true);
      return;
    }
    onAccentColorChange(MINISTRY_COLOR_OPTIONS[index].value);
    onCustomColorOpenChange(false);
  }

  function moveColorFocus(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowUp"
    )
      return;
    event.preventDefault();
    const count = MINISTRY_COLOR_OPTIONS.length + 1;
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (index + delta + count) % count;
    selectColor(next);
    const controls = event.currentTarget
      .closest("[data-color-options]")
      ?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    controls?.[next]?.focus();
  }

  return (
    <div className="bg-card space-y-5 rounded-2xl border p-4">
      <div className="space-y-3">
        <Label>Ministry color</Label>
        <div
          data-color-options
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label="Ministry color"
        >
          {MINISTRY_COLOR_OPTIONS.map((option) => {
            const selected = normalizedColor === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                onClick={() => {
                  selectColor(MINISTRY_COLOR_OPTIONS.indexOf(option));
                }}
                onKeyDown={(event) =>
                  moveColorFocus(event, MINISTRY_COLOR_OPTIONS.indexOf(option))
                }
                className="focus-visible:outline-primary flex size-11 items-center justify-center rounded-full border-2 border-transparent transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: option.value,
                  borderColor: selected ? "var(--foreground)" : "transparent",
                }}
              >
                {selected && (
                  <Check
                    className="size-4 text-white"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
          <Button
            type="button"
            role="radio"
            aria-checked={customColorSelected}
            variant="outline"
            className="min-h-11 rounded-full px-3 text-sm"
            onClick={() => onCustomColorOpenChange(!customColorOpen)}
            onKeyDown={(event) =>
              moveColorFocus(event, MINISTRY_COLOR_OPTIONS.length)
            }
          >
            Custom color
          </Button>
        </div>
        {customColorOpen && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
              <Input
                type="color"
                aria-label="Choose custom ministry color"
                value={normalizedColor}
                onChange={(event) => onAccentColorChange(event.target.value)}
                className="h-11 w-12 p-1"
              />
              <Input
                value={accentColor}
                onChange={(event) =>
                  onAccentColorChange(event.target.value.toLowerCase())
                }
                aria-invalid={Boolean(colorError)}
                aria-describedby={colorError ? "custom-color-error" : undefined}
                aria-label="Custom ministry color hex value"
                placeholder="#3b82f6"
                className="h-11 font-mono text-base"
                pattern="^#[0-9a-fA-F]{6}$"
              />
            </div>
            {colorError && (
              <p id="custom-color-error" className="text-destructive text-sm">
                {colorError}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <Label htmlFor="ministry-icon-search">Ministry icon</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="ministry-icon-search"
            value={iconSearch}
            onChange={(event) => onIconSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onIconSearchChange("");
            }}
            placeholder="Search icons"
            className="bg-background h-11 pl-9 text-base"
          />
        </div>
        {icons.length ? (
          <div
            data-icon-grid
            className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6"
            aria-label="Ministry icon options"
          >
            {icons.map((option, index) => {
              const Icon = ministryIconFor(option.key);
              const selected = option.key === iconKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={selected}
                  title={option.label}
                  onKeyDown={(event) => moveIconFocus(event, index)}
                  onClick={() => onIconKeyChange(option.key)}
                  className="bg-background focus-visible:outline-primary flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={
                    selected
                      ? {
                          borderColor: normalizedColor,
                          backgroundColor: `color-mix(in srgb, ${normalizedColor} 12%, transparent)`,
                          color: normalizedColor,
                        }
                      : undefined
                  }
                >
                  {React.createElement(Icon, {
                    className: "size-5",
                    "aria-hidden": true,
                  })}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No icons match this search.
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          Selected icon:{" "}
          <span className="text-foreground">{activeIconLabel}</span>
        </p>
      </div>
      <div
        className="flex items-center gap-3 rounded-xl border p-3"
        style={{ borderLeftColor: normalizedColor, borderLeftWidth: 3 }}
        aria-label="Ministry identity preview"
      >
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: normalizedColor,
            backgroundColor: `color-mix(in srgb, ${normalizedColor} 12%, transparent)`,
          }}
        >
          {React.createElement(activeIcon, {
            className: "size-5",
            "aria-hidden": true,
          })}
        </span>
        <span className="min-w-0">
          <span className="text-muted-foreground block text-xs font-medium">
            Preview
          </span>
          <span className="block truncate font-semibold">{previewName}</span>
        </span>
      </div>
    </div>
  );
}

export function MinistryManagement({
  mode,
  title,
  description,
  result,
  ministryId,
  termId,
}: Props) {
  const parsers =
    mode === "ministries"
      ? ministrySearchParams
      : mode === "terms"
        ? termSearchParams
        : structureSearchParams;
  const [query, setQuery] = useQueryStates(
    parsers as typeof ministrySearchParams,
  );
  const [editor, setEditor] = React.useState<Item | "create" | null>(null);
  const [deleting, setDeleting] = React.useState<Item | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [accentColor, setAccentColor] = React.useState(DEFAULT_MINISTRY_COLOR);
  const [iconKey, setIconKey] = React.useState<MinistryIconKey>(
    DEFAULT_MINISTRY_ICON_KEY,
  );
  const [iconSearch, setIconSearch] = React.useState("");
  const [customColorOpen, setCustomColorOpen] = React.useState(false);
  const [searchDraft, setSearchDraft] = React.useState(query.q);
  const [ministryNameDraft, setMinistryNameDraft] = React.useState("");
  React.useEffect(() => {
    if (searchDraft === query.q) return;
    const timer = window.setTimeout(() => {
      void setQuery({ q: searchDraft, page: 1 } as never);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query.q, searchDraft, setQuery]);
  const update = (value: Record<string, unknown>) =>
    void setQuery({ ...value, page: 1 } as never);
  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const rangeStart =
    result.count === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.count);
  const label = labelFor(mode);
  const detailHref = (item: Item) =>
    mode === "ministries"
      ? `/admin/ministries/${item.id}`
      : mode === "terms"
        ? `/admin/ministries/${ministryId}/terms/${item.id}`
        : undefined;

  function openEditor(item: Item | "create") {
    const ministry = item !== "create" && isMinistry(item) ? item : null;
    setAccentColor(
      ministry
        ? normalizeMinistryColor(ministry.accentColor)
        : DEFAULT_MINISTRY_COLOR,
    );
    setIconKey(
      ministry &&
        MINISTRY_ICON_OPTIONS.some((option) => option.key === ministry.iconKey)
        ? (ministry.iconKey as MinistryIconKey)
        : DEFAULT_MINISTRY_ICON_KEY,
    );
    setIconSearch("");
    setCustomColorOpen(false);
    setMinistryNameDraft(ministry ? ministry.name : "New Ministry");
    setFormError(null);
    setEditor(item);
  }

  function submit(form: FormData) {
    setFormError(null);
    if (
      mode === "ministries" &&
      !/^#[0-9a-f]{6}$/.test(accentColor.trim().toLowerCase())
    ) {
      setFormError("Use a six-digit hex color.");
      return;
    }
    const item = editor === "create" ? null : editor;
    const payload: Record<string, unknown> = {
      id: item?.id,
      name: form.get("name"),
      slug: form.get("slug") || undefined,
      ...(mode === "ministries" ? { accentColor, iconKey } : {}),
    };
    let action: Promise<{ success: boolean; message?: string; error?: string }>;
    if (mode === "ministries") action = saveMinistryAction(payload);
    else if (mode === "terms")
      action = saveTermAction({
        ...payload,
        ministryId,
        startDate: form.get("startDate") || null,
        endDate: form.get("endDate") || null,
      });
    else
      action = saveStructureAction(
        mode === "groups" ? "groups" : "departments",
        { ...payload, ministryId, termId },
      );
    startTransition(async () => {
      const response = await action;
      if (!response.success) {
        setFormError(response.error ?? "Unable to save this record.");
        return;
      }
      setEditor(null);
      setFeedback(response.message ?? `${label} saved successfully.`);
    });
  }
  function remove() {
    if (!deleting) return;
    const payload =
      mode === "ministries"
        ? { id: deleting.id }
        : mode === "terms"
          ? { id: deleting.id, parentId: ministryId }
          : { id: deleting.id, parentId: termId, ministryId };
    const action =
      mode === "ministries"
        ? deleteMinistryAction(payload)
        : mode === "terms"
          ? deleteTermAction(payload)
          : deleteStructureAction(
              mode === "groups" ? "groups" : "departments",
              payload,
            );
    startTransition(async () => {
      const response = await action;
      if (!response.success) {
        setFormError(response.error ?? "Unable to delete this record.");
        return;
      }
      setDeleting(null);
      setFeedback(response.message ?? `${label} deleted successfully.`);
    });
  }

  const resetKey = `${query.q}-${query.page}-${query.pageSize}-${query.sort}-${mode}-${Boolean(editor)}-${Boolean(deleting)}`;

  return (
    <ExpandableCoordinatorProvider resetKey={resetKey}>
      {feedback && (
        <StatusToast message={feedback} onDismiss={() => setFeedback(null)} />
      )}
      <section className="space-y-5" aria-label={title}>
        <p className="sr-only">{description}</p>
        <div
          className={
            mode === "terms"
              ? "flex flex-wrap items-center gap-2 border-b pb-5"
              : "flex items-center gap-2 border-b pb-5"
          }
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={searchDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSearchDraft(event.currentTarget.value);
                  update({ q: event.currentTarget.value });
                }
              }}
              onChange={(event) => {
                setSearchDraft(event.currentTarget.value);
                if (!event.currentTarget.value) update({ q: "" });
              }}
              className="bg-card h-12 pl-9 shadow-xs"
              aria-label={`Search ${title.toLowerCase()}`}
              placeholder={`Search ${title.toLowerCase()}`}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mode === "ministries" && (
              <ChoiceMenu
                label="Sort ministries"
                value={query.sort}
                onChange={(value) => update({ sort: value })}
                icon="filter"
                choices={[
                  { value: "name-asc", label: "Name: A to Z" },
                  { value: "name-desc", label: "Name: Z to A" },
                ]}
              />
            )}
            {mode === "terms" && (
              <>
                <ChoiceMenu
                  label="Filter terms"
                  value={(query as unknown as { status: string }).status}
                  onChange={(value) => update({ status: value })}
                  icon="filter"
                  choices={[
                    { value: "all", label: "All statuses" },
                    { value: "current", label: "Current" },
                    { value: "upcoming", label: "Upcoming" },
                    { value: "ended", label: "Ended" },
                  ]}
                />
                <ChoiceMenu
                  label="Sort terms"
                  value={query.sort}
                  onChange={(value) => update({ sort: value })}
                  choices={[
                    { value: "start-desc", label: "Start date: newest" },
                    { value: "start-asc", label: "Start date: oldest" },
                    { value: "name-asc", label: "Name: A to Z" },
                  ]}
                />
              </>
            )}
          </div>
        </div>
        {result.items.length === 0 ? (
          <div className="admin-surface py-12 text-center">
            <p className="font-medium">
              {query.q
                ? `No ${title.toLowerCase()} match this search.`
                : `No ${title.toLowerCase()} yet.`}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {query.q
                ? "Clear or change your search to see more records."
                : `Create the first ${label.toLowerCase()} to get started.`}
            </p>
          </div>
        ) : (
          <>
            <p className="sr-only">
              Use the Actions button on mobile to reveal actions for an item.
            </p>
            <div
              role="table"
              aria-label={title}
              className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
            >
              <div role="rowgroup">
                <div
                  role="row"
                  className={cn(
                    "bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:items-center md:border-b md:px-4 md:py-3",
                    mode === "ministries"
                      ? "md:grid-cols-[1fr_180px_120px_180px]"
                      : mode === "terms"
                        ? "md:grid-cols-[1fr_180px_120px_180px]"
                        : "md:grid-cols-[1fr_180px]",
                  )}
                >
                  <div role="columnheader">Name</div>
                  {mode !== "groups" && mode !== "departments" && (
                    <div role="columnheader">Slug</div>
                  )}
                  {mode === "ministries" && (
                    <div role="columnheader">Terms</div>
                  )}
                  {mode === "terms" && <div role="columnheader">Status</div>}
                  <div role="columnheader" className="text-right">
                    Actions
                  </div>
                </div>
              </div>
              <div
                role="rowgroup"
                className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
              >
                {result.items.map((item) => {
                  const isDeleteDisabled =
                    isMinistry(item) && item.termCount > 0;
                  const deleteDisabledReason = isDeleteDisabled
                    ? "Cannot delete a ministry with existing terms."
                    : undefined;

                  return (
                    <ExpandableActionItem
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      onEdit={() => openEditor(item)}
                      onDelete={() => {
                        setFormError(null);
                        setDeleting(item);
                      }}
                      deleteDisabled={isDeleteDisabled}
                      deleteDisabledReason={deleteDisabledReason}
                      className={cn(
                        "p-4 sm:p-5 md:grid md:items-center md:gap-4 md:p-3",
                        mode === "ministries"
                          ? "md:grid-cols-[1fr_180px_120px_180px]"
                          : mode === "terms"
                            ? "md:grid-cols-[1fr_180px_120px_180px]"
                            : "md:grid-cols-[1fr_180px]",
                      )}
                    >
                      <div role="cell" className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            {isMinistry(item) ? (
                              <MinistryIdentityTile
                                accentColor={item.accentColor}
                                iconKey={item.iconKey}
                              />
                            ) : (
                              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl md:hidden">
                                <Layers3
                                  className="size-5"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              {detailHref(item) ? (
                                <Link
                                  className="hover:text-primary text-base font-semibold underline-offset-4 hover:underline"
                                  href={detailHref(item)!}
                                >
                                  {item.name}
                                </Link>
                              ) : (
                                <span className="text-base font-semibold">
                                  {item.name}
                                </span>
                              )}
                              {isTerm(item) && (
                                <span className="text-muted-foreground mt-0.5 block text-xs">
                                  {item.startDate ?? "No start date"} to{" "}
                                  {item.endDate ?? "No end date"}
                                </span>
                              )}
                              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs md:hidden">
                                {(isMinistry(item) || isTerm(item)) && (
                                  <span className="font-mono">
                                    /{item.slug}
                                  </span>
                                )}
                                {isMinistry(item) && (
                                  <span>
                                    • {item.termCount}{" "}
                                    {item.termCount === 1 ? "term" : "terms"}
                                  </span>
                                )}
                                {isTerm(item) && (
                                  <span className="capitalize">
                                    • {item.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ExpandableActionItem.Trigger className="md:hidden" />
                        </div>
                        <ExpandableActionItem.MobileActions />
                      </div>
                      {(isMinistry(item) || isTerm(item)) && (
                        <div
                          role="cell"
                          className="text-muted-foreground hidden font-mono text-xs md:block"
                        >
                          /{item.slug}
                        </div>
                      )}
                      {isMinistry(item) && (
                        <div
                          role="cell"
                          className="text-muted-foreground hidden text-sm md:block"
                        >
                          {item.termCount}{" "}
                          {item.termCount === 1 ? "term" : "terms"}
                        </div>
                      )}
                      {isTerm(item) && (
                        <div
                          role="cell"
                          className="hidden text-sm capitalize md:block"
                        >
                          {item.status}
                        </div>
                      )}
                      <div role="cell" className="hidden justify-end md:flex">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </ExpandableActionItem>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <div className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)]">
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="text-muted-foreground text-sm">
              Showing{" "}
              <strong className="text-foreground font-medium">
                {rangeStart}–{rangeEnd}
              </strong>{" "}
              of{" "}
              <strong className="text-foreground font-medium">
                {result.count}
              </strong>{" "}
              {title.toLowerCase()}
            </span>
            <div
              className="border-input bg-muted/35 flex shrink-0 items-center rounded-xl border p-1"
              aria-label="Results per page"
            >
              {[20, 50, 100].map((pageSize) => {
                const active = query.pageSize === pageSize;
                return (
                  <button
                    key={pageSize}
                    type="button"
                    aria-pressed={active}
                    aria-label={`Show ${pageSize} results per page`}
                    onClick={() => update({ pageSize })}
                    className={
                      active
                        ? "bg-primary text-primary-foreground min-h-9 min-w-10 rounded-lg px-2 text-sm font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground min-h-9 min-w-10 rounded-lg px-2 text-sm font-medium transition-colors"
                    }
                  >
                    {pageSize}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t p-4">
            <Button
              variant="outline"
              className="bg-secondary hover:bg-secondary/80 disabled:bg-muted/40 min-h-12 w-full rounded-xl border-0"
              disabled={result.page <= 1}
              onClick={() => void setQuery({ page: result.page - 1 } as never)}
            >
              <ChevronLeft aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <span
              className="border-input bg-card flex min-h-12 min-w-20 items-center justify-center rounded-xl border px-3 text-base font-semibold"
              aria-live="polite"
            >
              {Math.min(result.page, totalPages)}
              <span className="text-muted-foreground px-1">/</span>
              {totalPages}
            </span>
            <Button
              variant="outline"
              className="bg-secondary hover:bg-secondary/80 disabled:bg-muted/40 min-h-12 w-full rounded-xl border-0"
              disabled={result.page >= totalPages}
              onClick={() => void setQuery({ page: result.page + 1 } as never)}
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
      <Button
        className="fixed right-5 bottom-28 z-30 min-h-12 rounded-full px-5 shadow-[0_18px_36px_-14px_color-mix(in_oklch,var(--primary)_70%,transparent)] md:right-8 md:bottom-8"
        onClick={() => {
          openEditor("create");
        }}
      >
        <Plus aria-hidden="true" className="size-5" />
        Add {label}
      </Button>
      {editor && (
        <ResponsiveEditor
          open
          onOpenChange={(open) => !open && setEditor(null)}
          title={`${editor === "create" ? "Add" : "Edit"} ${label}`}
          description={
            mode !== "groups" && mode !== "departments"
              ? "Names are displayed exactly as entered. Slugs change links."
              : "Names must be unique within this term."
          }
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setEditor(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="ministry-editor"
                className="min-h-11"
                disabled={pending}
              >
                {pending ? "Saving..." : "Save"}
              </Button>
            </>
          }
        >
          <form id="ministry-editor" action={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={
                  mode === "ministries"
                    ? undefined
                    : editor === "create"
                      ? ""
                      : editor.name
                }
                value={mode === "ministries" ? ministryNameDraft : undefined}
                onChange={
                  mode === "ministries"
                    ? (event) => setMinistryNameDraft(event.target.value)
                    : undefined
                }
                className="h-12 text-base"
              />
            </div>
            {mode === "ministries" && (
              <MinistryIdentityPicker
                accentColor={accentColor}
                iconKey={iconKey}
                iconSearch={iconSearch}
                customColorOpen={customColorOpen}
                colorError={
                  /^#[0-9a-f]{6}$/.test(accentColor.trim().toLowerCase())
                    ? null
                    : "Use a six-digit hex color."
                }
                previewName={ministryNameDraft || "New Ministry"}
                onAccentColorChange={setAccentColor}
                onIconKeyChange={setIconKey}
                onIconSearchChange={setIconSearch}
                onCustomColorOpenChange={setCustomColorOpen}
              />
            )}
            {mode !== "groups" && mode !== "departments" && (
              <details className="admin-surface p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Advanced link settings
                </summary>
                <p className="text-muted-foreground mt-2 text-xs">
                  Changing a slug affects existing links. Leave it blank when
                  creating a record to generate one from the name.
                </p>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    defaultValue={
                      editor === "create"
                        ? ""
                        : (editor as MinistryItem | TermItem).slug
                    }
                    className="h-12 font-mono text-base"
                  />
                </div>
              </details>
            )}
            {mode === "terms" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={
                      editor !== "create" && isTerm(editor)
                        ? (editor.startDate ?? "")
                        : ""
                    }
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    min={
                      editor !== "create" && isTerm(editor)
                        ? (editor.startDate ?? undefined)
                        : undefined
                    }
                    defaultValue={
                      editor !== "create" && isTerm(editor)
                        ? (editor.endDate ?? "")
                        : ""
                    }
                    className="h-12"
                  />
                </div>
              </div>
            )}
            {formError && (
              <p className="text-destructive text-sm" role="alert">
                {formError}
              </p>
            )}
          </form>
        </ResponsiveEditor>
      )}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the record only when no protected
              dependent history exists. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError && (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              {pending ? "Deleting..." : `Delete ${label}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ExpandableCoordinatorProvider>
  );
}
