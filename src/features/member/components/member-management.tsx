"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "cn";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  FolderCog,
  Loader2,
  Pencil,
  RotateCcw,
  Rows3,
  Search,
  SlidersHorizontal,
  Tags,
  Upload,
  Users,
  X,
} from "lucide-react";
import { debounce, useQueryStates } from "nuqs";
import { RadioGroup as RadixRadioGroup } from "radix-ui";
import { Button } from "@/components/ui/button";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GenderDropdown } from "./gender-dropdown";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusToast } from "@/components/ui/status-toast";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { PaginationCard } from "@/components/shared/pagination-card";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { IdentityTile } from "@/components/shared/identity-picker";
import {
  NavigationTabs,
  NavigationTabButton,
} from "@/components/shared/navigation-tabs";
import {
  archiveMemberAction,
  createMemberAction,
  exportAllMembersAction,
  importMembersAction,
  restoreMemberAction,
  setMemberSegmentsAction,
  updateMemberAction,
} from "../actions";

import { MEMBER_PAGE_SIZES, memberSearchParams } from "../search-params";
import { parseMemberImport } from "../member-import";
import type { MemberItem, MemberPageResult } from "../types";
import type { SegmentItem } from "@/features/segment/types";

interface MemberManagementProps {
  result: MemberPageResult;
  editedMember: MemberItem | null;
  requestedEditId: string;
  invalidEdit: boolean;
  segments: SegmentItem[];
}

type SortColumn = "full_name" | "date_of_birth";

const MEMBER_STATUS_CHOICES = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All members" },
];

const MEMBER_SORT_CHOICES = [
  { value: "full_name-asc", label: "Name: A to Z" },
  { value: "full_name-desc", label: "Name: Z to A" },
  { value: "date_of_birth-asc", label: "Date of birth: oldest" },
  { value: "date_of_birth-desc", label: "Date of birth: youngest" },
];

const ALL_SEGMENTS_VALUE = "all-segments";

interface ChoiceMenuProps {
  id?: string;
  label: string;
  value: string;
  choices: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  compact?: boolean;
  icon?: "filter" | "rows";
  fullWidth?: boolean;
}

function ChoiceMenu({
  id,
  label,
  value,
  choices,
  onChange,
  compact = false,
  icon,
  fullWidth = false,
}: ChoiceMenuProps) {
  const activeLabel = choices.find((choice) => choice.value === value)?.label;
  const Icon = icon === "filter" ? SlidersHorizontal : Rows3;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={
            compact
              ? `bg-card hover:bg-card h-12 gap-2 px-3 ${fullWidth ? "w-full" : ""}`
              : `bg-card hover:bg-card h-12 gap-2 px-4 ${fullWidth ? "w-full" : ""}`
          }
          aria-label={`${label}: ${activeLabel}`}
        >
          {icon && <Icon className="size-4" aria-hidden="true" />}
          <span>{activeLabel}</span>
          <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={fullWidth ? "start" : "end"}
        className={
          fullWidth
            ? "z-[70] min-w-[var(--radix-dropdown-menu-trigger-width)] p-1.5"
            : "z-[70] min-w-48 p-1.5"
        }
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {choices.map((choice) => (
            <DropdownMenuRadioItem
              key={choice.value}
              value={choice.value}
              className="min-h-11 px-3 pr-8 text-base"
            >
              {choice.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SegmentFilterMenu({
  id,
  value,
  segments,
  onChange,
  fullWidth = false,
}: {
  id?: string;
  value: string;
  segments: SegmentItem[];
  onChange: (value: string) => void;
  fullWidth?: boolean;
}) {
  const selectedSegment = segments.find((segment) => segment.slug === value);
  const activeLabel = selectedSegment?.name ?? "All segments";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={`Filter by segment: ${activeLabel}`}
          className={`bg-card hover:bg-card h-12 justify-between px-3 text-left text-base font-normal ${fullWidth ? "w-full" : ""}`}
        >
          <SegmentFilterLabel
            selectedSegment={selectedSegment}
            label={activeLabel}
          />
          <ChevronDown
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={fullWidth ? "start" : "end"}
        className={
          fullWidth
            ? "z-[70] min-w-[var(--radix-dropdown-menu-trigger-width)] p-1.5"
            : "z-[70] min-w-60 p-1.5"
        }
      >
        <DropdownMenuRadioGroup
          value={value || ALL_SEGMENTS_VALUE}
          onValueChange={(nextValue) =>
            onChange(nextValue === ALL_SEGMENTS_VALUE ? "" : nextValue)
          }
        >
          <DropdownMenuRadioItem
            value={ALL_SEGMENTS_VALUE}
            className="min-h-12 gap-3 px-3 pr-8 text-left text-base"
          >
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Tags className="size-4" aria-hidden="true" />
            </span>
            <span>All segments</span>
          </DropdownMenuRadioItem>
          {segments.map((segment) => (
            <DropdownMenuRadioItem
              key={segment.id}
              value={segment.slug}
              className="min-h-12 gap-3 px-3 pr-8 text-left text-base"
            >
              <IdentityTile
                accentColor={segment.accentColor}
                iconKey={segment.iconKey}
              />
              <span className="truncate">{segment.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SegmentFilterLabel({
  selectedSegment,
  label,
  compact = false,
  labelClassName,
}: {
  selectedSegment?: SegmentItem;
  label: string;
  compact?: boolean;
  labelClassName?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {selectedSegment ? (
        <IdentityTile
          accentColor={selectedSegment.accentColor}
          iconKey={selectedSegment.iconKey}
          className={compact ? "size-8 rounded-lg" : undefined}
          iconClassName={compact ? "size-4" : undefined}
        />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Tags className="size-4" aria-hidden="true" />
        </span>
      )}
      <span className={cn("truncate", labelClassName)}>{label}</span>
    </span>
  );
}

function SegmentSelectionItem({
  segment,
  label,
  selected,
  disabled = false,
  onClick,
}: {
  segment?: SegmentItem;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-60",
        selected
          ? "border-primary bg-primary/5 font-semibold"
          : "border-border/70 bg-card",
      )}
    >
      <SegmentFilterLabel
        selectedSegment={segment}
        label={label}
        labelClassName="text-sm font-semibold sm:text-base"
      />
      <div
        className={cn(
          "ml-2 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 bg-transparent",
        )}
      >
        {selected && <Check className="size-3.5" aria-hidden="true" />}
      </div>
    </button>
  );
}

function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) {
  if (!active) return null;
  const Icon = order === "asc" ? ArrowUp : ArrowDown;
  return <Icon className="size-3.5" aria-hidden="true" />;
}

function MemberManagerDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [tab, setTab] = React.useState<"add" | "import" | "export">("add");

  // Tab 1: Add Member Form state
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]>
  >({});
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [gender, setGender] = React.useState("");

  const resetAddForm = () => {
    setFullName("");
    setPhone("");
    setDateOfBirth("");
    setGender("");
    setErrorMessage(null);
    setFieldErrors({});
  };

  async function handleAddSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await createMemberAction({
      fullName,
      phone,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
    });

    if (!result.success) {
      setErrorMessage(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    resetAddForm();
    onSuccess(result.message);
  }

  // Tab 2: Import state
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importFileName, setImportFileName] = React.useState<string | null>(
    null,
  );
  const [importParsed, setImportParsed] = React.useState<{
    valid: Array<{
      fullName: string;
      phone: string | null;
      dateOfBirth: string | null;
      gender: "female" | "male" | null;
    }>;
    skipped: number;
  }>({ valid: [], skipped: 0 });
  const [isImporting, setIsImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);

  const resetImportState = () => {
    setImportFileName(null);
    setImportParsed({ valid: [], skipped: 0 });
    setImportError(null);
  };

  const processImportRaw = (text: string) => {
    setImportParsed(parseMemberImport(text));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      processImportRaw(text);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleImportSubmit = async () => {
    if (importParsed.valid.length === 0) return;
    setIsImporting(true);
    setImportError(null);

    const result = await importMembersAction({ members: importParsed.valid });
    if (!result.success) {
      setImportError(result.error ?? "Failed to import members.");
      setIsImporting(false);
      return;
    }

    setIsImporting(false);
    resetImportState();
    onSuccess(result.message ?? "Members imported successfully.");
  };

  // Tab 3: Export state
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportJson = async () => {
    setIsExporting(true);
    const result = await exportAllMembersAction();
    setIsExporting(false);
    if (!result.success || !result.data) {
      setImportError(result.error ?? "Failed to export members.");
      return;
    }

    const jsonString = JSON.stringify(result.data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tmg-church-members-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    const result = await exportAllMembersAction();
    setIsExporting(false);
    if (!result.success || !result.data) {
      setImportError(result.error ?? "Failed to export members.");
      return;
    }

    const headers = "Full Name,Phone,Date of birth,Gender\n";
    const rows = result.data
      .map(
        (m) =>
          `"${m.fullName.replace(/"/g, '""')}","${m.phone ?? ""}","${m.dateOfBirth ?? ""}","${m.gender ?? ""}"`,
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tmg-church-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFooter = () => {
    if (tab === "add") {
      return (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-11 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-member-form"
            disabled={isSaving || !fullName.trim()}
            className="min-h-11 gap-2 font-semibold"
          >
            {isSaving && (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            <span>{isSaving ? "Adding member..." : "Add member"}</span>
          </Button>
        </>
      );
    }

    if (tab === "import") {
      if (importParsed.valid.length > 0) {
        return (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isImporting}
              className="min-h-11 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isImporting}
              onClick={handleImportSubmit}
              className="min-h-11 gap-2 font-semibold"
            >
              {isImporting ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              <span>
                {isImporting
                  ? "Importing..."
                  : `Import ${importParsed.valid.length} Members`}
              </span>
            </Button>
          </>
        );
      }

      return (
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="col-span-2 min-h-11 w-full font-semibold"
        >
          Cancel
        </Button>
      );
    }

    // tab === "export"
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        className="col-span-2 min-h-11 w-full font-semibold"
      >
        Cancel
      </Button>
    );
  };

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving && !isImporting) {
          resetAddForm();
          resetImportState();
          onClose();
        }
      }}
      title="Manage Members"
      description="Add members manually, or import and export member profiles."
      mobileMinHeightClass="min-h-[85dvh]"
      maxWidthClass="sm:max-w-2xl"
      footer={renderFooter()}
    >
      <div className="space-y-6 pt-1 pb-4">
        {/* Segmented Tab Navigation: 3 tabs */}
        <NavigationTabs aria-label="Manage members options" className="w-full">
          <NavigationTabButton
            active={tab === "add"}
            onClick={() => setTab("add")}
          >
            Add Member
          </NavigationTabButton>
          <NavigationTabButton
            active={tab === "import"}
            onClick={() => setTab("import")}
            icon={Upload}
          >
            Import
          </NavigationTabButton>
          <NavigationTabButton
            active={tab === "export"}
            onClick={() => setTab("export")}
            icon={Download}
          >
            Export
          </NavigationTabButton>
        </NavigationTabs>

        {/* TAB 1: ADD MEMBER */}
        {tab === "add" && (
          <form
            id="create-member-form"
            onSubmit={handleAddSubmit}
            noValidate
            className="space-y-4 py-1"
          >
            {errorMessage && (
              <div
                role="alert"
                className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              >
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="create-member-full-name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-member-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={isSaving}
                placeholder="e.g. John Doe"
                aria-invalid={Boolean(fieldErrors.fullName?.[0])}
                aria-describedby={
                  fieldErrors.fullName?.[0]
                    ? "create-member-full-name-error"
                    : undefined
                }
                className="h-11 text-base"
                required
              />
              {fieldErrors.fullName?.[0] && (
                <p
                  id="create-member-full-name-error"
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {fieldErrors.fullName[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-member-phone">Phone</Label>
              <Input
                id="create-member-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={isSaving}
                placeholder="e.g. +84 901 234 567"
                autoComplete="tel"
                aria-invalid={Boolean(fieldErrors.phone?.[0])}
                aria-describedby={
                  fieldErrors.phone?.[0]
                    ? "create-member-phone-error"
                    : undefined
                }
                className="h-11 text-base"
              />
              {fieldErrors.phone?.[0] && (
                <p
                  id="create-member-phone-error"
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {fieldErrors.phone[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-member-date-of-birth">Date of birth</Label>
              <Input
                id="create-member-date-of-birth"
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                disabled={isSaving}
                aria-invalid={Boolean(fieldErrors.dateOfBirth?.[0])}
                aria-describedby={
                  fieldErrors.dateOfBirth?.[0]
                    ? "create-member-date-of-birth-error"
                    : undefined
                }
                className="h-11 text-base"
              />
              {fieldErrors.dateOfBirth?.[0] && (
                <p
                  id="create-member-date-of-birth-error"
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {fieldErrors.dateOfBirth[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-member-gender">Gender</Label>
              <GenderDropdown
                id="create-member-gender"
                value={gender}
                onChange={setGender}
                disabled={isSaving}
              />
            </div>
          </form>
        )}

        {/* TAB 2: IMPORT */}
        {tab === "import" && (
          <div className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="import-member-file-input"
              aria-hidden="true"
              tabIndex={-1}
            />

            {/* Strategy Card */}
            <div className="space-y-2">
              <Label className="text-foreground text-sm font-medium">
                Import Strategy
              </Label>
              <div className="border-border/80 bg-card rounded-2xl border p-4">
                <p className="text-foreground text-sm font-semibold">
                  Merge and append
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-normal">
                  Adds new members to your church directory. Existing members
                  with matching phone numbers are automatically skipped to
                  prevent duplicates.
                </p>
              </div>
            </div>

            {/* File Upload Button */}
            <div className="space-y-2">
              <Label
                htmlFor="import-member-file-button"
                className="text-foreground text-sm font-medium"
              >
                Source Data
              </Label>
              <Button
                id="import-member-file-button"
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-border/80 bg-card hover:bg-muted/40 text-foreground min-h-12 w-full gap-2.5 rounded-2xl text-sm font-semibold shadow-xs"
              >
                <Upload className="size-4" aria-hidden="true" />
                <span>
                  {importFileName
                    ? `Change file (${importFileName})`
                    : "Choose File (.json, .csv)"}
                </span>
              </Button>
              {importFileName && (
                <p className="text-muted-foreground font-mono text-xs">
                  Loaded file: {importFileName}
                </p>
              )}
            </div>

            {/* Error banner */}
            {importError && (
              <div
                role="alert"
                className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              >
                {importError}
              </div>
            )}

            {/* Parsed Preview */}
            {importParsed.valid.length > 0 && (
              <div className="bg-muted/30 space-y-2.5 rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {importParsed.valid.length} valid members detected
                  </span>
                  {importParsed.skipped > 0 && (
                    <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {importParsed.skipped} invalid / empty rows skipped
                    </span>
                  )}
                </div>

                <div className="mt-2 flex max-h-44 flex-col gap-1.5 overflow-y-auto pt-1">
                  {importParsed.valid.slice(0, 50).map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-card text-foreground flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                    >
                      <span className="font-semibold">{m.fullName}</span>
                      <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px]">
                        {m.gender && (
                          <span className="capitalize">{m.gender}</span>
                        )}
                        {m.dateOfBirth && <span>{m.dateOfBirth}</span>}
                        {m.phone && <span>{m.phone}</span>}
                      </div>
                    </div>
                  ))}
                  {importParsed.valid.length > 50 && (
                    <p className="text-muted-foreground py-1 text-center text-xs">
                      + {importParsed.valid.length - 50} more members
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXPORT */}
        {tab === "export" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground text-sm font-medium">
                Export Format
              </Label>
              <div className="space-y-3">
                <div className="border-border/80 bg-card flex flex-col items-start justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-semibold">
                      JSON Format
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Structured backup with full member directory and profiles.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportJson}
                    disabled={isExporting}
                    className="min-h-11 w-full gap-2 rounded-xl text-sm font-semibold sm:w-auto"
                  >
                    {isExporting ? (
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <Download className="size-4" aria-hidden="true" />
                    )}
                    <span>Export JSON</span>
                  </Button>
                </div>

                <div className="border-border/80 bg-card flex flex-col items-start justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-semibold">
                      CSV Format (Excel)
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Spreadsheet-ready list (Name, Phone, Date of birth,
                      Gender) with UTF-8 BOM encoding.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className="min-h-11 w-full gap-2 rounded-xl text-sm font-semibold sm:w-auto"
                  >
                    {isExporting ? (
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <Download className="size-4" aria-hidden="true" />
                    )}
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveEditor>
  );
}

function MemberEditor({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: MemberItem;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]>
  >({});
  const [fullName, setFullName] = React.useState(member.fullName);
  const [phone, setPhone] = React.useState(member.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = React.useState(
    member.dateOfBirth ?? "",
  );
  const [gender, setGender] = React.useState(member.gender ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await updateMemberAction({
      id: member.id,
      fullName,
      phone,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
    });

    if (!result.success) {
      setErrorMessage(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSuccess(result.message);
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isSaving}
        className="min-h-[44px]"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="edit-member-form"
        disabled={isSaving || !fullName.trim()}
        className="min-h-[44px] gap-2"
      >
        {isSaving ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Pencil className="size-4" aria-hidden="true" />
        )}
        <span>{isSaving ? "Saving changes..." : "Save changes"}</span>
      </Button>
    </>
  );

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onClose();
      }}
      title="Edit Member"
      description="Update the member's profile details."
      footer={footer}
    >
      <form
        id="edit-member-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 py-2"
      >
        {errorMessage && (
          <div
            role="alert"
            className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="member-full-name">
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="member-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={isSaving}
            aria-invalid={Boolean(fieldErrors.fullName?.[0])}
            aria-describedby={
              fieldErrors.fullName?.[0] ? "member-full-name-error" : undefined
            }
            className="h-11"
            required
          />
          {fieldErrors.fullName?.[0] && (
            <p
              id="member-full-name-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {fieldErrors.fullName[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-phone">Phone</Label>
          <Input
            id="member-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isSaving}
            autoComplete="tel"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-date-of-birth">Date of birth</Label>
          <Input
            id="member-date-of-birth"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            disabled={isSaving}
            aria-invalid={Boolean(fieldErrors.dateOfBirth?.[0])}
            aria-describedby={
              fieldErrors.dateOfBirth?.[0]
                ? "member-date-of-birth-error"
                : undefined
            }
            className="h-11"
          />
          {fieldErrors.dateOfBirth?.[0] && (
            <p
              id="member-date-of-birth-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {fieldErrors.dateOfBirth[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-gender">Gender</Label>
          <GenderDropdown
            id="member-gender"
            value={gender}
            onChange={setGender}
            disabled={isSaving}
          />
        </div>
      </form>
    </ResponsiveEditor>
  );
}

function ArchiveConfirmDialog({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: MemberItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!member) return null;

  async function handleArchive() {
    if (!member) return;
    setIsPending(true);
    setError(null);
    const res = await archiveMemberAction({ id: member.id });
    setIsPending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onSuccess(res.message);
  }

  return (
    <ConfirmationSheet
      open={open}
      onOpenChange={(next) => !next && !isPending && onClose()}
      title="Archive member"
      description={
        <>
          Are you sure you want to archive <strong>{member.fullName}</strong>?
          Archived members are hidden from active ministry assignments, but can
          be restored at any time.
        </>
      }
      confirmLabel="Archive member"
      pending={isPending}
      pendingLabel="Archiving..."
      confirmIcon={<Archive className="size-4" aria-hidden="true" />}
      onConfirm={handleArchive}
    >
      {error && (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </div>
      )}
    </ConfirmationSheet>
  );
}

function RestoreConfirmDialog({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: MemberItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!member) return null;

  async function handleRestore() {
    if (!member) return;
    setIsPending(true);
    setError(null);
    const res = await restoreMemberAction({ id: member.id });
    setIsPending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onSuccess(res.message);
  }

  return (
    <ConfirmationSheet
      open={open}
      onOpenChange={(next) => !next && !isPending && onClose()}
      title="Restore member"
      description={
        <>
          Restore <strong>{member.fullName}</strong> back to active status? They
          will reappear in the active directory and can be assigned to ministry
          terms.
        </>
      }
      confirmLabel="Restore member"
      pending={isPending}
      pendingLabel="Restoring..."
      variant="default"
      confirmIcon={<RotateCcw className="size-4" aria-hidden="true" />}
      onConfirm={handleRestore}
    >
      {error && (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </div>
      )}
    </ConfirmationSheet>
  );
}

export function MemberManagement({
  result,
  editedMember,
  requestedEditId,
  invalidEdit,
  segments,
}: MemberManagementProps) {
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = useQueryStates(memberSearchParams, {
    history: "replace",
    shallow: false,
    clearOnDefault: true,
    startTransition,
  });
  const searchParams = useSearchParams();
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [segmentFilterSheetOpen, setSegmentFilterSheetOpen] =
    React.useState(false);

  const filterButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const [draftStatus, setDraftStatus] = React.useState(query.status);
  const [draftSort, setDraftSort] = React.useState(
    `${query.sort}-${query.order}`,
  );
  const [draftSegment, setDraftSegment] = React.useState(query.segment);
  const [segmentFilterDraft, setSegmentFilterDraft] = React.useState(
    query.segment,
  );

  const [memberToArchive, setMemberToArchive] =
    React.useState<MemberItem | null>(null);
  const [memberToRestore, setMemberToRestore] =
    React.useState<MemberItem | null>(null);
  const [segmentMember, setSegmentMember] = React.useState<MemberItem | null>(
    null,
  );
  const [selectedSegmentIds, setSelectedSegmentIds] = React.useState<string[]>(
    [],
  );
  const [segmentError, setSegmentError] = React.useState<string | null>(null);
  const [segmentPending, setSegmentPending] = React.useState(false);
  const canonicalizedUrlRef = React.useRef<string | null>(null);

  const selectedMember = query.edit
    ? editedMember?.slug === query.edit
      ? editedMember
      : (result.items.find((member) => member.slug === query.edit) ?? null)
    : null;

  React.useEffect(() => {
    const currentUrl = searchParams.toString();
    if (canonicalizedUrlRef.current === currentUrl) return;
    canonicalizedUrlRef.current = currentUrl;

    const patch: Record<string, string | number | null> = {};
    const rawQ = searchParams.get("q");
    const rawSort = searchParams.get("sort");
    const rawOrder = searchParams.get("order");
    const rawStatus = searchParams.get("status");
    const rawPage = searchParams.get("page");
    const rawPageSize = searchParams.get("pageSize");
    const rawEdit = searchParams.get("edit");

    if (rawQ === "") patch.q = "";
    if (
      rawSort !== null &&
      !(["full_name", "date_of_birth"] as const).includes(rawSort as SortColumn)
    ) {
      patch.sort = "full_name";
    }
    if (rawOrder !== null && rawOrder !== "asc" && rawOrder !== "desc") {
      patch.order = "asc";
    }
    if (
      rawStatus !== null &&
      !(["active", "archived", "all"] as const).includes(rawStatus as never)
    ) {
      patch.status = "active";
    }
    if (
      rawPage !== null &&
      (!/^[1-9]\d*$/.test(rawPage) || Number(rawPage) !== result.page)
    ) {
      patch.page = result.page;
    }
    if (
      rawPageSize !== null &&
      !MEMBER_PAGE_SIZES.includes(Number(rawPageSize) as never)
    ) {
      patch.pageSize = result.pageSize;
    }
    if (rawEdit === "") patch.edit = null;

    const shouldShowInvalidEdit = Boolean(
      invalidEdit && requestedEditId && query.edit === requestedEditId,
    );
    if (shouldShowInvalidEdit) {
      patch.edit = null;
    }

    if (Object.keys(patch).length > 0) {
      void setQuery(patch as never, {
        history: "replace",
        shallow: false,
      }).then(() => {
        if (shouldShowInvalidEdit) {
          setToastMessage(
            "The requested member was not found or is unavailable.",
          );
        }
      });
    }
  }, [
    invalidEdit,
    query.edit,
    requestedEditId,
    result.page,
    result.pageSize,
    searchParams,
    setQuery,
  ]);

  function updateSort(column: SortColumn) {
    const order =
      query.sort === column && query.order === "asc" ? "desc" : "asc";
    void setQuery(
      { sort: column, order, page: 1 },
      { history: "replace", shallow: false },
    );
  }

  function handleSortChange(value: string) {
    const [column, order] = value.split("-") as [SortColumn, "asc" | "desc"];
    void setQuery(
      { sort: column, order, page: 1 },
      { history: "replace", shallow: false },
    );
  }

  function openEditor(memberSlug: string) {
    void setQuery({ edit: memberSlug }, { history: "push", shallow: false });
  }

  function closeEditor() {
    void setQuery({ edit: null }, { history: "push", shallow: false });
  }

  function openFilterSheet() {
    setDraftStatus(query.status);
    setDraftSort(`${query.sort}-${query.order}`);
    setDraftSegment(query.segment);
    setFilterSheetOpen(true);
  }

  function openSegmentFilterSheet() {
    setSegmentFilterDraft(draftSegment);
    setSegmentFilterSheetOpen(true);
  }

  function applySegmentFilterDraft() {
    setDraftSegment(segmentFilterDraft);
    setSegmentFilterSheetOpen(false);
  }

  function applyFilters() {
    const [column, order] = draftSort.split("-") as [
      SortColumn,
      "asc" | "desc",
    ];
    void setQuery(
      {
        status: draftStatus as "active" | "archived" | "all",
        sort: column,
        order,
        segment: draftSegment || null,
        page: 1,
      },
      { history: "replace", shallow: false },
    );
    setSegmentFilterSheetOpen(false);
    setFilterSheetOpen(false);
  }

  function resetDraftFilters() {
    setDraftStatus("active");
    setDraftSort("full_name-asc");
    setDraftSegment("");
  }

  function openSegmentSheet(member: MemberItem) {
    setSelectedSegmentIds(member.segmentIds ?? []);
    setSegmentError(null);
    setSegmentMember(member);
  }

  function toggleSegment(segmentId: string) {
    setSelectedSegmentIds((previous) =>
      previous.includes(segmentId)
        ? previous.filter((id) => id !== segmentId)
        : [...previous, segmentId],
    );
  }

  async function saveMemberSegments() {
    if (!segmentMember) return;
    setSegmentPending(true);
    setSegmentError(null);
    const result = await setMemberSegmentsAction({
      memberId: segmentMember.id,
      segmentIds: selectedSegmentIds,
    });
    setSegmentPending(false);
    if (!result.success) {
      setSegmentError(result.error);
      return;
    }
    setSegmentMember(null);
    setToastMessage(result.message);
  }

  const activeFilterCount =
    (query.status !== "active" ? 1 : 0) +
    (query.segment ? 1 : 0) +
    (query.sort !== "full_name" || query.order !== "asc" ? 1 : 0);

  const hasDraftFilterChanges =
    draftStatus !== query.status ||
    draftSort !== `${query.sort}-${query.order}` ||
    draftSegment !== query.segment;

  const resetKey = `${query.q}-${query.page}-${query.pageSize}-${query.sort}-${query.order}-${query.status}-${Boolean(query.edit)}-${Boolean(isCreating)}`;
  const activeDraftSegment = segments.find(
    (segment) => segment.slug === draftSegment,
  );

  return (
    <ExpandableCoordinatorProvider resetKey={resetKey}>
      {toastMessage && (
        <StatusToast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      <section
        className="space-y-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
        aria-label="Members"
      >
        <p className="sr-only">Manage member profiles and directory.</p>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 border-b pb-5">
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query.q}
              onChange={(event) => {
                void setQuery(
                  { q: event.target.value, page: 1 },
                  {
                    history: "replace",
                    shallow: false,
                    limitUrlUpdates: debounce(300),
                  },
                );
              }}
              className="bg-card h-12 pl-9 text-base shadow-xs"
              aria-label="Search members"
              placeholder="Search members"
            />
          </div>

          {/* Mobile Filter Sheet Button */}
          <Button
            ref={filterButtonRef}
            type="button"
            variant="outline"
            onClick={openFilterSheet}
            className="bg-card hover:bg-card min-h-12 shrink-0 gap-2 px-3.5 md:hidden"
            aria-label={
              activeFilterCount > 0
                ? `Filter members (${activeFilterCount} active)`
                : "Filter members"
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

          {/* Desktop Filter & Sort Controls */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <SegmentFilterMenu
              value={query.segment ?? ""}
              onChange={(value) =>
                void setQuery({ segment: value || null, page: 1 })
              }
              segments={segments}
            />
            <ChoiceMenu
              label="Filter status"
              value={query.status}
              onChange={(value) =>
                void setQuery({ status: value as never, page: 1 })
              }
              icon="filter"
              choices={MEMBER_STATUS_CHOICES}
            />
            <ChoiceMenu
              label="Sort members"
              value={`${query.sort}-${query.order}`}
              onChange={handleSortChange}
              choices={MEMBER_SORT_CHOICES}
            />
          </div>
        </div>

        {/* Member Collection / Empty State */}
        <div
          className={pending ? "opacity-60 transition-opacity" : undefined}
          aria-busy={pending}
        >
          {result.items.length === 0 ? (
            <div className="admin-surface rounded-2xl py-12 text-center">
              <p className="font-medium">
                {query.q
                  ? "No members match this search."
                  : query.status === "archived"
                    ? "No archived members."
                    : "No members yet."}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {query.q
                  ? "Clear or change your search to see more records."
                  : query.status === "archived"
                    ? "Archived members will appear here."
                    : "Create the first member to get started."}
              </p>
            </div>
          ) : (
            <>
              <p className="sr-only">
                Use the Actions button on mobile to reveal actions for an item.
              </p>
              <div
                role="table"
                aria-label="Members"
                className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
              >
                {/* Desktop Table Header */}
                <div role="rowgroup">
                  <div
                    role="row"
                    className="bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:grid-cols-[1.5fr_1fr_120px_110px_80px] md:items-center md:border-b md:px-4 md:py-3"
                  >
                    <div role="columnheader">
                      <button
                        type="button"
                        onClick={() => updateSort("full_name")}
                        className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Name
                        <SortIcon
                          active={query.sort === "full_name"}
                          order={query.order}
                        />
                      </button>
                    </div>
                    <div role="columnheader">Phone</div>
                    <div role="columnheader">
                      <button
                        type="button"
                        onClick={() => updateSort("date_of_birth")}
                        className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Date of birth
                        <SortIcon
                          active={query.sort === "date_of_birth"}
                          order={query.order}
                        />
                      </button>
                    </div>
                    <div role="columnheader">Status</div>
                    <div role="columnheader" className="text-right">
                      Actions
                    </div>
                  </div>
                </div>

                {/* Member Items */}
                <div
                  role="rowgroup"
                  className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
                >
                  {result.items.map((member) => (
                    <ExpandableActionItem
                      key={member.id}
                      id={member.id}
                      name={member.fullName}
                      onEdit={() => openEditor(member.slug)}
                      onDelete={() => {
                        if (member.archivedAt) {
                          setMemberToRestore(member);
                        } else {
                          setMemberToArchive(member);
                        }
                      }}
                      onAdditionalAction={() => openSegmentSheet(member)}
                      additionalActionLabel="Add segments"
                      additionalActionSectionLabel="Segments"
                      primaryActionsSectionLabel="Member"
                      additionalActionIcon={Tags}
                      deleteLabel={member.archivedAt ? "Restore" : "Archive"}
                      deleteIcon={member.archivedAt ? RotateCcw : Archive}
                      deleteVariant={
                        member.archivedAt ? "outline" : "destructive"
                      }
                      className="bg-card rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] sm:p-5 md:grid md:grid-cols-[1.5fr_1fr_120px_110px_80px] md:items-center md:gap-4 md:rounded-none md:border-0 md:p-3 md:shadow-none"
                    >
                      {/* Identity & Mobile Trigger */}
                      <div role="cell" className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <Link
                            href={`/admin/members/${member.slug}`}
                            className="group/item flex min-w-0 flex-1 items-center gap-3 outline-hidden"
                          >
                            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl md:hidden">
                              <Users className="size-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="text-foreground text-base font-semibold group-hover/item:underline">
                                {member.fullName}
                              </span>
                              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs md:hidden">
                                {member.phone && <span>{member.phone}</span>}
                                {member.dateOfBirth && (
                                  <span>• Born {member.dateOfBirth}</span>
                                )}
                                {member.archivedAt && (
                                  <span className="font-medium text-amber-600 dark:text-amber-400">
                                    • Archived
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                          <ExpandableActionItem.Trigger className="md:hidden" />
                        </div>
                        <ExpandableActionItem.MobileActions />
                      </div>

                      {/* Desktop Phone */}
                      <div
                        role="cell"
                        className="text-muted-foreground hidden truncate text-sm md:block"
                      >
                        {member.phone ?? "Not provided"}
                      </div>

                      {/* Desktop Date of Birth */}
                      <div
                        role="cell"
                        className="text-muted-foreground hidden text-sm tabular-nums md:block"
                      >
                        {member.dateOfBirth ?? "Not provided"}
                      </div>

                      {/* Desktop Status */}
                      <div role="cell" className="hidden md:block">
                        {member.archivedAt ? (
                          <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Archived
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Desktop Action Menu */}
                      <div role="cell" className="hidden justify-end md:flex">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </ExpandableActionItem>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pagination Card */}
        <PaginationCard
          page={result.page}
          pageSize={query.pageSize}
          count={result.count}
          itemLabel="members"
          onPageChange={(page) => void setQuery({ page })}
        />
      </section>

      {/* Floating Manage Members Button */}
      <FloatingCreateButton
        onClick={() => setIsCreating(true)}
        icon={<FolderCog aria-hidden="true" className="size-5" />}
      >
        Manage Members
      </FloatingCreateButton>

      {/* Mobile Filter & Sort Sheet */}
      <Sheet
        open={Boolean(segmentMember)}
        onOpenChange={(open) => {
          if (!open && !segmentPending) setSegmentMember(null);
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-hidden"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="border-border/60 flex shrink-0 items-start justify-between border-b px-5 pt-3 pb-3">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Add segments
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                {segmentMember
                  ? `Select one or more segments for ${segmentMember.fullName}.`
                  : "Select one or more segments."}
              </SheetDescription>
            </SheetHeader>
            <button
              type="button"
              disabled={segmentPending}
              onClick={() => setSegmentMember(null)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {segmentError && (
            <div
              role="alert"
              className="border-destructive/20 bg-destructive/10 text-destructive mx-4 mt-4 rounded-lg border p-3 text-sm"
            >
              {segmentError}
            </div>
          )}
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {segments.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                Create a segment before assigning it to members.
              </div>
            ) : (
              segments.map((segment) => {
                const isSelected = selectedSegmentIds.includes(segment.id);
                return (
                  <SegmentSelectionItem
                    key={segment.id}
                    disabled={segmentPending}
                    segment={segment}
                    label={segment.name}
                    selected={isSelected}
                    onClick={() => toggleSegment(segment.id)}
                  />
                );
              })
            )}
          </div>
          <div className="border-border/70 bg-muted/30 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              disabled={segmentPending}
              onClick={() => void saveMemberSegments()}
              className="min-h-11 w-full font-semibold"
            >
              {segmentPending ? "Saving..." : "Done"}
              {selectedSegmentIds.length > 0
                ? ` (${selectedSegmentIds.length} selected)`
                : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={filterSheetOpen}
        onOpenChange={(open) => {
          setFilterSheetOpen(open);
          if (!open) setSegmentFilterSheetOpen(false);
        }}
      >
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
                  Filter & sort
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
                Filter by status and adjust sort order.
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
            {/* Status Filter Options */}
            <div className="space-y-2">
              <Label htmlFor="mobile-segment-filter">Segment</Label>
              <Button
                id="mobile-segment-filter"
                type="button"
                variant="outline"
                onClick={openSegmentFilterSheet}
                className="border-border bg-card hover:border-primary/35 hover:bg-primary/[0.03] text-foreground h-12 w-full justify-between px-3 text-left text-sm font-normal"
              >
                <SegmentFilterLabel
                  selectedSegment={activeDraftSegment}
                  label={activeDraftSegment?.name ?? "All segments"}
                  compact
                />
                <span className="border-border text-primary ml-2 shrink-0 border-l pl-3 text-sm font-semibold">
                  Change
                </span>
              </Button>
            </div>

            <div className="space-y-2">
              <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
                Status
              </span>
              <RadixRadioGroup.Root
                className="divide-border/60 border-border/60 bg-muted/20 divide-y overflow-hidden rounded-xl border"
                aria-label="Status filter"
                value={draftStatus}
                onValueChange={(val) =>
                  setDraftStatus(val as "active" | "archived" | "all")
                }
              >
                {MEMBER_STATUS_CHOICES.map((choice) => {
                  const selected = draftStatus === choice.value;
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

            {/* Sort Order Options */}
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
                {MEMBER_SORT_CHOICES.map((choice) => {
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

      <Sheet
        open={segmentFilterSheetOpen}
        onOpenChange={setSegmentFilterSheetOpen}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-hidden"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="border-border/60 flex shrink-0 items-start justify-between border-b px-5 pt-3 pb-3">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Select segment
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                Select a segment to filter the member list.
              </SheetDescription>
            </SheetHeader>
            <button
              type="button"
              onClick={() => setSegmentFilterSheetOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            <SegmentSelectionItem
              label="All segments"
              selected={!segmentFilterDraft}
              onClick={() => setSegmentFilterDraft("")}
            />
            {segments.map((segment) => {
              const isSelected = segmentFilterDraft === segment.slug;
              return (
                <SegmentSelectionItem
                  key={segment.id}
                  segment={segment}
                  label={segment.name}
                  selected={isSelected}
                  onClick={() => setSegmentFilterDraft(segment.slug)}
                />
              );
            })}
          </div>
          <div className="border-border/70 bg-muted/30 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="min-h-12 w-full font-semibold"
              onClick={applySegmentFilterDraft}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Members Drawer */}
      <MemberManagerDrawer
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onSuccess={(message) => {
          setIsCreating(false);
          setToastMessage(message);
        }}
      />

      {/* Edit Member Dialog */}
      {selectedMember && (
        <MemberEditor
          key={selectedMember.id}
          member={selectedMember}
          open={Boolean(query.edit)}
          onClose={closeEditor}
          onSuccess={(message) => {
            setToastMessage(message);
            void setQuery({ edit: null }, { history: "push", shallow: false });
          }}
        />
      )}

      {/* Archive Member Confirmation Dialog */}
      <ArchiveConfirmDialog
        member={memberToArchive}
        open={Boolean(memberToArchive)}
        onClose={() => setMemberToArchive(null)}
        onSuccess={(message) => {
          setMemberToArchive(null);
          setToastMessage(message);
        }}
      />

      {/* Restore Member Confirmation Dialog */}
      <RestoreConfirmDialog
        member={memberToRestore}
        open={Boolean(memberToRestore)}
        onClose={() => setMemberToRestore(null)}
        onSuccess={(message) => {
          setMemberToRestore(null);
          setToastMessage(message);
        }}
      />
    </ExpandableCoordinatorProvider>
  );
}
