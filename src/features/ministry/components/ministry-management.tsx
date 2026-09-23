"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FolderCog,
  Layers3,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { RadioGroup as RadixRadioGroup } from "radix-ui";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { ManageCollectionDrawer } from "@/components/shared/manage-collection-drawer";
import {
  ExportPanel,
  ImportPanel,
  downloadCsvFile,
  downloadJsonFile,
  useCollectionImport,
  type TransferColumn,
} from "@/components/shared/collection-transfer";
import { PaginationCard } from "@/components/shared/pagination-card";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { StatusToast } from "@/components/ui/status-toast";
import { SessionEditorDrawer } from "@/features/session/components/session-editor-drawer";
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
  ministrySearchParams,
  structureSearchParams,
  termSearchParams,
} from "../search-params";
import {
  deleteMinistryAction,
  deleteStructureAction,
  deleteTermAction,
  exportCollectionAction,
  importMinistriesAction,
  importStructuresAction,
  importTermsAction,
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
import type { FrequentIconItem } from "@/features/icon/types";
import {
  DEFAULT_MINISTRY_COLOR,
  DEFAULT_MINISTRY_ICON_KEY,
  normalizeMinistryColor,
} from "../visual-identity";

type Mode = "ministries" | "terms" | "groups" | "departments";
type Item = MinistryItem | TermItem | StructureItem;
type Props = {
  mode: Mode;
  title: string;
  description: string;
  result: PageResult<Item>;
  ministryId?: string;
  ministrySlug?: string;
  termId?: string;
  termSlug?: string;
  frequentIcons?: FrequentIconItem[];
};
const labelFor = (mode: Mode) =>
  mode === "ministries"
    ? "Ministry"
    : mode === "terms"
      ? "Term"
      : mode === "groups"
        ? "Group"
        : "Department";
const getInitialDraft = (mode: Mode) => {
  switch (mode) {
    case "ministries":
      return "Ban ";
    case "terms":
      return "Nhiệm kỳ ";
    case "groups":
      return "Nhóm ";
    case "departments":
      return "Ban ";
  }
};
const pluralFor = (mode: Mode) =>
  mode === "ministries"
    ? "Ministries"
    : mode === "terms"
      ? "Terms"
      : mode === "groups"
        ? "Groups"
        : "Departments";

const TERM_LIFECYCLE_VALUES = ["draft", "active", "closed"];

function importColumnsForMode(mode: Mode): TransferColumn[] {
  const name: TransferColumn = { key: "name", label: "Name", required: true };
  const slug: TransferColumn = { key: "slug", label: "Slug" };
  const accentColor: TransferColumn = {
    key: "accentColor",
    label: "Accent color",
    aliases: ["accent", "color", "accent color", "accent_color"],
    validate: (value) => /^#[0-9a-fA-F]{6}$/.test(value),
  };
  const iconKey: TransferColumn = {
    key: "iconKey",
    label: "Icon",
    aliases: ["icon", "icon key", "icon_key"],
    transform: (value) => value.trim().toLowerCase(),
    validate: (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
  };
  if (mode === "terms") {
    return [
      name,
      slug,
      {
        key: "startDate",
        label: "Start date",
        aliases: ["start date", "start_date"],
        validate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
      },
      {
        key: "endDate",
        label: "End date",
        aliases: ["end date", "end_date"],
        validate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
      },
      {
        key: "lifecycle",
        label: "Lifecycle",
        aliases: ["status"],
        transform: (value) => value.trim().toLowerCase(),
        validate: (value) => TERM_LIFECYCLE_VALUES.includes(value),
      },
    ];
  }
  return [name, slug, accentColor, iconKey];
}

const EXPORT_COLUMNS: Record<Mode, string[]> = {
  ministries: ["name", "slug", "accentColor", "iconKey"],
  terms: ["name", "slug", "startDate", "endDate", "lifecycle"],
  groups: ["name", "slug", "accentColor", "iconKey"],
  departments: ["name", "slug", "accentColor", "iconKey"],
};
function isTerm(item: Item): item is TermItem {
  return "startDate" in item;
}
function isMinistry(item: Item): item is MinistryItem {
  return "slug" in item && "termCount" in item;
}
function hasVisualIdentity(item: Item): item is MinistryItem | StructureItem {
  return "accentColor" in item;
}

const MINISTRY_SORT_CHOICES = [
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

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

const TERM_LIFECYCLE_OPTIONS: Array<{
  value: TermItem["lifecycle"];
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

function LifecycleDropdown({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: TermItem["lifecycle"];
  onChange: (value: TermItem["lifecycle"]) => void;
  disabled?: boolean;
}) {
  const activeLabel =
    TERM_LIFECYCLE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className="bg-card hover:bg-card h-12 min-h-[44px] w-full justify-between px-3 text-left text-base font-normal sm:text-sm"
          aria-label={`Lifecycle: ${activeLabel}`}
        >
          <span className="capitalize">{activeLabel}</span>
          <ChevronDown
            className="size-4 shrink-0 opacity-60"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[60] w-(--radix-dropdown-menu-trigger-width) min-w-48 p-1.5"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(val) => onChange(val as TermItem["lifecycle"])}
        >
          {TERM_LIFECYCLE_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="min-h-10 cursor-pointer px-3 text-sm"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import {
  IdentityPicker,
  IdentityTile,
} from "@/components/shared/identity-picker";

export function MinistryManagement({
  mode,
  title,
  description,
  result,
  ministryId,
  ministrySlug,
  termId,
  termSlug,
  frequentIcons = [],
}: Props) {
  const label = labelFor(mode);
  const supportsSearchAndPagination = mode === "ministries";
  const supportsVisualIdentity = mode !== "terms";
  const parsers =
    mode === "ministries"
      ? ministrySearchParams
      : mode === "terms"
        ? termSearchParams
        : structureSearchParams;
  const [query, setQuery] = useQueryStates(
    parsers as typeof ministrySearchParams,
  );
  const [searchDraft, setSearchDraft] = React.useState(
    supportsSearchAndPagination ? (query.q ?? "") : "",
  );
  const [editor, setEditor] = React.useState<Item | null>(null);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [manageTab, setManageTab] = React.useState<"add" | "import" | "export">(
    "add",
  );
  const plural = pluralFor(mode);
  const importColumns = React.useMemo(() => importColumnsForMode(mode), [mode]);
  const {
    importMode,
    setImportMode,
    fileName: importFileName,
    parsed: importParsed,
    handleFileSelect,
    resetImport,
  } = useCollectionImport(importColumns);
  const [contextualSession, setContextualSession] = React.useState<{
    ministryTermId: string;
    groupId?: string;
    departmentId?: string;
  } | null>(null);
  const [deleting, setDeleting] = React.useState<Item | null>(null);
  const [accentColor, setAccentColor] = React.useState(DEFAULT_MINISTRY_COLOR);
  const [iconKey, setIconKey] = React.useState(
    frequentIcons[0]?.name ?? DEFAULT_MINISTRY_ICON_KEY,
  );
  const [customColorOpen, setCustomColorOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [identityNameDraft, setIdentityNameDraft] = React.useState("");
  const [termStartDate, setTermStartDate] = React.useState<string>("");
  const [termEndDate, setTermEndDate] = React.useState<string>("");
  const [termLifecycle, setTermLifecycle] =
    React.useState<TermItem["lifecycle"]>("draft");
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [draftSort, setDraftSort] = React.useState<string>("name-asc");
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!supportsSearchAndPagination) return;
    if (searchDraft === query.q) return;
    const timer = window.setTimeout(() => {
      void setQuery({ q: searchDraft, page: 1 } as never);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query.q, searchDraft, setQuery, supportsSearchAndPagination]);
  const update = (value: Record<string, unknown>) =>
    void setQuery({ ...value, page: 1 } as never);

  function openFilterSheet() {
    setDraftSort(query.sort ?? "name-asc");
    setFilterSheetOpen(true);
  }

  function applyFilters() {
    update({ sort: draftSort });
    setFilterSheetOpen(false);
  }

  function resetDraftFilters() {
    setDraftSort("name-asc");
  }

  const activeFilterCount =
    mode === "ministries"
      ? query.sort && (query.sort as string) !== "name-asc"
        ? 1
        : 0
      : 0;

  const hasDraftFilterChanges =
    mode === "ministries" ? draftSort !== "name-asc" : false;

  const detailHref = (item: Item) =>
    mode === "ministries"
      ? isMinistry(item) && item.currentTermSlug
        ? `/admin/ministries/${item.slug}/terms/${item.currentTermSlug}`
        : `/admin/ministries/${item.slug}?view=terms`
      : mode === "terms"
        ? `/admin/ministries/${ministrySlug}/terms/${item.slug}`
        : mode === "departments"
          ? `/admin/ministries/${ministrySlug}/terms/${termSlug}/departments/${item.slug}`
          : mode === "groups"
            ? `/admin/ministries/${ministrySlug}/terms/${termSlug}/groups/${item.slug}`
            : undefined;

  function resetIdentityDrafts(item: Item | null) {
    const identityItem = item && hasVisualIdentity(item) ? item : null;
    setAccentColor(
      identityItem
        ? normalizeMinistryColor(identityItem.accentColor)
        : DEFAULT_MINISTRY_COLOR,
    );
    setIconKey(
      identityItem?.iconKey ??
        frequentIcons[0]?.name ??
        DEFAULT_MINISTRY_ICON_KEY,
    );
    setCustomColorOpen(false);
    setIdentityNameDraft(item ? item.name : getInitialDraft(mode));
    const term = item && isTerm(item) ? item : null;
    setTermStartDate(term?.startDate ?? "");
    setTermEndDate(term?.endDate ?? "");
    setTermLifecycle(term?.lifecycle ?? "draft");
    setFormError(null);
  }

  function openCreate() {
    resetIdentityDrafts(null);
    setManageTab("add");
    setManageOpen(true);
  }

  function openEditor(item: Item) {
    resetIdentityDrafts(item);
    setEditor(item);
  }

  function persist(item: Item | null, form: FormData) {
    setFormError(null);
    if (
      supportsVisualIdentity &&
      !/^#[0-9a-f]{6}$/.test(accentColor.trim().toLowerCase())
    ) {
      setFormError("Use a six-digit hex color.");
      return;
    }
    const payload: Record<string, unknown> = {
      id: item?.id,
      name: form.get("name"),
      slug: form.get("slug") || undefined,
      ...(supportsVisualIdentity ? { accentColor, iconKey } : {}),
    };
    let action: Promise<{ success: boolean; message?: string; error?: string }>;
    if (mode === "ministries") action = saveMinistryAction(payload);
    else if (mode === "terms")
      action = saveTermAction({
        ...payload,
        ministryId,
        startDate: form.get("startDate") || null,
        endDate: form.get("endDate") || null,
        lifecycle: item ? termLifecycle : "draft",
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
      if (item) setEditor(null);
      else setManageOpen(false);
      setFeedback(response.message ?? `${label} saved successfully.`);
    });
  }

  function submitEdit(form: FormData) {
    if (editor) persist(editor, form);
  }

  function submitCreate(form: FormData) {
    persist(null, form);
  }

  function submitImport() {
    if (importParsed.valid.length === 0) return;
    const rows = importParsed.valid;
    let action: Promise<{ success: boolean; message?: string; error?: string }>;
    if (mode === "ministries")
      action = importMinistriesAction({ mode: importMode, rows });
    else if (mode === "terms")
      action = importTermsAction({ ministryId, mode: importMode, rows });
    else
      action = importStructuresAction(mode, {
        ministryId,
        termId,
        mode: importMode,
        rows,
      });
    startTransition(async () => {
      const response = await action;
      if (!response.success) {
        setFeedback(
          response.error ?? `Unable to import ${plural.toLowerCase()}.`,
        );
        return;
      }
      setManageOpen(false);
      resetImport();
      setFeedback(response.message ?? `${plural} imported successfully.`);
    });
  }

  function submitExport(format: "json" | "csv") {
    startTransition(async () => {
      const response = await exportCollectionAction({
        section: mode,
        ministryId,
        termId,
      });
      if (!response.success) {
        setFeedback(
          response.error ?? `Unable to export ${plural.toLowerCase()}.`,
        );
        return;
      }
      const columns = EXPORT_COLUMNS[mode];
      if (format === "json") {
        downloadJsonFile(`tmg-church-${mode}`, {
          version: 1,
          exportedAt: new Date().toISOString(),
          [mode]: response.data.rows,
        });
        return;
      }
      downloadCsvFile(
        `tmg-church-${mode}`,
        columns,
        response.data.rows.map((row) =>
          columns.map((column) => row[column] ?? ""),
        ),
      );
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
      <section
        className="space-y-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
        aria-label={title}
      >
        <p className="sr-only">{description}</p>
        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            onClick={openCreate}
            className="hidden min-h-12 items-center gap-2 rounded-xl px-4 font-semibold sm:flex"
          >
            <FolderCog className="size-4" aria-hidden="true" />
            <span>Manage {plural}</span>
          </Button>
        </div>
        {mode === "ministries" && (
          <div className="flex items-center gap-2 border-b pb-5">
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
            <Button
              ref={filterButtonRef}
              type="button"
              variant="outline"
              onClick={openFilterSheet}
              className="bg-card hover:bg-card min-h-12 shrink-0 gap-2 px-3.5 md:hidden"
              aria-label={
                activeFilterCount > 0
                  ? `Filter ${title.toLowerCase()} (${activeFilterCount} active)`
                  : `Filter ${title.toLowerCase()}`
              }
            >
              <SlidersHorizontal
                className="text-muted-foreground size-4"
                aria-hidden="true"
              />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <ChoiceMenu
                label="Sort ministries"
                value={query.sort}
                onChange={(value) => update({ sort: value })}
                icon="filter"
                choices={MINISTRY_SORT_CHOICES}
              />
            </div>
          </div>
        )}
        {result.items.length === 0 ? (
          <div className="border-border/70 bg-card rounded-xl border py-12 text-center shadow-xs">
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
            {!query.q && (
              <Button
                type="button"
                onClick={openCreate}
                className="mt-4 min-h-11 gap-2 rounded-xl"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Add {label}</span>
              </Button>
            )}
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
                        : mode === "departments"
                          ? "md:grid-cols-[1fr_180px_180px_120px]"
                          : mode === "groups"
                            ? "md:grid-cols-[1fr_180px_180px_120px]"
                            : "md:grid-cols-[1fr_180px_180px]",
                  )}
                >
                  <div role="columnheader">Name</div>
                  <div role="columnheader">Slug</div>
                  {mode === "ministries" && (
                    <div role="columnheader">Terms</div>
                  )}
                  {mode === "terms" && <div role="columnheader">Lifecycle</div>}
                  {mode === "departments" && (
                    <div role="columnheader">Members & Roles</div>
                  )}
                  {mode === "groups" && <div role="columnheader">Members</div>}
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
                  const currentTermId = isMinistry(item)
                    ? item.currentTermId
                    : null;

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
                      onAdditionalAction={
                        (mode === "groups" || mode === "departments") && termId
                          ? () =>
                              setContextualSession({
                                ministryTermId: termId,
                                ...(mode === "groups"
                                  ? { groupId: item.id }
                                  : { departmentId: item.id }),
                              })
                          : mode === "ministries" && currentTermId
                            ? () =>
                                setContextualSession({
                                  ministryTermId: currentTermId,
                                })
                            : undefined
                      }
                      additionalActionLabel="Create session"
                      additionalActionSectionLabel="Session"
                      additionalActionIcon={CalendarDays}
                      className={cn(
                        "p-4 sm:p-5 md:grid md:items-center md:gap-4 md:p-3",
                        mode === "ministries"
                          ? "md:grid-cols-[1fr_180px_120px_180px]"
                          : mode === "terms"
                            ? "md:grid-cols-[1fr_180px_120px_180px]"
                            : mode === "departments"
                              ? "md:grid-cols-[1fr_180px_180px_120px]"
                              : mode === "groups"
                                ? "md:grid-cols-[1fr_180px_180px_120px]"
                                : "md:grid-cols-[1fr_180px_180px]",
                      )}
                    >
                      <div role="cell" className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          {detailHref(item) ? (
                            <Link
                              href={detailHref(item)!}
                              className="group/item flex min-w-0 flex-1 items-center gap-3 outline-hidden"
                            >
                              {hasVisualIdentity(item) ? (
                                <IdentityTile
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
                                <span className="group-hover/item:text-primary text-base font-semibold underline-offset-4 group-hover/item:underline">
                                  {item.name}
                                </span>
                                {isTerm(item) && (
                                  <span className="text-muted-foreground mt-0.5 block text-xs">
                                    {item.startDate ?? "No start date"} to{" "}
                                    {item.endDate ?? "No end date"}
                                  </span>
                                )}
                                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs md:hidden">
                                  <span className="font-mono">
                                    /{item.slug}
                                  </span>
                                  {isMinistry(item) && (
                                    <span>
                                      • {item.termCount}{" "}
                                      {item.termCount === 1 ? "term" : "terms"}
                                    </span>
                                  )}
                                  {isTerm(item) && (
                                    <span className="capitalize">
                                      • {item.lifecycle}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              {hasVisualIdentity(item) ? (
                                <IdentityTile
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
                                <span className="text-base font-semibold">
                                  {item.name}
                                </span>
                                {isTerm(item) && (
                                  <span className="text-muted-foreground mt-0.5 block text-xs">
                                    {item.startDate ?? "No start date"} to{" "}
                                    {item.endDate ?? "No end date"}
                                  </span>
                                )}
                                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs md:hidden">
                                  <span className="font-mono">
                                    /{item.slug}
                                  </span>
                                  {mode === "departments" && (
                                    <>
                                      <span>
                                        •{" "}
                                        {(item as StructureItem).memberCount ??
                                          0}{" "}
                                        {((item as StructureItem).memberCount ??
                                          0) === 1
                                          ? "member"
                                          : "members"}
                                      </span>
                                      <span>
                                        •{" "}
                                        {(item as StructureItem).roleCount ?? 0}{" "}
                                        {((item as StructureItem).roleCount ??
                                          0) === 1
                                          ? "role"
                                          : "roles"}
                                      </span>
                                    </>
                                  )}
                                  {mode === "groups" && (
                                    <span>
                                      •{" "}
                                      {(item as StructureItem).memberCount ?? 0}{" "}
                                      {((item as StructureItem).memberCount ??
                                        0) === 1
                                        ? "member"
                                        : "members"}
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
                                      • {item.lifecycle}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <ExpandableActionItem.Trigger className="md:hidden" />
                        </div>
                        <ExpandableActionItem.MobileActions />
                      </div>
                      <div
                        role="cell"
                        className="text-muted-foreground hidden font-mono text-xs md:block"
                      >
                        /{item.slug}
                      </div>
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
                          {item.lifecycle}
                        </div>
                      )}
                      {mode === "departments" && (
                        <div
                          role="cell"
                          className="text-muted-foreground hidden text-sm md:block"
                        >
                          {(item as StructureItem).memberCount ?? 0}{" "}
                          {((item as StructureItem).memberCount ?? 0) === 1
                            ? "member"
                            : "members"}{" "}
                          • {(item as StructureItem).roleCount ?? 0}{" "}
                          {((item as StructureItem).roleCount ?? 0) === 1
                            ? "role"
                            : "roles"}
                        </div>
                      )}
                      {mode === "groups" && (
                        <div
                          role="cell"
                          className="text-muted-foreground hidden text-sm md:block"
                        >
                          {(item as StructureItem).memberCount ?? 0}{" "}
                          {((item as StructureItem).memberCount ?? 0) === 1
                            ? "member"
                            : "members"}
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
        {mode !== "groups" && mode !== "departments" && (
          <PaginationCard
            page={result.page}
            pageSize={query.pageSize}
            count={result.count}
            itemLabel={title.toLowerCase()}
            onPageChange={(page) => void setQuery({ page } as never)}
          />
        )}
      </section>
      <FloatingCreateButton onClick={openCreate}>
        Manage {plural}
      </FloatingCreateButton>
      {editor && (
        <ResponsiveEditor
          open
          onOpenChange={(open) => !open && setEditor(null)}
          title={`Edit ${label}`}
          description={
            mode === "groups" || mode === "departments"
              ? "Names and slugs must be unique within this term."
              : "Names are displayed exactly as entered. Slugs change links."
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
          <form id="ministry-editor" action={submitEdit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                required
                value={identityNameDraft}
                onChange={(event) => setIdentityNameDraft(event.target.value)}
                className="h-12 text-base"
              />
            </div>
            {supportsVisualIdentity && (
              <IdentityPicker
                entityLabel={label}
                accentColor={accentColor}
                iconKey={iconKey}
                customColorOpen={customColorOpen}
                colorError={
                  /^#[0-9a-f]{6}$/.test(accentColor.trim().toLowerCase())
                    ? null
                    : "Use a six-digit hex color."
                }
                previewName={identityNameDraft || getInitialDraft(mode)}
                frequentIcons={frequentIcons}
                onAccentColorChange={setAccentColor}
                onIconKeyChange={setIconKey}
                onCustomColorOpenChange={setCustomColorOpen}
              />
            )}
            {(mode === "groups" || mode === "departments") && (
              <details className="admin-surface p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Advanced link settings
                </summary>
                <p className="text-muted-foreground mt-2 text-xs">
                  Leave the slug blank when creating a record to generate one
                  from the name.
                </p>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="edit-slug">Slug</Label>
                  <Input
                    id="edit-slug"
                    name="slug"
                    defaultValue={editor.slug}
                    className="h-12 font-mono text-base"
                  />
                </div>
              </details>
            )}
            {mode === "terms" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="lifecycle">Lifecycle</Label>
                  <input type="hidden" name="lifecycle" value={termLifecycle} />
                  <LifecycleDropdown
                    id="lifecycle"
                    value={termLifecycle}
                    onChange={setTermLifecycle}
                    disabled={pending}
                  />
                  <p className="text-muted-foreground text-xs">
                    Only one term in a ministry can be active at a time.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <DatePicker
                    id="startDate"
                    name="startDate"
                    value={termStartDate}
                    onChange={setTermStartDate}
                    placeholder="Select start date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <DatePicker
                    id="endDate"
                    name="endDate"
                    value={termEndDate}
                    onChange={setTermEndDate}
                    min={termStartDate || undefined}
                    placeholder="Select end date"
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
      <ManageCollectionDrawer
        open={manageOpen}
        onOpenChange={(open) => {
          setManageOpen(open);
          if (!open) resetImport();
        }}
        title={`Manage ${plural}`}
        mobileMinHeightClass="min-h-[85dvh]"
        maxWidthClass="sm:max-w-2xl"
        tabs={[
          { key: "add", label: "Add", icon: Plus },
          { key: "import", label: "Import", icon: Upload },
          { key: "export", label: "Export", icon: Download },
        ]}
        activeTab={manageTab}
        onTabChange={setManageTab}
        footer={
          manageTab === "add" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 font-semibold"
                onClick={() => setManageOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="ministry-create"
                disabled={pending}
                className="min-h-11 font-semibold"
              >
                {pending ? "Saving..." : `Save ${label}`}
              </Button>
            </>
          ) : manageTab === "import" && importParsed.valid.length > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 font-semibold"
                onClick={() => setManageOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={submitImport}
                className="min-h-11 font-semibold"
              >
                {pending
                  ? "Importing..."
                  : `Import ${importParsed.valid.length} Rows`}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="col-span-2 min-h-11 w-full font-semibold"
              onClick={() => setManageOpen(false)}
            >
              Cancel
            </Button>
          )
        }
      >
        {manageTab === "add" && (
          <form
            id="ministry-create"
            action={submitCreate}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                name="name"
                required
                value={identityNameDraft}
                onChange={(event) => setIdentityNameDraft(event.target.value)}
                className="h-12 text-base"
              />
            </div>
            {supportsVisualIdentity && (
              <IdentityPicker
                entityLabel={label}
                accentColor={accentColor}
                iconKey={iconKey}
                customColorOpen={customColorOpen}
                colorError={
                  /^#[0-9a-f]{6}$/.test(accentColor.trim().toLowerCase())
                    ? null
                    : "Use a six-digit hex color."
                }
                previewName={identityNameDraft || getInitialDraft(mode)}
                frequentIcons={frequentIcons}
                onAccentColorChange={setAccentColor}
                onIconKeyChange={setIconKey}
                onCustomColorOpenChange={setCustomColorOpen}
              />
            )}
            {(mode === "groups" || mode === "departments") && (
              <details className="admin-surface p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Advanced link settings
                </summary>
                <p className="text-muted-foreground mt-2 text-xs">
                  Leave the slug blank when creating a record to generate one
                  from the name.
                </p>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="create-slug">Slug</Label>
                  <Input
                    id="create-slug"
                    name="slug"
                    defaultValue=""
                    className="h-12 font-mono text-base"
                  />
                </div>
              </details>
            )}
            {mode === "terms" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="create-lifecycle">Lifecycle</Label>
                  <input type="hidden" name="lifecycle" value="draft" />
                  <div
                    id="create-lifecycle"
                    className="bg-muted/40 border-border/70 text-muted-foreground flex h-12 items-center justify-between rounded-xl border px-3.5 text-sm"
                  >
                    <span className="text-foreground font-medium">Draft</span>
                    <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                      Initial status
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    New terms start as Draft. You can activate this term after
                    creation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-start-date">Start date</Label>
                  <DatePicker
                    id="create-start-date"
                    name="startDate"
                    value={termStartDate}
                    onChange={setTermStartDate}
                    placeholder="Select start date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-end-date">End date</Label>
                  <DatePicker
                    id="create-end-date"
                    name="endDate"
                    value={termEndDate}
                    onChange={setTermEndDate}
                    min={termStartDate || undefined}
                    placeholder="Select end date"
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
        )}
        {manageTab === "import" && (
          <ImportPanel
            entityLabel={plural.toLowerCase()}
            chipField="name"
            fileInputId={`import-${mode}-file-input`}
            importMode={importMode}
            onImportModeChange={setImportMode}
            fileName={importFileName}
            parsed={importParsed}
            onFileSelect={handleFileSelect}
          />
        )}
        {manageTab === "export" && (
          <ExportPanel
            formats={[
              {
                title: "JSON Format",
                description: `Structured backup with metadata for all ${plural.toLowerCase()}.`,
                buttonLabel: "Export JSON",
                icon: <Download className="size-4" aria-hidden="true" />,
                onClick: () => submitExport("json"),
              },
              {
                title: "CSV Format (Excel)",
                description: `Spreadsheet-ready list of every ${label.toLowerCase()} in this scope.`,
                buttonLabel: "Export CSV",
                icon: <Download className="size-4" aria-hidden="true" />,
                onClick: () => submitExport("csv"),
              },
            ]}
          />
        )}
      </ManageCollectionDrawer>
      {mode === "ministries" && (
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            onCloseAutoFocus={(event) => {
              if (filterButtonRef.current) {
                event.preventDefault();
                filterButtonRef.current.focus();
              }
            }}
            className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-hidden"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />

            <div className="border-border/70 flex shrink-0 items-center justify-between border-b px-5 py-3">
              <SheetHeader className="p-0 text-left">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-foreground text-lg font-bold">
                    Sort options
                  </SheetTitle>
                  {hasDraftFilterChanges && (
                    <button
                      type="button"
                      onClick={resetDraftFilters}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                  Adjust ministry sort order.
                </SheetDescription>
              </SheetHeader>

              <SheetClose asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:ring-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                  aria-label="Close"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </SheetClose>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
                  Sort by
                </span>
                <RadixRadioGroup.Root
                  className="divide-border/60 border-border/60 bg-muted/20 divide-y overflow-hidden rounded-xl border"
                  aria-label="Sort order"
                  value={draftSort}
                  onValueChange={setDraftSort}
                >
                  {MINISTRY_SORT_CHOICES.map((choice) => {
                    const selected = draftSort === choice.value;
                    return (
                      <RadixRadioGroup.Item
                        key={choice.value}
                        value={choice.value}
                        className={cn(
                          "focus-visible:ring-ring flex min-h-[44px] w-full items-center justify-between px-3.5 py-2.5 text-sm transition-colors first:rounded-t-[11px] last:rounded-b-[11px] focus-visible:ring-2 focus-visible:outline-hidden",
                          selected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50 text-foreground",
                        )}
                      >
                        <span>{choice.label}</span>
                        {selected && (
                          <Check
                            className="text-primary size-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </RadixRadioGroup.Item>
                    );
                  })}
                </RadixRadioGroup.Root>
              </div>
            </div>

            <div className="border-border/70 bg-muted/30 grid shrink-0 grid-cols-2 gap-3 border-t px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setFilterSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" className="min-h-11" onClick={applyFilters}>
                Apply
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
      <ConfirmationSheet
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${label}?`}
        description="This permanently deletes the record only when no protected dependent history exists. This cannot be undone."
        confirmLabel={`Delete ${label}`}
        pending={pending}
        pendingLabel="Deleting..."
        onConfirm={remove}
      >
        {formError && (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        )}
      </ConfirmationSheet>
      {contextualSession && (
        <SessionEditorDrawer
          open
          onOpenChange={(open) => !open && setContextualSession(null)}
          scope={contextualSession}
        />
      )}
    </ExpandableCoordinatorProvider>
  );
}
