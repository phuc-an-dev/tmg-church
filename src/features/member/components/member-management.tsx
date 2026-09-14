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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Rows3,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { debounce, useQueryStates } from "nuqs";
import { RadioGroup as RadixRadioGroup } from "radix-ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  archiveMemberAction,
  createMemberAction,
  restoreMemberAction,
  updateMemberAction,
} from "../actions";

import { MEMBER_PAGE_SIZES, memberSearchParams } from "../search-params";
import type { MemberItem, MemberPageResult } from "../types";

interface MemberManagementProps {
  result: MemberPageResult;
  editedMember: MemberItem | null;
  requestedEditId: string;
  invalidEdit: boolean;
}

type SortColumn = "full_name" | "birth_year";

const MEMBER_STATUS_CHOICES = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All members" },
];

const MEMBER_SORT_CHOICES = [
  { value: "full_name-asc", label: "Name: A to Z" },
  { value: "full_name-desc", label: "Name: Z to A" },
  { value: "birth_year-asc", label: "Birth year: oldest" },
  { value: "birth_year-desc", label: "Birth year: youngest" },
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

function MemberCreator({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]>
  >({});
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [birthYear, setBirthYear] = React.useState("");

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setBirthYear("");
    setErrorMessage(null);
    setFieldErrors({});
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const normalizedBirthYear = birthYear.trim()
      ? Number(birthYear.trim())
      : null;
    const result = await createMemberAction({
      fullName,
      phone,
      birthYear: normalizedBirthYear,
    });

    if (!result.success) {
      setErrorMessage(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    resetForm();
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
        form="create-member-form"
        disabled={isSaving || !fullName.trim()}
        className="min-h-[44px] gap-2"
      >
        {isSaving ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        <span>{isSaving ? "Adding member..." : "Add member"}</span>
      </Button>
    </>
  );

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) {
          resetForm();
          onClose();
        }
      }}
      title="Add Member"
      description="Create a new member profile for TMG Church."
      footer={footer}
    >
      <form
        id="create-member-form"
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
            className="h-11"
            required
            autoFocus
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
              fieldErrors.phone?.[0] ? "create-member-phone-error" : undefined
            }
            className="h-11"
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
          <Label htmlFor="create-member-birth-year">Birth year</Label>
          <Input
            id="create-member-birth-year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            placeholder="e.g. 1995"
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
            disabled={isSaving}
            aria-invalid={Boolean(fieldErrors.birthYear?.[0])}
            aria-describedby={
              fieldErrors.birthYear?.[0]
                ? "create-member-birth-year-error"
                : undefined
            }
            className="h-11"
          />
          {fieldErrors.birthYear?.[0] && (
            <p
              id="create-member-birth-year-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {fieldErrors.birthYear[0]}
            </p>
          )}
        </div>
      </form>
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
  const [birthYear, setBirthYear] = React.useState(
    member.birthYear === null ? "" : String(member.birthYear),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const normalizedBirthYear = birthYear.trim()
      ? Number(birthYear.trim())
      : null;
    const result = await updateMemberAction({
      id: member.id,
      fullName,
      phone,
      birthYear: normalizedBirthYear,
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
          <Label htmlFor="member-birth-year">Birth year</Label>
          <Input
            id="member-birth-year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
            disabled={isSaving}
            aria-invalid={Boolean(fieldErrors.birthYear?.[0])}
            aria-describedby={
              fieldErrors.birthYear?.[0] ? "member-birth-year-error" : undefined
            }
            className="h-11"
          />
          {fieldErrors.birthYear?.[0] && (
            <p
              id="member-birth-year-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {fieldErrors.birthYear[0]}
            </p>
          )}
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
    <AlertDialog
      open={open}
      onOpenChange={(next) => !next && !isPending && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive <strong>{member.fullName}</strong>?
            Archived members are hidden from active ministry rosters, but can be
            restored at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div
            role="alert"
            className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
          >
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleArchive}
            className="gap-2"
          >
            {isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Archive className="size-4" aria-hidden="true" />
            )}
            <span>{isPending ? "Archiving..." : "Archive member"}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    <AlertDialog
      open={open}
      onOpenChange={(next) => !next && !isPending && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore member</AlertDialogTitle>
          <AlertDialogDescription>
            Restore <strong>{member.fullName}</strong> back to active status?
            They will reappear in the active directory and can be assigned to
            ministry terms.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div
            role="alert"
            className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
          >
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <Button
            disabled={isPending}
            onClick={handleRestore}
            className="gap-2"
          >
            {isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <RotateCcw className="size-4" aria-hidden="true" />
            )}
            <span>{isPending ? "Restoring..." : "Restore member"}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MemberManagement({
  result,
  editedMember,
  requestedEditId,
  invalidEdit,
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

  const filterButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const [draftStatus, setDraftStatus] = React.useState(query.status);
  const [draftSort, setDraftSort] = React.useState(
    `${query.sort}-${query.order}`,
  );

  const [memberToArchive, setMemberToArchive] =
    React.useState<MemberItem | null>(null);
  const [memberToRestore, setMemberToRestore] =
    React.useState<MemberItem | null>(null);
  const canonicalizedUrlRef = React.useRef<string | null>(null);

  const selectedMember = query.edit
    ? editedMember?.id === query.edit
      ? editedMember
      : (result.items.find((member) => member.id === query.edit) ?? null)
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
      !(["full_name", "birth_year"] as const).includes(rawSort as SortColumn)
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

  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const rangeStart =
    result.count === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.count);

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

  function openEditor(memberId: string) {
    void setQuery({ edit: memberId }, { history: "push", shallow: false });
  }

  function closeEditor() {
    void setQuery({ edit: null }, { history: "push", shallow: false });
  }

  function openFilterSheet() {
    setDraftStatus(query.status);
    setDraftSort(`${query.sort}-${query.order}`);
    setFilterSheetOpen(true);
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
        page: 1,
      },
      { history: "replace", shallow: false },
    );
    setFilterSheetOpen(false);
  }

  function resetDraftFilters() {
    setDraftStatus("active");
    setDraftSort("full_name-asc");
  }

  const activeFilterCount =
    (query.status !== "active" ? 1 : 0) +
    (query.sort !== "full_name" || query.order !== "asc" ? 1 : 0);

  const hasDraftFilterChanges =
    draftStatus !== query.status ||
    draftSort !== `${query.sort}-${query.order}`;

  const resetKey = `${query.q}-${query.page}-${query.pageSize}-${query.sort}-${query.order}-${query.status}-${Boolean(query.edit)}-${Boolean(isCreating)}`;

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
                        onClick={() => updateSort("birth_year")}
                        className="hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Birth year
                        <SortIcon
                          active={query.sort === "birth_year"}
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
                      onEdit={() => openEditor(member.id)}
                      onDelete={() => {
                        if (member.archivedAt) {
                          setMemberToRestore(member);
                        } else {
                          setMemberToArchive(member);
                        }
                      }}
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
                            href={`/admin/members/${member.id}`}
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
                                {member.birthYear && (
                                  <span>• Born {member.birthYear}</span>
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

                      {/* Desktop Birth Year */}
                      <div
                        role="cell"
                        className="text-muted-foreground hidden text-sm tabular-nums md:block"
                      >
                        {member.birthYear ?? "Not provided"}
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
              members
            </span>
            <div
              className="border-input bg-muted/35 flex shrink-0 items-center rounded-xl border p-1"
              aria-label="Results per page"
            >
              {MEMBER_PAGE_SIZES.map((pageSize) => {
                const active = query.pageSize === pageSize;
                return (
                  <button
                    key={pageSize}
                    type="button"
                    aria-pressed={active}
                    aria-label={`Show ${pageSize} results per page`}
                    onClick={() => void setQuery({ pageSize, page: 1 })}
                    className={
                      active
                        ? "bg-primary text-primary-foreground min-h-9 min-w-10 rounded-lg px-2 text-sm font-semibold shadow-xs"
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
              onClick={() => void setQuery({ page: result.page - 1 })}
            >
              <ChevronLeft aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <span
              className="border-input bg-card flex min-h-12 min-w-20 items-center justify-center rounded-xl border px-3 text-base font-semibold"
              aria-live="polite"
            >
              {result.count === 0 ? 0 : Math.min(result.page, totalPages)}
              <span className="text-muted-foreground px-1">/</span>
              {totalPages}
            </span>
            <Button
              variant="outline"
              className="bg-secondary hover:bg-secondary/80 disabled:bg-muted/40 min-h-12 w-full rounded-xl border-0"
              disabled={result.page >= totalPages || result.count === 0}
              onClick={() => void setQuery({ page: result.page + 1 })}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Add Member Button */}
      <Button
        className="fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 min-h-12 rounded-full px-5 shadow-[0_18px_36px_-14px_color-mix(in_oklch,var(--primary)_70%,transparent)] md:right-8 md:bottom-8"
        onClick={() => setIsCreating(true)}
      >
        <Plus aria-hidden="true" className="size-5" />
        Add Member
      </Button>

      {/* Mobile Filter & Sort Sheet */}
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

      {/* Create Member Dialog */}
      <MemberCreator
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
